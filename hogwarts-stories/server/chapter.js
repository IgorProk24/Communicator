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

// Complete slide objects inside the (still streaming) JSON's "slides" array, in order.
// A string-aware brace scan: an object counts once its closing brace has arrived.
export function extractSlides(text) {
  const key = text.indexOf('"slides"');
  if (key < 0) return [];
  let i = text.indexOf('[', key);
  if (i < 0) return [];
  const out = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (i += 1; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          out.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          return out;
        }
        start = -1;
      }
    } else if (ch === ']' && depth === 0) break;
  }
  return out.slice(0, MAX_SLIDES);
}

// Calls onSlide(index, slide) once for each slide as soon as it is complete in the stream.
export function slideEmitter(onSlide) {
  let sent = 0;
  return (snapshot) => {
    if (!onSlide) return;
    const slides = extractSlides(snapshot);
    for (; sent < slides.length; sent++) onSlide(sent, slides[sent]);
  };
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
