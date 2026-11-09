// Browser-only backend for the GitHub Pages build: no server, the viewer's own API keys
// stay in this browser's localStorage. Bundled to docs/engine.js by scripts/build-pages.mjs.
import Anthropic from '@anthropic-ai/sdk';
import { writeChapterWith, DEFAULTS, apiErrorDetail } from '../server/story.js';
import { buildImagePrompt, buildPortraitPrompt } from '../server/prompts.js';

const KEYS = 'hogwarts-stories:keys';
const IMAGE_MODEL = 'google/gemini-2.5-flash-image';

function readKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEYS)) || {};
  } catch {
    return {};
  }
}

// ---------- Image storage ----------
// Photos are kept in memory for this visit and, best effort, in IndexedDB so they survive a reload.
// Storage must never decide whether a photo is shown: iOS Safari (private tabs especially) can
// refuse IndexedDB writes, sometimes with an error that has no message at all.
const memory = new Map(); // id -> data URL

let dbPromise;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('hogwarts-stories', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('images');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB недоступний'));
    req.onblocked = () => reject(new Error('IndexedDB заблокований'));
  }).catch((err) => {
    dbPromise = null; // allow a later retry
    throw err;
  });
  return dbPromise;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('images', mode);
    const req = fn(tx.objectStore('images'));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error || new Error('IndexedDB: помилка запису'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB: транзакцію перервано'));
  });
}

// Shrink the PNG the model returns to a JPEG data URL (~150-300 KB). Strings store reliably
// in Safari's IndexedDB, unlike Blobs. If shrinking fails, keep the original.
async function compress(dataUrl) {
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const scale = Math.min(1, 1080 / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL('image/jpeg', 0.85);
    return jpeg.startsWith('data:image/jpeg') ? jpeg : dataUrl;
  } catch {
    return dataUrl;
  }
}

async function storeImage(dataUrl) {
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  memory.set(id, dataUrl);
  idb('readwrite', (s) => s.put(dataUrl, id)).catch((err) => console.warn('[images] not saved:', err));
  return id;
}

async function resolveUrl(url) {
  if (!url?.startsWith('idb:')) return url;
  const id = url.slice(4);
  if (memory.has(id)) return memory.get(id);
  const stored = await idb('readonly', (s) => s.get(id)).catch(() => null);
  if (!stored) throw new Error('Фото не збереглося в браузері — намалюй ще раз.');
  // Older versions stored Blobs.
  const src = typeof stored === 'string' ? stored : URL.createObjectURL(stored);
  memory.set(id, src);
  return src;
}

// A readable reason for any thrown value, even a DOMException without a message or a bare null.
export function describe(err) {
  if (!err) return 'невідома помилка';
  return err.message || err.name || String(err);
}

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// ---------- API ----------
// On a phone, speed matters more than the last bit of plot depth: think less, give up after 3 min.
const BROWSER_OPTS = { ...DEFAULTS, effort: 'low' };
const CHAPTER_TIMEOUT_MS = 180_000;

async function chapter({ story, prompt }, { onProgress, signal } = {}) {
  const { anthropic } = readKeys();
  if (!anthropic) throw new HttpError('Спершу додай ключ Anthropic у налаштуваннях (🔑).', 400);
  const client = new Anthropic({ apiKey: anthropic, dangerouslyAllowBrowser: true, maxRetries: 1 });
  try {
    return await writeChapterWith(client, story, prompt, BROWSER_OPTS, { onProgress, signal, timeout: CHAPTER_TIMEOUT_MS });
  } catch (err) {
    throw new HttpError(err.message || 'Помилка Claude.', err.status);
  }
}

// Draws a slide, or (with `portrait`) the heroine's reference portrait. A `reference` portrait is
// sent along with every slide so the image model keeps her face the same across the story.
async function image({ slide, characters, heroine, reference, portrait }) {
  const keys = readKeys();
  const { openrouter } = keys;
  if (!openrouter) throw new HttpError('Спершу додай ключ OpenRouter у налаштуваннях (🔑).', 400);
  const refData = reference ? await resolveUrl(reference).catch(() => null) : null;
  const prompt = portrait
    ? buildPortraitPrompt(portrait)
    : buildImagePrompt(slide, Array.isArray(characters) ? characters : [], { heroine, hasReference: Boolean(refData) });
  const content = refData
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: refData } }]
    : prompt;

  let data;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openrouter}`, 'Content-Type': 'application/json', 'X-Title': 'Stories for Two' },
      body: JSON.stringify({
        model: keys.imageModel || IMAGE_MODEL,
        messages: [{ role: 'user', content }],
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
  const id = await storeImage(await compress(url));
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
  async call(path, body, options) {
    try {
      if (path === '/api/chapter') return await chapter(body, options);
      if (path === '/api/image') return await image(body);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(describe(err), 500);
    }
    throw new HttpError('Невідомий запит.', 404);
  },
};
