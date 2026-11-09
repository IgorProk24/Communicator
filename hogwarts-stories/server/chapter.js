// What every text provider (Claude, Grok) shares: the error type and turning the model's JSON into a chapter.
import { MAX_SLIDES } from './prompts.js';

export class StoryError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

// Each slide object carries one "narration" key, so counting them in the streamed text tracks progress.
export function slidesSoFar(snapshot) {
  return Math.min(MAX_SLIDES, (snapshot.match(/"narration"/g) || []).length);
}

export function parseChapter(text, who) {
  let chapter;
  try {
    chapter = JSON.parse(text);
  } catch {
    // Some models wrap the JSON in a ```json fence or a sentence: take the outermost object.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    try {
      if (start < 0 || end <= start) throw new Error('no object');
      chapter = JSON.parse(text.slice(start, end + 1));
    } catch {
      chapter = null;
    }
  }
  if (!chapter) {
    console.error(`[${who}] unparseable output:`, text.slice(0, 500));
    throw new StoryError(`Не вдалося прочитати сценарій від ${who}. Спробуй ще раз.`, 502);
  }
  if (!Array.isArray(chapter?.slides) || chapter.slides.length === 0) {
    throw new StoryError(`${who} повернув порожній розділ. Спробуй ще раз.`, 502);
  }
  chapter.slides = chapter.slides.slice(0, MAX_SLIDES);
  chapter.next_options = (chapter.next_options || []).slice(0, 3);
  return chapter;
}
