// Draws one comic panel per slide with the OpenAI Images API and stores it on disk.
import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium'; // low | medium | high
const CONCURRENCY = Math.max(1, Number(process.env.IMAGE_CONCURRENCY) || 3);

let client;
function getClient() {
  client ??= new OpenAI();
  return client;
}

// Small semaphore so 5 parallel slide requests don't trip the image rate limit.
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

export class ImageError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export async function drawPanel(prompt, outDir) {
  return withSlot(async () => {
    let result;
    for (let attempt = 1; ; attempt++) {
      try {
        result = await getClient().images.generate({
          model: MODEL,
          prompt,
          size: '1024x1536',
          quality: QUALITY,
          output_format: 'webp',
          output_compression: 85,
          n: 1,
        });
        break;
      } catch (err) {
        const status = err?.status;
        if (status === 429 && attempt < 4) {
          await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
          continue;
        }
        console.error('[openai] image error', status, err?.message);
        if (status === 401) throw new ImageError('Невірний OPENAI_API_KEY на сервері.', 500);
        if (status === 400) throw new ImageError('Модерація OpenAI не пропустила цей кадр.', 422);
        throw new ImageError('Не вдалося намалювати кадр.', 502);
      }
    }

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new ImageError('OpenAI не повернув зображення.', 502);
    await mkdir(outDir, { recursive: true });
    const file = `${randomUUID()}.webp`;
    await writeFile(path.join(outDir, file), Buffer.from(b64, 'base64'));
    return file;
  });
}
