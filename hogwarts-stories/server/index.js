import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeChapter, StoryError } from './story.js';
import { writeChapterGrokServer } from './grok.js';
import { drawPanel, ImageError, PROVIDER } from './images.js';
import { readFile } from 'node:fs/promises';
import { buildImagePrompt, buildPortraitPrompt, STORY_PROMPT, IMAGE_STYLE } from './prompts.js';
import { mockChapter, mockPanelSvg } from './mock.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const IMAGES_DIR = path.join(ROOT, 'generated');
const PORT = Number(process.env.PORT) || 3000;
const DEMO = process.env.DEMO_MODE === '1';
const PLACEHOLDER_IMAGES = DEMO || PROVIDER === 'none';
// Text model: Claude by default, Grok with TEXT_PROVIDER=grok (needs XAI_API_KEY).
const TEXT_PROVIDER = process.env.TEXT_PROVIDER === 'grok' ? 'grok' : 'claude';

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

app.use(express.json({ limit: '6mb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.use('/generated', express.static(IMAGES_DIR, { maxAge: '30d', immutable: true }));

app.get('/api/config', (_req, res) => {
  res.json({
    demo: DEMO,
    placeholderImages: PLACEHOLDER_IMAGES,
    textProvider: TEXT_PROVIDER,
    defaults: { story: STORY_PROMPT, imageStyle: IMAGE_STYLE },
  });
});

const clean = (s, max) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

// Write the next 5 slides. Body: { story: {title, setting, heroine, characters, chapters[]}, prompt }
app.post('/api/chapter', async (req, res) => {
  const prompt = clean(req.body?.prompt, 1000);
  if (!prompt) return res.status(400).json({ error: 'Напиши, що має статися далі.' });
  const story = req.body?.story;
  if (!story || !validPerson(story.heroine) || typeof story.setting !== 'string') {
    return res.status(400).json({ error: 'Немає картки історії.' });
  }

  try {
    const chapter = DEMO
      ? await new Promise((r) => setTimeout(() => r(mockChapter(story, prompt)), 1200))
      : TEXT_PROVIDER === 'grok'
        ? await writeChapterGrokServer(story, prompt, { storyPrompt: req.body?.prompts?.story })
        : await writeChapter(story, prompt, { storyPrompt: req.body?.prompts?.story });
    res.json(chapter);
  } catch (err) {
    if (!(err instanceof StoryError)) console.error(err);
    res.status(err.status || 500).json({ error: err instanceof StoryError ? err.message : 'Щось пішло не так.' });
  }
});

const validPerson = (c) => c && typeof c.name === 'string' && typeof c.visual === 'string';

// A reference given as one of our own /generated/ files is read from disk; data URLs pass through.
async function loadReference(ref) {
  if (typeof ref !== 'string') return null;
  if (ref.startsWith('data:image/')) return ref.length < 4_000_000 ? ref : null;
  const m = ref.match(/^\/generated\/([\w-]+\.(png|jpg|webp))$/);
  if (!m) return null;
  const buf = await readFile(path.join(IMAGES_DIR, m[1])).catch(() => null);
  if (!buf) return null;
  const type = m[2] === 'jpg' ? 'jpeg' : m[2];
  return `data:image/${type};base64,${buf.toString('base64')}`;
}

// Draw one panel, or the heroine's reference portrait.
// Body: { slide: {image_prompt, characters_in_frame}, characters[], heroine, reference, seed } | { portrait: heroine }
app.post('/api/image', async (req, res) => {
  const slide = req.body?.slide;
  const portrait = validPerson(req.body?.portrait) ? req.body.portrait : null;
  if (!portrait && (!slide || !clean(slide.image_prompt, 4000))) return res.status(400).json({ error: 'Немає опису кадру.' });

  if (PLACEHOLDER_IMAGES) {
    const svg = mockPanelSvg(Number(req.body?.seed) || 0);
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 1200));
    return res.json({ url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` });
  }

  try {
    let prompt;
    let reference = null;
    if (portrait) {
      prompt = buildPortraitPrompt(portrait, { style: req.body?.prompts?.imageStyle, preset: req.body?.stylePreset });
    } else {
      const characters = Array.isArray(req.body?.characters) ? req.body.characters.filter(validPerson) : [];
      const heroine = validPerson(req.body?.heroine) ? req.body.heroine : null;
      reference = await loadReference(req.body?.reference);
      prompt = buildImagePrompt(
        { image_prompt: clean(slide.image_prompt, 4000), characters_in_frame: slide.characters_in_frame || [] },
        characters,
        { heroine, hasReference: Boolean(reference), style: req.body?.prompts?.imageStyle, preset: req.body?.stylePreset },
      );
    }
    const file = await drawPanel(prompt, IMAGES_DIR, reference);
    res.json({ url: `/generated/${file}` });
  } catch (err) {
    if (!(err instanceof ImageError)) console.error(err);
    res.status(err.status || 500).json({ error: err instanceof ImageError ? err.message : 'Не вдалося намалювати кадр.' });
  }
});

app.listen(PORT, () => {
  console.log(`✨ Історії на двох: http://localhost:${PORT}  (текст: ${TEXT_PROVIDER})`);
  if (DEMO) console.log('   Демо-режим: сценарій і картинки — заглушки, ключі API не потрібні.');
  else if (PLACEHOLDER_IMAGES) console.log('   Немає ключа для картинок (OPENROUTER_API_KEY або OPENAI_API_KEY) — будуть заглушки.');
  else console.log(`   Картинки: ${PROVIDER}`);
});
