// Історії на двох — client. A library of stories; each one's progress lives in localStorage
// (photos are referenced by URL). The server, or the browser backend on GitHub Pages, is stateless.
import { CATALOG } from './catalog.js';

const STORAGE_KEY = 'stories-for-two:v1';
const HOLD_MS = 220;
const SLIDES = 5;
const LOADING_LINES = ['Пишемо продовження…', 'Підбираємо слова…', 'Вона вже чекає…', 'Ще кілька секунд…'];

// GitHub Pages build: pages/direct.js installs a browser-only backend before this script runs.
const backend = window.__directBackend || null;

const $ = (id) => document.getElementById(id);
const els = {
  home: $('home'), library: $('library'), viewer: $('viewer'), stage: $('stage'), slide: $('slide'), bars: $('bars'),
  chapterLabel: $('chapterLabel'), avatar: $('viewerAvatar'), pauseBtn: $('pauseBtn'), closeBtn: $('closeBtn'),
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
let elapsed = 0;
let lastTick = 0;
let userPaused = false;
let holding = false;
let busy = false;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
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
const isLastSlideOfStory = () => pos.c === state().chapters.length - 1 && pos.s === currentChapter().slides.length - 1;

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
      const body = el('div', 'card-body');
      body.append(
        el('span', 'card-who', `${p.heroine.name}, ${p.heroine.age}`),
        el('span', 'card-title', p.title),
        el('span', 'card-line', p.tagline),
      );
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
  renderLibrary();
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
let loadingTimer;
let loadingAbort = null;
els.loadingCancel.addEventListener('click', () => loadingAbort?.abort());

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

function setLoading(on) {
  busy = on;
  clearInterval(loadingTimer);
  if (!on) {
    loadingAbort?.abort(); // also releases the wake lock
    loadingAbort = null;
    return hide(els.loading);
  }
  loadingAbort = new AbortController();
  keepAwake(loadingAbort.signal);
  const started = Date.now();
  let i = 0;
  els.loadingText.textContent = LOADING_LINES[0];
  els.loadingProgress.textContent = 'Надсилаємо запит…';
  els.loadingTime.textContent = '0:00';
  show(els.loading);
  loadingTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - started) / 1000);
    els.loadingTime.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (sec % 4 === 0) els.loadingText.textContent = LOADING_LINES[++i % LOADING_LINES.length];
  }, 1000);
  return loadingAbort.signal;
}

function showProgress({ phase, slides }) {
  els.loadingProgress.textContent =
    phase === 'thinking' ? 'Обдумуємо сюжет…' : `Пишемо: кадр ${Math.max(1, slides)} з ${SLIDES}`;
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
    const job = api('/api/image', { portrait: preset(id).heroine, seed: CATALOG.findIndex((p) => p.id === id) })
      .then(({ url }) => {
        lib[id] ||= {};
        lib[id].portrait = { status: 'done', url };
        save();
        if (!els.home.classList.contains('hidden')) renderLibrary();
        if (currentId === id) fillAvatar();
        return url;
      })
      .catch(() => null) // photos are still made, just without a reference
      .finally(() => portraitJobs.delete(id));
    portraitJobs.set(id, job);
  }
  return portraitJobs.get(id);
}

async function generateChapter(id, prompt) {
  if (busy) return false;
  const signal = setLoading(true);
  const portrait = ensurePortrait(id); // made while Claude writes
  try {
    const data = await api('/api/chapter', { story: storyForApi(id), prompt }, { signal, onProgress: showProgress });
    const st = (lib[id] ||= {});
    st.chapters ||= [];
    if (Array.isArray(data.characters) && data.characters.length) st.characters = data.characters;
    st.chapters.push({
      prompt,
      title: data.chapter_title || `Розділ ${st.chapters.length + 1}`,
      options: data.next_options || [],
      slides: data.slides.map((s) => ({ ...s, image: { status: 'loading' } })),
    });
    currentId = id;
    pos = { c: st.chapters.length - 1, s: 0 };
    elapsed = 0;
    save();
    hide(els.ask);
    showViewer();
    const c = pos.c;
    portrait.then(() => st.chapters[c].slides.forEach((_, i) => drawImage(id, c, i)));
    return true;
  } catch (err) {
    if (!signal.aborted) toast(err.message);
    return false;
  } finally {
    setLoading(false);
  }
}

// ---------- Images ----------
const inFlight = new Set();
async function drawImage(id, c, s) {
  const key = `${id}:${c}:${s}`;
  if (inFlight.has(key)) return;
  inFlight.add(key);
  const st = lib[id];
  const slide = st.chapters[c].slides[s];
  slide.image = { status: 'loading' };
  refreshIfCurrent(id, c, s);
  try {
    const { url } = await api('/api/image', {
      slide: { image_prompt: slide.image_prompt, characters_in_frame: slide.characters_in_frame },
      characters: st.characters || [],
      heroine: preset(id).heroine,
      reference: st.portrait?.status === 'done' ? st.portrait.url : null,
      seed: c * SLIDES + s,
    });
    await preload(await displayUrl(url));
    slide.image = { status: 'done', url };
  } catch (err) {
    slide.image = { status: 'error', message: err.message };
  } finally {
    inFlight.delete(key);
    save();
    refreshIfCurrent(id, c, s);
  }
}
function refreshIfCurrent(id, c, s) {
  if (currentId === id && pos.c === c && pos.s === s && !els.viewer.classList.contains('hidden')) renderArt();
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

function slideDuration(slide) {
  const chars = slide.narration.length + (slide.dialogues || []).reduce((n, d) => n + d.text.length, 0);
  return Math.min(16000, Math.max(6000, 4000 + chars * 45));
}

function renderBars() {
  const ch = currentChapter();
  els.bars.replaceChildren(
    ...ch.slides.map((_, i) => {
      const bar = el('div', 'bar');
      const fill = el('i');
      fill.style.width = i < pos.s ? '100%' : '0%';
      bar.append(fill);
      return bar;
    }),
  );
  els.chapterLabel.textContent = `${preset(currentId).heroine.name} · Розділ ${pos.c + 1}: ${ch.title}`;
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
        renderArt();
      },
    );
  } else if (img.status === 'error') {
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
  } else {
    const box = el('div', 'art-placeholder');
    box.append(el('div', 'big', '📸'), el('div', null, 'Створюємо фото…'));
    art.replaceChildren(box);
  }
}

function renderSlide() {
  const slide = currentSlide();
  if (!slide) return;
  renderBars();
  elapsed = 0;
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
  if (userPaused) frag.append(el('div', 'paused-badge', '❚❚'));
  els.slide.replaceChildren(frag);
  renderArt();

  // Warm up the next photo so the tap feels instant.
  const next = currentChapter().slides[pos.s + 1];
  if (next?.image?.status === 'done') displayUrl(next.image.url).then(preload, () => {});
  save();
}

// ---------- Navigation ----------
function next() {
  if (!state()) return;
  if (isLastSlideOfStory()) return openAsk();
  if (pos.s < currentChapter().slides.length - 1) pos.s++;
  else pos = { c: pos.c + 1, s: 0 };
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
function setUserPaused(on) {
  userPaused = on;
  els.pauseBtn.textContent = on ? '▶' : '❚❚';
  els.pauseBtn.setAttribute('aria-label', on ? 'Відтворити' : 'Пауза');
  const badge = els.slide.querySelector('.paused-badge');
  if (on && !badge) els.slide.append(el('div', 'paused-badge', '❚❚'));
  if (!on) badge?.remove();
}

// ---------- Auto-advance ----------
function canAdvance() {
  if (els.viewer.classList.contains('hidden')) return false;
  if (!els.ask.classList.contains('hidden') || busy || userPaused || holding || document.hidden) return false;
  return currentSlide()?.image?.status === 'done'; // wait for the photo before the timer starts
}
function tick(now) {
  const dt = lastTick ? Math.min(now - lastTick, 100) : 0;
  lastTick = now;
  if (canAdvance()) {
    elapsed += dt;
    const total = slideDuration(currentSlide());
    const fill = els.bars.children[pos.s]?.firstElementChild;
    if (fill) fill.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
    if (elapsed >= total) next();
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---------- Input ----------
let downAt = 0;
let holdTimer;
els.stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, .ask, textarea')) return;
  downAt = performance.now();
  holdTimer = setTimeout(() => (holding = true), HOLD_MS);
});
els.stage.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  clearTimeout(holdTimer);
  const wasHold = holding || performance.now() - downAt >= HOLD_MS;
  downAt = 0;
  holding = false;
  if (wasHold) return; // releasing a hold just resumes
  const rect = els.stage.getBoundingClientRect();
  if (e.clientX - rect.left < rect.width * 0.3) prev();
  else next();
});
els.stage.addEventListener('pointercancel', () => {
  clearTimeout(holdTimer);
  downAt = 0;
  holding = false;
});
els.stage.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  if (els.viewer.classList.contains('hidden') || e.target.matches('textarea, input')) return;
  if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
  else if (e.key === ' ') {
    e.preventDefault();
    setUserPaused(!userPaused);
  } else if (e.key === 'Escape') showHome();
});

els.pauseBtn.addEventListener('click', () => setUserPaused(!userPaused));
els.closeBtn.addEventListener('click', () => {
  save();
  showHome();
});
els.askBackBtn.addEventListener('click', () => {
  hide(els.ask);
  elapsed = 0;
});
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

// ---------- API keys (GitHub Pages build only) ----------
function setupKeys() {
  const toggle = $('keysToggle');
  if (!backend) return toggle.remove();
  const box = $('keysBox');
  const form = $('keysForm');
  const a = $('keyAnthropic');
  const o = $('keyOpenrouter');
  const m = $('keyImageModel');
  const status = $('keysStatus');
  const checkBtn = $('keysCheck');
  const showKeys = (open) => {
    box.hidden = !open;
    if (!open) return;
    const k = backend.getKeys();
    a.value = k.anthropic || '';
    o.value = k.openrouter || '';
    m.value = k.imageModel || '';
    status.replaceChildren();
  };
  showKeys(!backend.hasKeys());
  toggle.addEventListener('click', () => showKeys(box.hidden));
  checkBtn.addEventListener('click', async () => {
    const anthropic = a.value.trim();
    const openrouter = o.value.trim();
    if (!anthropic || !openrouter) return toast('Встав обидва ключі, потім перевір.');
    checkBtn.disabled = true;
    checkBtn.textContent = 'Перевіряю…';
    status.replaceChildren();
    try {
      const r = await backend.checkKeys({ anthropic, openrouter });
      status.replaceChildren(
        ...[r.anthropic, r.openrouter].map((x) => el('p', x.ok ? 'ok' : 'bad', (x.ok ? '✅ ' : '❌ ') + x.message)),
      );
    } finally {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Перевірити ключі';
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const anthropic = a.value.trim();
    const openrouter = o.value.trim();
    if (!anthropic || !openrouter) return toast('Потрібні обидва ключі.');
    try {
      backend.setKeys({ anthropic, openrouter, imageModel: m.value.trim() });
    } catch {
      return toast('Браузер не дозволив зберегти ключі (приватний режим?).');
    }
    showKeys(false);
    toast('Ключі збережено на цьому пристрої.', true);
  });
}

// ---------- Boot ----------
showHome();
setupKeys();
if (!backend) {
  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      if (cfg.demo) els.demoNote.textContent = 'Демо-режим: текст і фото — заглушки. Додай ключі API в .env, щоб генерувати по-справжньому.';
      else if (cfg.placeholderImages) els.demoNote.textContent = 'Немає ключа для фото (OPENROUTER_API_KEY або OPENAI_API_KEY) — замість фото будуть заглушки.';
      else return;
      show(els.demoNote);
    })
    .catch(() => {});
}
