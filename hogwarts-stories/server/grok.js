// Writes the next chapter with Grok over an OpenAI-compatible chat completions API:
// xAI directly (server build) or OpenRouter (browser build: xAI does not accept calls from web pages).
// Plain fetch + SSE parsing, so the same code runs on the Node server and in the browser build.
import { CHAPTER_SCHEMA, buildSystemPrompt, buildUserMessage } from './prompts.js';
import { StoryError, parseChapter, slidesSoFar } from './chapter.js';

const env = globalThis.process?.env ?? {};
export const GROK_URL = 'https://api.x.ai/v1';
export const GROK_DEFAULT_MODEL = env.GROK_MODEL || 'grok-4';
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
export const GROK_OPENROUTER_MODEL = 'x-ai/grok-4-fast';

// One signal that fires on the caller's abort or after `ms`.
function withTimeout(signal, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error('timeout')), ms);
  const onAbort = () => ctl.abort(signal.reason);
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  return { signal: ctl.signal, done: () => clearTimeout(timer), timedOut: () => ctl.signal.reason?.message === 'timeout' };
}

function grokErrorMessage(data) {
  const e = data?.error;
  return (typeof e === 'string' ? e : e?.message) || data?.message || '';
}

export async function writeChapterGrok({
  apiKey, model, story, prompt, storyPrompt, onProgress, signal, timeout = 180_000,
  baseUrl = GROK_URL, via = 'xAI',
}) {
  if (!apiKey) throw new StoryError(`Немає ключа ${via} для Grok. Додай його в налаштуваннях.`, 400);
  const t = withTimeout(signal, timeout);
  let text = '';
  try {
    onProgress?.({ phase: 'thinking', slides: 0 });
    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: t.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || GROK_DEFAULT_MODEL,
          stream: true,
          max_tokens: 16000,
          messages: [
            { role: 'system', content: buildSystemPrompt(storyPrompt) },
            { role: 'user', content: buildUserMessage(story, prompt) },
          ],
          response_format: { type: 'json_schema', json_schema: { name: 'chapter', schema: CHAPTER_SCHEMA, strict: true } },
        }),
      });
    } catch (err) {
      if (t.timedOut()) throw new StoryError('Grok не відповів вчасно. Спробуй ще раз.', 504);
      if (signal?.aborted) throw new StoryError('Скасовано.', 499);
      throw new StoryError(`Зв'язок із Grok обірвався (${err?.message || 'мережа'}).`, 503);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const why = grokErrorMessage(data);
      if (res.status === 401 || res.status === 403) {
        throw new StoryError(`${via} не прийняв ключ (${res.status}${why ? ': ' + why : ''}).`, 500);
      }
      if (res.status === 402) throw new StoryError(`На рахунку ${via} закінчились кредити.`, 402);
      if (res.status === 429) throw new StoryError(`Забагато запитів до Grok або закінчились кредити ${via}. Спробуй пізніше.`, 429);
      throw new StoryError(`Помилка Grok (${res.status}${why ? ': ' + why.slice(0, 200) : ''}).`, 502);
    }

    // Server-sent events: "data: {json}" lines, ending with "data: [DONE]".
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finish = null;
    for (;;) {
      let chunk;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (t.timedOut()) throw new StoryError('Grok не відповів вчасно. Спробуй ще раз.', 504);
        if (signal?.aborted) throw new StoryError('Скасовано.', 499);
        throw new StoryError(`Зв'язок із Grok обірвався (${err?.message || 'мережа'}).`, 503);
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const data = line.trim();
        if (!data.startsWith('data:')) continue;
        const payload = data.slice(5).trim();
        if (payload === '[DONE]') continue;
        let event;
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }
        if (event.error) throw new StoryError(`Помилка Grok: ${grokErrorMessage(event)}`, 502);
        const choice = event.choices?.[0];
        const delta = choice?.delta?.content;
        if (delta) {
          text += delta;
          onProgress?.({ phase: 'writing', slides: slidesSoFar(text) });
        }
        if (choice?.finish_reason) finish = choice.finish_reason;
      }
    }
    if (finish === 'length') throw new StoryError('Відповідь Grok вийшла задовгою й обірвалась. Спробуй ще раз.', 502);
    if (finish === 'content_filter') throw new StoryError('Grok не став писати таке продовження. Спробуй сформулювати інакше.', 422);
  } finally {
    t.done();
  }
  return parseChapter(text, 'Grok');
}

// Server entry point: credentials come from the environment.
export function writeChapterGrokServer(story, prompt, { storyPrompt } = {}) {
  return writeChapterGrok({ apiKey: env.XAI_API_KEY, model: env.GROK_MODEL, story, prompt, storyPrompt });
}
