// Історії на двох — client. A library of stories; each one's progress lives in localStorage
// (photos are referenced by URL). The server, or the browser backend on GitHub Pages, is stateless.
import { CATALOG } from './catalog.js';

const STORAGE_KEY = 'stories-for-two:v1';
const SEED_STRIDE = 16; // keeps per-slide placeholder seeds distinct across chapters
const LOADING_LINES = ['Пишемо продовження…', 'Підбираємо слова…', 'Вона вже чекає…', 'Ще кілька секунд…'];

// GitHub Pages build: pages/direct.js installs a browser-only backend before this script runs.
const backend = window.__directBackend || null;

const $ = (id) => document.getElementById(id);
const els = {
  home: $('home'), library: $('library'), viewer: $('viewer'), stage: $('stage'), slide: $('slide'), bars: $('bars'),
  chapterLabel: $('chapterLabel'), avatar: $('viewerAvatar'), closeBtn: $('closeBtn'),
  ask: $('ask'), askForm: $('askForm'), askPrompt: $('askPrompt'), askChips: $('askChips'), askChapter: $('askChapter'), askBackBtn: $('askBackBtn'),
  intro: $('intro'), introCover: $('introCover'), introHeroine: $('introHeroine'), introTitle: $('introTitle'), introSetting: $('introSetting'),
  introProgress: $('introProgress'), introContinue: $('introContinue'), introRestart: $('introRestart'), introRestartNote: $('introRestartNote'),
  introForm: $('introForm'), introPrompt: $('introPrompt'), introClose: $('introClose'),
  loading: $('loading'), loadingText: $('loadingText'), loadingProgress: $('loadingProgress'), loadingTime: $('loadingTime'), loadingCancel: $('loadingCancel'),
  toast: $('toast'), demoNote: $('demoNote'),
};

// ---------- State ----------
/** lib[id] = { characters, chapters: [{prompt,title,options,slides}], pos: {c,s}, portrait: {status,url} } */
let lib = load();
let currentId = null;
let pos = { c: 0, s: 0 };
let busy = false;

function load() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
  // A chapter still being written when the page closed keeps the frames it had.
  for (const st of Object.values(data)) {
    if (!Array.isArray(st?.chapters)) continue;
    st.chapters = st.chapters
      .map((ch) => ({ ...ch, streaming: false, slides: (ch.slides || []).filter(Boolean) }))
      .filter((ch) => ch.slides.length);
  }
  return data;
}
function save() {
  if (currentId && lib[currentId]) lib[currentId].pos = pos;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
  } catch {
    /* storage full or blocked: the story still works for this visit */
  }
}

const preset = (id) => CATALOG.find((s) => s.id === id);
const state = () => lib[currentId];
const currentChapter = () => state()?.chapters?.[pos.c];
const currentSlide = () => currentChapter()?.slides[pos.s];
const isLastSlideOfStory = () =>
  pos.c === state().chapters.length - 1 && !currentChapter().streaming && pos.s === currentChapter().slides.length - 1;

// ---------- Helpers ----------
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}
const show = (n) => n.classList.remove('hidden');
const hide = (n) => n.classList.add('hidden');

let toastTimer;
function toast(message, ok = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('ok', ok);
  show(els.toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide(els.toast), ok ? 3000 : 7000);
}

async function api(path, body, options = {}) {
  if (backend) {
    try {
      return await backend.call(path, body, options);
    } catch (err) {
      throw new Error(err?.message || err?.name || String(err ?? 'Щось пішло не так.'));
    }
  }
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Помилка сервера (${res.status})`);
  return data;
}

// Image URLs from the browser backend ("idb:…") point at photos kept in the browser.
const displayUrl = (url) => (backend ? backend.resolveUrl(url) : Promise.resolve(url));

function preload(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = url;
  });
}

// Shows the heroine's portrait, or the story's colour gradient + initial while there is none.
function fillPortrait(box, id) {
  const p = preset(id);
  const portrait = lib[id]?.portrait;
  box.style.backgroundImage = `linear-gradient(160deg, ${p.colors[0]}, ${p.colors[1]})`;
  box.replaceChildren(el('span', 'card-initial', p.heroine.name[0]));
  if (portrait?.status === 'done') {
    displayUrl(portrait.url).then(
      (src) => {
        const img = el('img');
        img.alt = p.heroine.name;
        img.src = src;
        box.replaceChildren(img);
      },
      () => {},
    );
  }
}

function renderChips(box, items, textarea) {
  box.replaceChildren(
    ...items.map((text) => {
      const chip = el('button', 'chip', text);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        textarea.value = text;
        textarea.focus();
      });
      return chip;
    }),
  );
}

// ---------- Library ----------
function renderLibrary() {
  els.library.replaceChildren(
    ...CATALOG.map((p) => {
      const chapters = lib[p.id]?.chapters?.length || 0;
      const card = el('button', 'card');
      card.type = 'button';
      card.setAttribute('aria-label', `${p.title}, ${p.heroine.name}`);
      const art = el('div', 'card-art');
      fillPortrait(art, p.id);
      if (portraitJobs.has(p.id)) art.append(el('span', 'card-making', 'Створюємо фото…'));
      const body = el('div', 'card-body');
      const who = el('span', 'card-who', `${p.heroine.name}, ${p.heroine.age}`);
      if (p.heroine.trait) who.append(el('span', 'card-trait', p.heroine.trait));
      body.append(who, el('span', 'card-title', p.title), el('span', 'card-line', p.tagline));
      card.append(art, el('div', 'card-shade'), body, el('span', 'card-badge', chapters ? `Розділ ${chapters}` : 'Нова'));
      card.addEventListener('click', () => openIntro(p.id));
      return card;
    }),
  );
}

function showHome() {
  hide(els.viewer);
  hide(els.ask);
  els.intro.hidden = true;
  show(els.home);
  currentId = null;
  makeMissingPortraits();
  renderLibrary();
}

// Every card should show its heroine: make the portraits that don't exist yet (once each, then cached).
// A failed one is retried at most once a minute, so a missing key or credit doesn't loop.
const portraitFailedAt = new Map();
function makeMissingPortraits() {
  if (backend && !backend.hasKeys()) return;
  for (const p of CATALOG) {
    if (lib[p.id]?.portrait?.status === 'done' || portraitJobs.has(p.id)) continue;
    if (Date.now() - (portraitFailedAt.get(p.id) || 0) < 60_000) continue;
    ensurePortrait(p.id);
  }
}

// ---------- Story card ----------
let introId = null;
function openIntro(id) {
  introId = id;
  const p = preset(id);
  const st = lib[id];
  fillPortrait(els.introCover, id);
  els.introHeroine.textContent = `${p.heroine.name}, ${p.heroine.age}`;
  els.introTitle.textContent = p.title;
  els.introSetting.textContent = `${p.setting} ${p.heroine.about}`;
  els.introRestartNote.hidden = true;
  els.introRestart.dataset.armed = '';
  const started = Boolean(st?.chapters?.length);
  els.introProgress.hidden = !started;
  els.introForm.hidden = started;
  if (started) els.introContinue.textContent = `Продовжити · розділ ${st.chapters.length}`;
  els.introPrompt.value = p.opening;
  els.intro.hidden = false;
}

els.introClose.addEventListener('click', () => (els.intro.hidden = true));
els.intro.addEventListener('click', (e) => {
  if (e.target === els.intro) els.intro.hidden = true;
});
els.introContinue.addEventListener('click', () => {
  const st = lib[introId];
  currentId = introId;
  pos = st.pos && st.chapters[st.pos.c]?.slides[st.pos.s] ? st.pos : { c: 0, s: 0 };
  els.intro.hidden = true;
  showViewer();
  // Photos still being made when the page closed get another try.
  st.chapters.forEach((ch, c) => ch.slides.forEach((s, i) => s.image?.status !== 'done' && drawImage(currentId, c, i)));
});
els.introRestart.addEventListener('click', () => {
  if (!els.introRestart.dataset.armed) {
    els.introRestart.dataset.armed = '1';
    els.introRestartNote.hidden = false;
    return;
  }
  // Same heroine in a fresh story: keep her portrait, drop everything else.
  const portrait = lib[introId]?.portrait;
  if (portrait?.status === 'done') lib[introId] = { portrait };
  else delete lib[introId];
  save();
  renderLibrary();
  openIntro(introId);
});
els.introForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = introId;
  const prompt = els.introPrompt.value.trim() || preset(id).opening;
  els.intro.hidden = true;
  const ok = await generateChapter(id, prompt);
  if (!ok) openIntro(id);
});

// ---------- Loading ----------
// One "work" spans a whole chapter: the overlay is shown until the first frame is ready, but the
// request (and the screen wake lock) lives on while the rest of the chapter streams in.
let loadingTimer;
let workAbort = null;
els.loadingCancel.addEventListener('click', () => workAbort?.abort());

// iOS drops network requests of a locked or backgrounded tab, so keep the screen on while waiting.
async function keepAwake(signal) {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    if (!lock) return;
    const release = () => lock.release().catch(() => {});
    if (signal.aborted) return release();
    signal.addEventListener('abort', release, { once: true });
  } catch {
    /* not supported or refused */
  }
}

function startWork() {
  busy = true;
  workAbort = new AbortController();
  keepAwake(workAbort.signal);
  const started = Date.now();
  let i = 0;
  els.loadingText.textContent = LOADING_LINES[0];
  els.loadingProgress.textContent = 'Надсилаємо запит…';
  els.loadingTime.textContent = '0:00';
  show(els.loading);
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - started) / 1000);
    els.loadingTime.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (sec % 4 === 0) els.loadingText.textContent = LOADING_LINES[++i % LOADING_LINES.length];
  }, 1000);
  return workAbort.signal;
}
function hideOverlay() {
  clearInterval(loadingTimer);
  hide(els.loading);
}
function endWork() {
  hideOverlay();
  busy = false;
  workAbort?.abort(); // also releases the wake lock
  workAbort = null;
}

function showProgress({ phase, slides }) {
  if (els.loading.classList.contains('hidden')) return;
  const who = textModelName();
  els.loadingProgress.textContent =
    phase === 'thinking' ? `${who} обдумує сюжет…` : `${who} пише: кадр ${Math.max(1, slides)}`;
}

// How fast the last chapter came, to compare models (shown in Settings).
const TIMING_KEY = 'stories-for-two:timing';
function saveTiming(t) {
  try {
    localStorage.setItem(TIMING_KEY, JSON.stringify(t));
  } catch {
    /* not important */
  }
}
function timingText() {
  try {
    const t = JSON.parse(localStorage.getItem(TIMING_KEY));
    if (!t) return '';
    const parts = [];
    if (t.firstFrame) parts.push(`перший кадр (текст + фото) за ${t.firstFrame} с`);
    if (t.text) parts.push(`увесь текст за ${t.text} с`);
    return parts.length ? `Останній розділ (${t.model}): ${parts.join(', ')}.` : '';
  } catch {
    return '';
  }
}

// ---------- Generation ----------
// Only the text the writer needs: the story card, the people, and what has happened so far.
function storyForApi(id) {
  const p = preset(id);
  const st = lib[id] || {};
  return {
    title: p.title,
    setting: p.setting,
    heroine: p.heroine,
    characters: st.characters || [],
    chapters: (st.chapters || []).map((ch) => ({
      prompt: ch.prompt,
      title: ch.title,
      slides: ch.slides.map(({ narration, dialogues }) => ({ narration, dialogues })),
    })),
  };
}

// The heroine's reference portrait: made once per story, then sent with every photo so her face stays the same.
const portraitJobs = new Map();
function ensurePortrait(id) {
  lib[id] ||= {};
  if (lib[id].portrait?.status === 'done') return Promise.resolve(lib[id].portrait.url);
  if (!portraitJobs.has(id)) {
    const job = modelsReady
      .then(() => api('/api/image', { portrait: preset(id).heroine, prompts: customPrompts(), seed: CATALOG.findIndex((p) => p.id === id) }))
      .then(({ url }) => {
        lib[id] ||= {};
        lib[id].portrait = { status: 'done', url };
        save();
        if (!els.home.classList.contains('hidden')) renderLibrary();
        if (currentId === id) fillAvatar();
        return url;
      })
      .catch(() => {
        portraitFailedAt.set(id, Date.now());
        return null; // photos are still made, just without a reference
      })
      .finally(() => {
        portraitJobs.delete(id);
        if (!els.home.classList.contains('hidden')) renderLibrary();
      });
    portraitJobs.set(id, job);
  }
  return portraitJobs.get(id);
}

const str = (v) => (typeof v === 'string' ? v : '');
function cleanSlide(s) {
  return {
    narration: str(s?.narration),
    dialogues: (Array.isArray(s?.dialogues) ? s.dialogues : []).map((d) => ({ speaker: str(d?.speaker), text: str(d?.text) })).filter((d) => d.text),
    sfx: str(s?.sfx),
    image_prompt: str(s?.image_prompt),
    characters_in_frame: Array.isArray(s?.characters_in_frame) ? s.characters_in_frame.map(str).filter(Boolean) : [],
  };
}

// Called when the first frame's photo is settled (made or failed): that is when the chapter opens.
const firstFrameWaiters = new Map();

// Streams a chapter frame by frame: each finished frame starts its photo right away, and the
// chapter opens as soon as frame 1 has both its text and its photo. The rest arrive while reading.
async function generateChapter(id, prompt) {
  if (busy) return false;
  const signal = startWork();
  const t0 = performance.now();
  await modelsReady; // saved model IDs are checked first, so requests use real ones
  const portrait = ensurePortrait(id); // made while the text is written
  const st = (lib[id] ||= {});
  st.chapters ||= [];
  const story = storyForApi(id); // before the new chapter is added
  const c = st.chapters.length;
  const ch = { prompt, title: `Розділ ${c + 1}`, options: [], writtenBy: textModelName(), slides: [], streaming: true };
  st.chapters.push(ch);
  const timing = { model: textModelName() };

  let opened = false;
  let resolveFirst;
  const firstFrame = new Promise((r) => (resolveFirst = r));
  firstFrameWaiters.set(`${id}:${c}`, () => {
    if (opened) return;
    opened = true;
    timing.firstFrame = Math.round((performance.now() - t0) / 1000);
    saveTiming(timing);
    currentId = id;
    pos = { c, s: 0 };
    hideOverlay();
    hide(els.ask);
    showViewer();
    resolveFirst();
  });

  const addSlide = (i, raw) => {
    if (ch.slides[i]) return;
    ch.slides[i] = { ...cleanSlide(raw), image: { status: 'loading' } };
    if (i === 0 && !opened) els.loadingProgress.textContent = 'Перший кадр написано, створюємо фото…';
    portrait.then(() => drawImage(id, c, i));
    // The reader may already be waiting on this frame.
    if (opened && currentId === id && pos.c === c && !els.viewer.classList.contains('hidden')) renderSlide();
  };

  try {
    const data = await api(
      '/api/chapter',
      { story, prompt, prompts: customPrompts() },
      { signal, onProgress: showProgress, onSlide: addSlide },
    );
    // Backends that don't stream frames (the server build) hand everything over here.
    (data.slides || []).forEach((s, i) => addSlide(i, s));
    ch.slides = ch.slides.slice(0, Math.max(1, (data.slides || []).length));
    if (Array.isArray(data.characters) && data.characters.length) st.characters = data.characters;
    ch.title = data.chapter_title || ch.title;
    ch.options = data.next_options || [];
    ch.streaming = false;
    timing.text = Math.round((performance.now() - t0) / 1000);
    saveTiming(timing);
    save();
    if (opened && currentId === id && pos.c === c) renderSlide();
    await firstFrame; // the overlay stays until frame 1 has its photo
    return true;
  } catch (err) {
    ch.streaming = false;
    ch.slides = ch.slides.filter(Boolean);
    if (!ch.slides.length) {
      st.chapters.splice(c, 1); // nothing arrived: drop the empty chapter
      firstFrameWaiters.delete(`${id}:${c}`);
    } else if (!opened) {
      firstFrameWaiters.get(`${id}:${c}`)?.(); // show what was written
    } else if (currentId === id && pos.c === c) {
      pos.s = Math.min(pos.s, ch.slides.length - 1);
      renderSlide();
    }
    save();
    if (!signal.aborted) toast(ch.slides.length ? `Розділ обірвався: ${err.message}` : err.message);
    return ch.slides.length > 0;
  } finally {
    endWork();
  }
}

// ---------- Images ----------
const inFlight = new Set();
async function drawImage(id, c, s) {
  const key = `${id}:${c}:${s}`;
  if (inFlight.has(key)) return;
  inFlight.add(key);
  const st = lib[id];
  const slide = st.chapters[c]?.slides[s];
  if (!slide) return inFlight.delete(key);
  slide.image = { status: 'loading' };
  refreshIfCurrent(id, c, s);
  try {
    await modelsReady;
    const { url } = await api('/api/image', {
      slide: { image_prompt: slide.image_prompt, characters_in_frame: slide.characters_in_frame },
      characters: st.characters || [],
      heroine: preset(id).heroine,
      reference: st.portrait?.status === 'done' ? st.portrait.url : null,
      prompts: customPrompts(),
      seed: c * SEED_STRIDE + s,
    });
    await preload(await displayUrl(url));
    slide.image = { status: 'done', url };
  } catch (err) {
    slide.image = { status: 'error', message: err.message };
  } finally {
    inFlight.delete(key);
    save();
    if (s === 0) {
      const open = firstFrameWaiters.get(`${id}:${c}`);
      firstFrameWaiters.delete(`${id}:${c}`);
      open?.();
    }
    refreshIfCurrent(id, c, s);
  }
}
// A frame's text appears together with its photo, so the whole frame is redrawn when the photo lands.
function refreshIfCurrent(id, c, s) {
  if (currentId === id && pos.c === c && pos.s === s && !els.viewer.classList.contains('hidden')) renderSlide();
}

// ---------- Viewer ----------
function showViewer() {
  hide(els.home);
  show(els.viewer);
  fillAvatar();
  renderSlide();
}
function fillAvatar() {
  els.avatar.style.backgroundImage = `linear-gradient(160deg, ${preset(currentId).colors.join(', ')})`;
  els.avatar.replaceChildren();
  const portrait = state()?.portrait;
  if (portrait?.status === 'done') {
    displayUrl(portrait.url).then(
      (src) => {
        const img = el('img');
        img.alt = '';
        img.src = src;
        els.avatar.replaceChildren(img);
      },
      () => {},
    );
  }
}

function renderBars() {
  const ch = currentChapter();
  // While the chapter is still being written, one more (dim) bar stands for the frame on its way.
  const count = ch.slides.length + (ch.streaming ? 1 : 0);
  els.bars.replaceChildren(
    ...Array.from({ length: count }, (_, i) => {
      const bar = el('div', 'bar');
      if (i >= ch.slides.length) bar.classList.add('pending');
      const fill = el('i');
      fill.style.width = i <= pos.s ? '100%' : '0%'; // no timer: bars just show where you are
      bar.append(fill);
      return bar;
    }),
  );
  // Which model wrote this chapter, so Claude and Grok chapters are easy to tell apart.
  els.chapterLabel.replaceChildren();
  if (ch.writtenBy) els.chapterLabel.append(el('span', 'model-tag', ch.writtenBy));
  els.chapterLabel.append(`${preset(currentId).heroine.name} · Розділ ${pos.c + 1}: ${ch.title}`);
}

function renderArt() {
  const art = els.slide.querySelector('.art');
  if (!art) return;
  const slide = currentSlide();
  const img = slide.image || { status: 'loading' };
  if (img.status === 'done') {
    const node = el('img');
    node.alt = slide.narration;
    node.draggable = false;
    node.onload = () => node.classList.add('ready');
    art.replaceChildren(node);
    displayUrl(img.url).then(
      (src) => {
        node.src = src;
        if (node.complete) node.classList.add('ready');
      },
      () => {
        slide.image = { status: 'error', message: 'Фото загубилося — створи ще раз.' };
        renderSlide();
      },
    );
  } else {
    const box = el('div', 'art-placeholder error');
    box.append(el('div', 'big', '📷'), el('div', null, img.message || 'Не вдалося створити фото'));
    const retry = el('button', 'retry-btn', '⟳ Спробувати ще раз');
    retry.type = 'button';
    retry.addEventListener('click', (e) => {
      e.stopPropagation();
      drawImage(currentId, pos.c, pos.s);
    });
    box.append(retry);
    art.replaceChildren(box);
  }
}

// Waiting state of a frame: no text until its photo is there.
function renderWaiting(message) {
  const box = el('div', 'art-placeholder');
  box.append(el('div', 'big', '📸'), el('div', null, message));
  const art = el('div', 'art');
  art.append(box);
  els.slide.replaceChildren(art);
}

function renderSlide() {
  const ch = currentChapter();
  if (!ch) return;
  renderBars();
  const slide = currentSlide();
  if (!slide) return renderWaiting('Пишемо наступний кадр…');
  if (slide.image?.status === 'loading') return renderWaiting('Створюємо фото…');

  const frag = document.createDocumentFragment();
  frag.append(el('div', 'art'), el('div', 'shade-top'), el('div', 'shade-bottom'));
  if (slide.narration) frag.append(el('div', 'caption pop', slide.narration));
  if (slide.sfx) {
    const sfx = el('div', 'sfx pop', slide.sfx);
    sfx.style.animationDelay = '0.3s';
    frag.append(sfx);
  }
  const bubbles = el('div', 'bubbles');
  (slide.dialogues || []).forEach((d, i) => {
    const mine = /^ти$/i.test(d.speaker.trim());
    const b = el('div', `bubble pop ${mine ? 'me' : 'her'}`);
    b.style.animationDelay = `${0.5 + i * 0.6}s`;
    if (!mine) b.append(el('b', null, d.speaker));
    b.append(document.createTextNode(d.text));
    bubbles.append(b);
  });
  frag.append(bubbles);
  // The reader moves on by tapping; say so on the very first frame of a story.
  if (pos.c === 0 && pos.s === 0) frag.append(el('div', 'tap-hint', 'Торкнись праворуч, щоб гортати →'));
  else if (isLastSlideOfStory()) frag.append(el('div', 'tap-hint', 'Торкнись, щоб вирішити, що далі →'));
  els.slide.replaceChildren(frag);
  renderArt();

  // Warm up the next photo so the tap feels instant.
  const next = ch.slides[pos.s + 1];
  if (next?.image?.status === 'done') displayUrl(next.image.url).then(preload, () => {});
  save();
}

// ---------- Navigation ----------
function next() {
  const ch = currentChapter();
  if (!ch) return;
  const last = ch.slides.length - 1;
  if (pos.s < last) pos.s++;
  else if (ch.streaming) {
    if (pos.s === last) pos.s++; // step onto the frame that is still being written
    else return;
  } else if (pos.c < state().chapters.length - 1) pos = { c: pos.c + 1, s: 0 };
  else return openAsk();
  renderSlide();
}
function prev() {
  if (!state()) return;
  if (pos.s > 0) pos.s--;
  else if (pos.c > 0) pos = { c: pos.c - 1, s: state().chapters[pos.c - 1].slides.length - 1 };
  renderSlide();
}
function openAsk() {
  els.askChapter.textContent = `Кінець розділу ${pos.c + 1}`;
  renderChips(els.askChips, currentChapter().options || [], els.askPrompt);
  els.askPrompt.value = '';
  show(els.ask);
  els.bars.querySelectorAll('.bar > i').forEach((f) => (f.style.width = '100%'));
}
// ---------- Input ----------
// No auto-advance: the reader moves only by tapping (left third = back, the rest = forward).
els.stage.addEventListener('click', (e) => {
  if (e.target.closest('button, .ask, textarea, a')) return;
  const rect = els.stage.getBoundingClientRect();
  if (e.clientX - rect.left < rect.width * 0.3) prev();
  else next();
});
els.stage.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  if (els.viewer.classList.contains('hidden') || e.target.matches('textarea, input')) return;
  if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
  else if (e.key === ' ') {
    e.preventDefault();
    next();
  } else if (e.key === 'Escape') showHome();
});

els.closeBtn.addEventListener('click', () => {
  save();
  showHome();
});
els.askBackBtn.addEventListener('click', () => hide(els.ask));
els.askPrompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.askForm.requestSubmit();
  }
});
els.askForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = els.askPrompt.value.trim();
  if (!prompt) return els.askPrompt.focus();
  await generateChapter(currentId, prompt);
});

// ---------- Which models are on ----------
let serverTextProvider = 'claude';
function textProvider() {
  return backend ? backend.getKeys().textProvider || 'claude' : serverTextProvider;
}
function textModelName() {
  if (textProvider() === 'grok') return 'Grok';
  const m = backend?.getKeys().claudeModel || '';
  return m.includes('haiku') ? 'Claude Haiku' : m.includes('sonnet') ? 'Claude Sonnet' : 'Claude';
}
const shortModel = (id) => (id || '').split('/').pop();

function renderModelChip() {
  const chip = $('modelChip');
  const k = backend ? backend.getKeys() : {};
  chip.replaceChildren('Сюжет: ', el('b', null, textModelName()));
  if (backend) chip.append(' · Фото: ', el('b', null, shortModel(k.imageModel || backend.defaults.imageModel)));
  chip.append(backend ? ' ⚙️' : '');
  chip.hidden = false;
}

// OpenRouter's public model list: real IDs for the Grok and photo pickers.
let modelListPromise = null;
// The default list leaves out models that only make pictures (Seedream, Grok Imagine…), so the
// image-output list is fetched as well and merged. A filter OpenRouter doesn't know just returns the default list.
function loadModelList() {
  const get = (q) =>
    fetch(`https://openrouter.ai/api/v1/models${q}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
  modelListPromise ??= Promise.allSettled([get(''), get('?output_modalities=image'), get('?output_modalities=all')])
    .then((results) => {
      const ok = results.filter((r) => r.status === 'fulfilled');
      if (!ok.length) throw results[0].reason;
      const byId = new Map();
      for (const r of ok) for (const m of r.value?.data || []) if (!byId.has(m.id)) byId.set(m.id, m);
      return [...byId.values()];
    })
    .catch((err) => {
      modelListPromise = null; // try again next time
      throw err;
    });
  return modelListPromise;
}
const newestFirst = (a, b) => b.id.localeCompare(a.id, 'en', { numeric: true });
function modelChoices(list) {
  const outputs = (m) => m.architecture?.output_modalities || [];
  const grok = list.filter((m) => m.id.startsWith('x-ai/') && !outputs(m).includes('image')).sort(newestFirst);
  const rank = (m) => (/seedream/i.test(m.id) ? 0 : m.id.startsWith('x-ai/') ? 1 : 2);
  const image = list.filter((m) => outputs(m).includes('image')).sort((a, b) => rank(a) - rank(b) || newestFirst(a, b));
  return { grok, image };
}
// Keep a saved ID if it exists; fix the "grok-4" style without the vendor prefix; otherwise pick a sensible default.
function resolveModel(saved, models, prefer) {
  const ids = new Set(models.map((m) => m.id));
  if (saved && ids.has(saved)) return saved;
  if (saved && ids.has(`x-ai/${saved}`)) return `x-ai/${saved}`;
  for (const test of prefer) {
    const hit = models.find((m) => test.test(m.id));
    if (hit) return hit.id;
  }
  return models[0]?.id || saved || '';
}
const outputsOf = (m) => m?.architecture?.output_modalities || [];
function modalitiesFor(id, image) {
  const m = image.find((x) => x.id === id);
  return m && !outputsOf(m).includes('text') ? ['image'] : ['image', 'text'];
}
const GROK_PREFER = [/^x-ai\/grok-4-fast$/, /^x-ai\/grok.*fast/, /^x-ai\/grok-4/, /^x-ai\/grok/];
// Photos: Seedream first; if OpenRouter has none, Grok's image model; then Gemini.
const IMAGE_PREFER = [/seedream/i, /^x-ai\//, /gemini.*image/i];
// Fallback when the main photo model fails: Grok's image model (or Seedream, if Grok is the main one).
function pickImageFallback(image, primary) {
  const grokImage = image.find((m) => m.id.startsWith('x-ai/') && m.id !== primary);
  if (grokImage) return grokImage.id;
  return image.find((m) => /seedream/i.test(m.id) && m.id !== primary)?.id || '';
}

// On the browser build, quietly replace saved model IDs that OpenRouter doesn't know.
// Generation waits for this, so it never starts with an ID that is about to be replaced.
let modelsReady = Promise.resolve();
async function fixSavedModels() {
  if (!backend || !backend.hasKeys()) return;
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
    const { grok, image } = modelChoices(await Promise.race([loadModelList(), timeout]));
    const k = backend.getKeys();
    const fixed = {
      ...k,
      grokModel: resolveModel(k.grokModel, grok, GROK_PREFER),
      imageModel: resolveModel(k.imageModelChosen ? k.imageModel : null, image, IMAGE_PREFER),
    };
    fixed.imageFallbackModel = pickImageFallback(image, fixed.imageModel);
    fixed.imageModalities = {
      [fixed.imageModel]: modalitiesFor(fixed.imageModel, image),
      ...(fixed.imageFallbackModel ? { [fixed.imageFallbackModel]: modalitiesFor(fixed.imageFallbackModel, image) } : {}),
    };
    if (JSON.stringify(fixed) !== JSON.stringify(k)) {
      backend.setKeys(fixed);
      renderModelChip();
    }
  } catch {
    /* no list: keep what is saved */
  }
}

// ---------- Login link (GitHub Pages build) ----------
// There is no server to keep accounts, so the "login" is a link whose #fragment holds the keys and
// settings encrypted with the reader's password (PBKDF2-SHA256 → AES-256-GCM). The fragment never
// leaves the browser: it is not sent to GitHub Pages.
const LOGIN_PREFIX = '#login=';
const LOGIN_LINK_KEY = 'stories-for-two:login-link';
const b64u = {
  to: (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  from: (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};
async function passwordKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
async function sealLogin(password, payload) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passwordKey(password, salt);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return `v1.${b64u.to(salt)}.${b64u.to(iv)}.${b64u.to(data)}`;
}
async function openLogin(password, token) {
  const [v, salt, iv, data] = token.split('.');
  if (v !== 'v1' || !salt || !iv || !data) throw new Error('Посилання пошкоджене. Створи нове в налаштуваннях.');
  const key = await passwordKey(password, b64u.from(salt));
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.from(iv) }, key, b64u.from(data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error('Невірний пароль.');
  }
}
const loginLinkFor = (token) => `${location.origin}${location.pathname}${LOGIN_PREFIX}${token}`;
function dropLoginFromUrl() {
  history.replaceState(null, '', location.pathname + location.search);
}

// Opened from a saved login link: ask for the password and restore keys, models and prompts.
function setupLoginScreen(onRestored) {
  if (!backend || !location.hash.startsWith(LOGIN_PREFIX)) return;
  const token = location.hash.slice(LOGIN_PREFIX.length);
  const box = $('login');
  const pass = $('loginPassIn');
  const error = $('loginError');
  box.hidden = false;
  setTimeout(() => pass.focus(), 50);
  $('loginSkip').addEventListener('click', () => {
    box.hidden = true;
    dropLoginFromUrl();
  });
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    const btn = e.submitter;
    if (btn) btn.disabled = true;
    try {
      const saved = await openLogin(pass.value, token);
      if (saved.keys) backend.setKeys(saved.keys);
      if (saved.prompts) localStorage.setItem(PROMPTS_KEY, JSON.stringify(saved.prompts));
      box.hidden = true;
      dropLoginFromUrl();
      onRestored();
      toast('Вхід виконано: ключі й налаштування відновлено.', true);
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// ---------- Settings ----------
// Custom prompts live in this browser and travel with every request; empty means "use the default".
const PROMPTS_KEY = 'stories-for-two:prompts';
let defaults = backend?.defaults || { story: '', imageStyle: '' };
function loadPrompts() {
  try {
    return JSON.parse(localStorage.getItem(PROMPTS_KEY)) || {};
  } catch {
    return {};
  }
}
function customPrompts() {
  const p = loadPrompts();
  const out = {};
  if (p.story?.trim()) out.story = p.story;
  if (p.imageStyle?.trim()) out.imageStyle = p.imageStyle;
  return out;
}

function setupSettings() {
  const box = $('keysBox');
  const form = $('keysForm');
  const status = $('keysStatus');
  const checkBtn = $('keysCheck');
  const f = {
    anthropic: $('keyAnthropic'), claudeModel: $('claudeModel'), grokModel: $('grokModel'),
    openrouter: $('keyOpenrouter'), imageModel: $('keyImageModel'),
    story: $('promptStory'), imageStyle: $('promptImage'),
  };
  const providerInputs = [...form.querySelectorAll('input[name=textProvider]')];
  const provider = () => providerInputs.find((r) => r.checked)?.value || 'claude';
  const syncProvider = () => {
    $('claudeFields').hidden = provider() !== 'claude';
    $('grokFields').hidden = provider() !== 'grok';
    $('activeText').textContent =
      provider() === 'grok'
        ? 'Обрано Grok: нові розділи писатиме Grok через OpenRouter.'
        : 'Обрано Claude: нові розділи писатиме Claude від Anthropic.';
  };

  // Fill a <select> with real OpenRouter models, keeping the chosen ID even if it is not listed.
  const fillSelect = (select, models, chosen) => {
    select.replaceChildren(
      ...models.map((m) => {
        const o = el('option', null, m.name ? `${m.name} (${m.id})` : m.id);
        o.value = m.id;
        return o;
      }),
    );
    if (chosen && !models.some((m) => m.id === chosen)) {
      const o = el('option', null, `${chosen} — не знайдено на OpenRouter`);
      o.value = chosen;
      select.prepend(o);
    }
    select.value = chosen;
  };
  // The photo model counts as the reader's own choice only once they change the list themselves.
  let imageTouched = false;
  let pickerImages = []; // photo models from the last list, to store the right request shape on save
  f.imageModel.addEventListener('change', () => (imageTouched = true));
  const fillModelPickers = async (k) => {
    const note = $('modelsNote');
    try {
      const { grok, image } = modelChoices(await loadModelList());
      pickerImages = image;
      fillSelect(f.grokModel, grok, resolveModel(k.grokModel, grok, GROK_PREFER));
      fillSelect(f.imageModel, image, resolveModel(k.imageModelChosen ? k.imageModel : null, image, IMAGE_PREFER));
      imageTouched = Boolean(k.imageModelChosen);
      const fallback = pickImageFallback(image, f.imageModel.value);
      const seedream = image.filter((m) => /seedream/i.test(m.id));
      const xaiImage = image.filter((m) => m.id.startsWith('x-ai/'));
      const chosen = f.imageModel.value;
      note.textContent =
        `Список з OpenRouter: ${grok.length} версій Grok, ${image.length} моделей фото. ` +
        (seedream.length
          ? `Seedream є: ${seedream.map((m) => m.id).join(', ')}. `
          : xaiImage.length
            ? `Seedream на OpenRouter немає, тому за замовчуванням обрано модель від xAI (${xaiImage[0].id}). `
            : `На OpenRouter не знайдено ні Seedream, ні моделі фото від xAI, тому обрано ${chosen}. `) +
        (fallback ? `Якщо обрана модель фото не спрацює, кадр повториться на ${fallback}.` : 'Запасної моделі фото немає.');
    } catch (err) {
      fillSelect(f.grokModel, [], k.grokModel || defaults.grokModel);
      fillSelect(f.imageModel, [], k.imageModel || defaults.imageModel);
      note.textContent = `Не вдалося завантажити список моделей (${err.message}). Спробуй відкрити налаштування ще раз.`;
    }
  };
  providerInputs.forEach((r) => r.addEventListener('change', syncProvider));

  // The server build keeps keys and the text model in .env; only prompts are set here.
  if (!backend) {
    for (const id of ['setText', 'setImages', 'setLogin', 'keysNote', 'keysCheck']) $(id).hidden = true;
  }

  const fill = () => {
    if (backend) {
      const k = backend.getKeys();
      providerInputs.forEach((r) => (r.checked = r.value === (k.textProvider || 'claude')));
      f.anthropic.value = k.anthropic || '';
      f.openrouter.value = k.openrouter || '';
      f.claudeModel.value = k.claudeModel || 'claude-opus-5-5';
      fillModelPickers(k);
      syncProvider();
    }
    $('timingLine').textContent = timingText();
    const p = loadPrompts();
    f.story.value = p.story?.trim() ? p.story : defaults.story;
    f.imageStyle.value = p.imageStyle?.trim() ? p.imageStyle : defaults.imageStyle;
    status.replaceChildren();
  };
  const open = (on) => {
    box.hidden = !on;
    if (on) fill();
  };
  open(Boolean(backend) && !backend.hasKeys());
  $('keysToggle').addEventListener('click', () => open(box.hidden));
  $('modelChip').addEventListener('click', () => {
    open(true);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Login link: encrypt what is saved now with the reader's password.
  if (backend) {
    const showLink = (link) => {
      $('loginLink').value = link;
      $('loginOut').hidden = !link;
      $('loginShare').hidden = !navigator.share;
    };
    // The link is encrypted, so keeping it here is safe; it saves having to create it again.
    try {
      showLink(localStorage.getItem(LOGIN_LINK_KEY) || '');
    } catch {
      /* storage blocked */
    }
    $('loginMake').addEventListener('click', async () => {
      const btn = $('loginMake');
      const p1 = $('loginPass').value;
      const p2 = $('loginPass2').value;
      if (p1.length < 8) return toast('Пароль має бути щонайменше 8 символів.');
      if (p1 !== p2) return toast('Паролі не збігаються.');
      if (!backend.hasKeys()) return toast('Спершу введи ключі й натисни «Зберегти», потім створи посилання.');
      if (!window.crypto?.subtle) return toast('Цей браузер не підтримує шифрування. Відкрий сайт у Safari за адресою https://….');
      btn.disabled = true;
      btn.textContent = 'Створюю…';
      try {
        const token = await sealLogin(p1, { keys: backend.getKeys(), prompts: loadPrompts() });
        const link = loginLinkFor(token);
        showLink(link);
        try {
          localStorage.setItem(LOGIN_LINK_KEY, link);
        } catch {
          /* storage blocked: the link is still shown */
        }
        $('loginPass').value = '';
        $('loginPass2').value = '';
        $('loginOut').scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('Посилання створено. Скопіюй його або натисни «Поділитися» й збережи в Нотатки.', true);
      } catch (err) {
        toast(`Не вдалося створити посилання: ${err?.message || err}`);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Створити посилання для входу';
      }
    });
    $('loginShare').addEventListener('click', async () => {
      try {
        await navigator.share({ title: 'Історії на двох — вхід', url: $('loginLink').value });
      } catch {
        /* the reader closed the share sheet */
      }
    });
    $('loginCopy').addEventListener('click', async () => {
      const link = $('loginLink');
      try {
        await navigator.clipboard.writeText(link.value);
        toast('Посилання скопійовано.', true);
      } catch {
        link.focus();
        link.select();
        toast('Не вдалося скопіювати автоматично: виділи посилання й скопіюй вручну.');
      }
    });
  }

  $('promptsReset').addEventListener('click', () => {
    f.story.value = defaults.story;
    f.imageStyle.value = defaults.imageStyle;
    toast('Повернуто стандартні промпти. Натисни «Зберегти».', true);
  });

  checkBtn.addEventListener('click', async () => {
    const keys = {
      anthropic: f.anthropic.value.trim(),
      openrouter: f.openrouter.value.trim(),
      textProvider: provider(),
      grokModel: f.grokModel.value.trim(),
      imageModel: f.imageModel.value.trim(),
    };
    if (!keys.openrouter || (keys.textProvider === 'claude' && !keys.anthropic)) {
      return toast(keys.textProvider === 'claude' ? 'Встав ключі Anthropic і OpenRouter, потім перевір.' : 'Встав ключ OpenRouter, потім перевір.');
    }
    checkBtn.disabled = true;
    checkBtn.textContent = 'Перевіряю…';
    status.replaceChildren();
    try {
      const r = await backend.checkKeys(keys);
      status.replaceChildren(
        ...[r.text, r.openrouter, ...(r.models || [])].filter(Boolean).map((x) => el('p', x.ok ? 'ok' : 'bad', (x.ok ? '✅ ' : '❌ ') + x.message)),
      );
    } finally {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Перевірити ключі';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // A prompt equal to the default is stored as "use default", so future default updates still apply.
    const story = f.story.value.trim() === (defaults.story || '').trim() ? '' : f.story.value;
    const imageStyle = f.imageStyle.value.trim() === (defaults.imageStyle || '').trim() ? '' : f.imageStyle.value;
    try {
      localStorage.setItem(PROMPTS_KEY, JSON.stringify({ story, imageStyle }));
      if (backend) {
        const keys = {
          textProvider: provider(),
          anthropic: f.anthropic.value.trim(),
          claudeModel: f.claudeModel.value,
          grokModel: f.grokModel.value.trim(),
          openrouter: f.openrouter.value.trim(),
          imageModel: f.imageModel.value.trim(),
          imageModelChosen: imageTouched,
        };
        if (pickerImages.length) {
          keys.imageFallbackModel = pickImageFallback(pickerImages, keys.imageModel);
          keys.imageModalities = { [keys.imageModel]: modalitiesFor(keys.imageModel, pickerImages) };
          if (keys.imageFallbackModel) keys.imageModalities[keys.imageFallbackModel] = modalitiesFor(keys.imageFallbackModel, pickerImages);
        }
        if (!keys.openrouter || (keys.textProvider === 'claude' && !keys.anthropic)) {
          return toast(keys.textProvider === 'claude' ? 'Потрібні ключі Anthropic і OpenRouter.' : 'Потрібен ключ OpenRouter.');
        }
        backend.setKeys(keys);
      }
    } catch {
      return toast('Браузер не дозволив зберегти налаштування (приватний режим?).');
    }
    open(false);
    renderModelChip();
    modelsReady = fixSavedModels(); // refreshes the fallback for the newly chosen photo model
    toast(`Збережено. Сюжет пише ${textModelName()}.`, true);
    makeMissingPortraits();
    renderLibrary();
  });
}

// ---------- Boot ----------
// Opened from a login link: restore keys first, then start as usual.
setupLoginScreen(() => {
  $('keysBox').hidden = true;
  renderModelChip();
  modelsReady = fixSavedModels();
  showHome();
});
modelsReady = fixSavedModels(); // first: portraits started by showHome() wait for it
showHome();
setupSettings();
renderModelChip();
if (!backend) {
  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      if (cfg.defaults) defaults = cfg.defaults;
      if (cfg.textProvider) serverTextProvider = cfg.textProvider;
      renderModelChip();
      if (cfg.demo) els.demoNote.textContent = 'Демо-режим: текст і фото — заглушки. Додай ключі API в .env, щоб генерувати по-справжньому.';
      else if (cfg.placeholderImages) els.demoNote.textContent = 'Немає ключа для фото (OPENROUTER_API_KEY або OPENAI_API_KEY) — замість фото будуть заглушки.';
      else return;
      show(els.demoNote);
    })
    .catch(() => {});
}
