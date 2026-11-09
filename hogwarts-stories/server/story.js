// Writes the next chapter (5 slides) with Claude.
// writeChapterWith() takes any Anthropic client, so the browser-only build reuses it.
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, CHAPTER_SCHEMA, SLIDES_PER_CHAPTER, buildUserMessage } from './prompts.js';

const env = globalThis.process?.env ?? {};

export const DEFAULTS = {
  model: env.CLAUDE_MODEL || 'claude-opus-5-5',
  effort: env.CLAUDE_EFFORT || 'medium',
  fallbacks: env.CLAUDE_FALLBACKS !== '0',
};

export class StoryError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function writeChapterWith(client, story, prompt, opts = DEFAULTS) {
  const { model, effort } = opts;
  const request = {
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort,
      format: { type: 'json_schema', schema: CHAPTER_SCHEMA },
    },
    messages: [{ role: 'user', content: buildUserMessage(story, prompt) }],
  };
  // Server-side fallback re-runs a request that a safety classifier declined on another model.
  // Haiku has no server-side fallback, so it is never sent there.
  if (opts.fallbacks && !model.includes('haiku')) {
    request.betas = ['server-side-fallback-2026-07-01'];
    request.fallbacks = 'default';
  }

  let response;
  try {
    response = await client.beta.messages.create(request);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new StoryError('Невірний або відсутній ключ Anthropic API.', 500);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new StoryError('Забагато запитів до Claude. Спробуй за хвилину.', 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error('[claude] API error', err.status, err.message);
      throw new StoryError(`Помилка Claude (${err.status ?? 'мережа'}). Спробуй ще раз.`, 502);
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    throw new StoryError('Claude відмовився писати таке продовження. Спробуй сформулювати інакше.', 422);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new StoryError('Відповідь вийшла задовгою й обірвалась. Спробуй ще раз.', 502);
  }

  // If a fallback model took over, only the text after the last fallback block belongs to the answer.
  const lastFallback = response.content.findLastIndex((b) => b.type === 'fallback');
  const text = response.content
    .slice(lastFallback + 1)
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  let chapter;
  try {
    chapter = JSON.parse(text);
  } catch {
    console.error('[claude] unparseable output:', text.slice(0, 500));
    throw new StoryError('Не вдалося прочитати сценарій від Claude. Спробуй ще раз.', 502);
  }

  if (!Array.isArray(chapter.slides) || chapter.slides.length === 0) {
    throw new StoryError('Claude повернув порожній розділ. Спробуй ще раз.', 502);
  }
  chapter.slides = chapter.slides.slice(0, SLIDES_PER_CHAPTER);
  chapter.next_options = (chapter.next_options || []).slice(0, 3);
  return chapter;
}

// Server entry point: credentials come from the environment.
let serverClient;
export function writeChapter(story, prompt) {
  serverClient ??= new Anthropic();
  return writeChapterWith(serverClient, story, prompt, DEFAULTS);
}
