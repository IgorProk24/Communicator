// Browser-only backend for the GitHub Pages build: no server, the viewer's own API keys
// stay in this browser's localStorage. Bundled to docs/engine.js by scripts/build-pages.mjs.
import Anthropic from '@anthropic-ai/sdk';
import { writeChapterWith, DEFAULTS, apiErrorDetail } from '../server/story.js';
import { buildImagePrompt } from '../server/prompts.js';

const KEYS = 'hogwarts-stories:keys';
const IMAGE_MODEL = 'google/gemini-2.5-flash-image';

function readKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEYS)) || {};
  } catch {
    return {};
  }
}

// ---------- Image storage (IndexedDB: photos are too big for localStorage) ----------
let dbPromise;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('hogwarts-stories', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('images', mode);
    const req = fn(tx.objectStore('images'));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

// Shrink the PNG the model returns to a ~150 KB JPEG before storing it.
async function compress(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, 1080 / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

const objectUrls = new Map();
async function resolveUrl(url) {
  if (!url?.startsWith('idb:')) return url;
  if (objectUrls.has(url)) return objectUrls.get(url);
  const blob = await idb('readonly', (s) => s.get(url.slice(4)));
  if (!blob) throw new Error('Фото не знайдено в пам’яті браузера.');
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.set(url, objectUrl);
  return objectUrl;
}

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// ---------- API ----------
async function chapter({ story, prompt }) {
  const { anthropic } = readKeys();
  if (!anthropic) throw new HttpError('Спершу додай ключ Anthropic у налаштуваннях (🔑).', 400);
  const client = new Anthropic({ apiKey: anthropic, dangerouslyAllowBrowser: true });
  try {
    return await writeChapterWith(client, story, prompt, DEFAULTS);
  } catch (err) {
    throw new HttpError(err.message || 'Помилка Claude.', err.status);
  }
}

async function image({ slide, characters }) {
  const { openrouter } = readKeys();
  if (!openrouter) throw new HttpError('Спершу додай ключ OpenRouter у налаштуваннях (🔑).', 400);
  const prompt = buildImagePrompt(slide, Array.isArray(characters) ? characters : []);

  let data;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openrouter}`, 'Content-Type': 'application/json', 'X-Title': 'Hogwarts Stories' },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
        image_config: { aspect_ratio: '9:16' },
      }),
    });
    data = await res.json().catch(() => ({}));
    if (res.ok) break;
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      continue;
    }
    if (res.status === 401) throw new HttpError(`OpenRouter не прийняв ключ (401${data?.error?.message ? ': ' + data.error.message : ''}).`, 401);
    if (res.status === 402) throw new HttpError('На рахунку OpenRouter закінчились кредити.', 402);
    throw new HttpError(data?.error?.message || `OpenRouter: помилка ${res.status}`, res.status);
  }

  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (typeof url !== 'string' || !url.startsWith('data:image/')) {
    throw new HttpError('Модель не намалювала цей кадр (модерація або відмова).', 422);
  }
  const blob = await compress(url);
  const id = crypto.randomUUID();
  await idb('readwrite', (s) => s.put(blob, id));
  return { url: `idb:${id}` };
}

// Checks both keys without generating anything: Anthropic lists models, OpenRouter reads key info.
async function checkKeys({ anthropic, openrouter }) {
  const result = {};
  try {
    const client = new Anthropic({ apiKey: anthropic, dangerouslyAllowBrowser: true, maxRetries: 0 });
    await client.models.list({ limit: 1 });
    result.anthropic = { ok: true, message: 'Ключ Anthropic працює.' };
  } catch (err) {
    result.anthropic = {
      ok: false,
      message: err?.status
        ? `Anthropic: помилка ${err.status}${apiErrorDetail(err)}`
        : `Anthropic: немає з'єднання (${err?.message || 'мережа'})`,
    };
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${openrouter}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      result.openrouter = { ok: false, message: `OpenRouter: помилка ${res.status}${data?.error?.message ? ': ' + data.error.message : ''}` };
    } else {
      const left = data?.data?.limit_remaining;
      result.openrouter = {
        ok: true,
        message: 'Ключ OpenRouter працює.' + (typeof left === 'number' ? ` Ліміт ключа: залишилось ${left.toFixed(2)} $.` : ' Переконайся, що на рахунку є кредити.'),
      };
    }
  } catch (err) {
    result.openrouter = { ok: false, message: `OpenRouter: немає з'єднання (${err?.message || 'мережа'})` };
  }
  return result;
}

window.__directBackend = {
  checkKeys,
  hasKeys() {
    const k = readKeys();
    return Boolean(k.anthropic && k.openrouter);
  },
  getKeys: readKeys,
  setKeys(keys) {
    localStorage.setItem(KEYS, JSON.stringify(keys));
  },
  resolveUrl,
  async call(path, body) {
    if (path === '/api/chapter') return chapter(body);
    if (path === '/api/image') return image(body);
    throw new HttpError('Невідомий запит.', 404);
  },
};
