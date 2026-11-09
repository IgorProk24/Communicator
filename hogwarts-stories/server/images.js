// Draws one panel per slide and stores it on disk.
// Providers: OpenRouter (fast image models such as Gemini Flash Image) or the OpenAI Images API.
import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const PROVIDER =
  process.env.IMAGE_PROVIDER ||
  (process.env.OPENROUTER_API_KEY ? 'openrouter' : process.env.OPENAI_API_KEY ? 'openai' : 'none');

const OPENROUTER_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const OPENAI_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'low'; // low | medium | high
const CONCURRENCY = Math.max(1, Number(process.env.IMAGE_CONCURRENCY) || (PROVIDER === 'openrouter' ? 5 : 3));

export class ImageError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// Small semaphore so parallel slide requests don't trip the provider's rate limit.
let active = 0;
const queue = [];
async function withSlot(fn) {
  if (active >= CONCURRENCY) await new Promise((resolve) => queue.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

async function withRetry(fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err?.status === 429 || err?.status >= 500 || err?.status === undefined;
      if (!retryable || attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    }
  }
}

// ---------- OpenRouter ----------
async function openrouterImage(prompt) {
  const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Hogwarts Stories',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: '9:16' },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `OpenRouter HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const m = typeof url === 'string' && url.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!m) {
    const err = new Error('OpenRouter returned no image' + (data?.choices?.[0]?.message?.content ? `: ${String(data.choices[0].message.content).slice(0, 200)}` : ''));
    err.status = 422;
    throw err;
  }
  return { ext: m[1] === 'jpeg' ? 'jpg' : m[1], buffer: Buffer.from(m[2], 'base64') };
}

// ---------- OpenAI ----------
let openai;
async function openaiImage(prompt) {
  openai ??= new OpenAI();
  const result = await openai.images.generate({
    model: OPENAI_MODEL,
    prompt,
    size: '1024x1536',
    quality: OPENAI_QUALITY,
    output_format: 'webp',
    output_compression: 85,
    n: 1,
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw Object.assign(new Error('OpenAI returned no image'), { status: 502 });
  return { ext: 'webp', buffer: Buffer.from(b64, 'base64') };
}

export async function drawPanel(prompt, outDir) {
  return withSlot(async () => {
    let image;
    const started = Date.now();
    try {
      image = await withRetry(() => (PROVIDER === 'openrouter' ? openrouterImage(prompt) : openaiImage(prompt)));
    } catch (err) {
      console.error(`[${PROVIDER}] image error`, err?.status, err?.message);
      if (err?.status === 401 || err?.status === 403) throw new ImageError('Невірний ключ API для картинок на сервері.', 500);
      if (err?.status === 402) throw new ImageError('На рахунку OpenRouter закінчились кредити.', 402);
      if (err?.status === 400 || err?.status === 422) throw new ImageError('Модель не намалювала цей кадр (модерація або відмова).', 422);
      throw new ImageError('Не вдалося намалювати кадр.', 502);
    }
    console.log(`[${PROVIDER}] panel in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    await mkdir(outDir, { recursive: true });
    const file = `${randomUUID()}.${image.ext}`;
    await writeFile(path.join(outDir, file), image.buffer);
    return file;
  });
}
