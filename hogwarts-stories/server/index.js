import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeChapter, StoryError } from './story.js';
import { drawPanel, ImageError, PROVIDER } from './images.js';
import { buildImagePrompt } from './prompts.js';
import { mockChapter, mockPanelSvg } from './mock.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const IMAGES_DIR = path.join(ROOT, 'generated');
const PORT = Number(process.env.PORT) || 3000;
const DEMO = process.env.DEMO_MODE === '1';
const PLACEHOLDER_IMAGES = DEMO || PROVIDER === 'none';

const app = express();

// Optional password for a public deployment, so strangers can't spend the API credits.
// The browser shows its own login prompt; any user name works.
const APP_PASSWORD = process.env.APP_PASSWORD;
if (APP_PASSWORD) {
  app.use((req, res, next) => {
    const [scheme, encoded] = (req.headers.authorization || '').split(' ');
    const password = scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64').toString().split(':').slice(1).join(':') : '';
    if (password === APP_PASSWORD) return next();
    res.set('WWW-Authenticate', 'Basic realm="Hogwarts Stories", charset="UTF-8"').status(401).send('Потрібен пароль');
  });
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.use('/generated', express.static(IMAGES_DIR, { maxAge: '30d', immutable: true }));

app.get('/api/config', (_req, res) => {
  res.json({ demo: DEMO, placeholderImages: PLACEHOLDER_IMAGES });
});

const clean = (s, max) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

// Write the next 5 slides. Body: { story: {title, characters, chapters[]} | null, prompt }
app.post('/api/chapter', async (req, res) => {
  const prompt = clean(req.body?.prompt, 1000);
  if (!prompt) return res.status(400).json({ error: 'Напиши, що має статися далі.' });
  const story = req.body?.story ?? null;

  try {
    const chapter = DEMO
      ? await new Promise((r) => setTimeout(() => r(mockChapter(story, prompt)), 1200))
      : await writeChapter(story, prompt);
    res.json(chapter);
  } catch (err) {
    if (!(err instanceof StoryError)) console.error(err);
    res.status(err.status || 500).json({ error: err instanceof StoryError ? err.message : 'Щось пішло не так.' });
  }
});

// Draw one panel. Body: { slide: {image_prompt, characters_in_frame}, characters[] , seed }
app.post('/api/image', async (req, res) => {
  const slide = req.body?.slide;
  if (!slide || !clean(slide.image_prompt, 4000)) return res.status(400).json({ error: 'Немає опису кадру.' });

  if (PLACEHOLDER_IMAGES) {
    const svg = mockPanelSvg(Number(req.body?.seed) || 0);
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 1200));
    return res.json({ url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` });
  }

  try {
    const characters = Array.isArray(req.body?.characters) ? req.body.characters : [];
    const prompt = buildImagePrompt(
      { image_prompt: clean(slide.image_prompt, 4000), characters_in_frame: slide.characters_in_frame || [] },
      characters.filter((c) => c && typeof c.name === 'string' && typeof c.visual === 'string'),
    );
    const file = await drawPanel(prompt, IMAGES_DIR);
    res.json({ url: `/generated/${file}` });
  } catch (err) {
    if (!(err instanceof ImageError)) console.error(err);
    res.status(err.status || 500).json({ error: err instanceof ImageError ? err.message : 'Не вдалося намалювати кадр.' });
  }
});

app.listen(PORT, () => {
  console.log(`✨ Hogwarts Stories: http://localhost:${PORT}`);
  if (DEMO) console.log('   Демо-режим: сценарій і картинки — заглушки, ключі API не потрібні.');
  else if (PLACEHOLDER_IMAGES) console.log('   Немає ключа для картинок (OPENROUTER_API_KEY або OPENAI_API_KEY) — будуть заглушки.');
  else console.log(`   Картинки: ${PROVIDER}`);
});
