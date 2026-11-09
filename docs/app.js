// Hogwarts Stories — client. Story state lives in localStorage; the server is stateless.

const STORAGE_KEY = 'hogwarts-stories:v1';
const HOLD_MS = 220;

const EXAMPLES = [
  'Гаррі знаходить таємну кімнату під Великою залою',
  'Рон випадково перетворює Снейпа на тхора',
  'Посеред квідичного матчу з\'являється дракон',
  'Герміона варить зілля, яке показує чужі сни',
];
const LOADING_LINES = [
  'Сова несе новий сувій…',
  'Перо саме пише історію…',
  'Варимо зілля сюжету…',
  'Сортувальний капелюх думає…',
  'Шукаємо потрібну сторінку в Забороненій секції…',
];

const $ = (id) => document.getElementById(id);
const els = {
  home: $('home'), viewer: $('viewer'), stage: $('stage'), slide: $('slide'), bars: $('bars'),
  chapterLabel: $('chapterLabel'), pauseBtn: $('pauseBtn'), closeBtn: $('closeBtn'),
  ask: $('ask'), askForm: $('askForm'), askPrompt: $('askPrompt'), askChips: $('askChips'),
  askChapter: $('askChapter'), askBackBtn: $('askBackBtn'),
  startForm: $('startForm'), startPrompt: $('startPrompt'), startChips: $('startChips'),
  resumeBox: $('resumeBox'), resumeBtn: $('resumeBtn'), newStoryBtn: $('newStoryBtn'),
  loading: $('loading'), loadingText: $('loadingText'), toast: $('toast'), demoNote: $('demoNote'),
};

// ---------- State ----------
/** @type {{title:string, characters:{name:string,visual:string}[], chapters:any[]} | null} */
let story = load();
let pos = { c: 0, s: 0 };
let elapsed = 0;          // ms shown on the current slide
let lastTick = 0;
let userPaused = false;   // pause button
let holding = false;      // finger held on the screen
let busy = false;         // chapter request in flight

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function save() {
  try {
    if (story) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...story, pos }));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage full or blocked: the story still works for this session */
  }
}

const currentChapter = () => story?.chapters[pos.c];
const currentSlide = () => currentChapter()?.slides[pos.s];
const isLastSlideOfStory = () => pos.c === story.chapters.length - 1 && pos.s === currentChapter().slides.length - 1;

// ---------- Small helpers ----------
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}
function show(node) { node.classList.remove('hidden'); }
function hide(node) { node.classList.add('hidden'); }

let toastTimer;
function toast(message, ok = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('ok', ok);
  show(els.toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide(els.toast), 5000);
}

// GitHub Pages build: pages/direct.js installs a browser-only backend before this script runs.
const backend = window.__directBackend || null;

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

// Image URLs from the browser backend ("idb:…") point at photos stored in IndexedDB.
function displayUrl(url) {
  return backend ? backend.resolveUrl(url) : Promise.resolve(url);
}

function renderChips(container, items, textarea) {
  container.replaceChildren(
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

// ---------- Screens ----------
function showHome() {
  hide(els.viewer);
  hide(els.ask);
  show(els.home);
  if (story?.chapters?.length) {
    els.resumeBtn.textContent = `▶ Продовжити «${story.title}»`;
    show(els.resumeBox);
  } else {
    hide(els.resumeBox);
  }
}

function showViewer() {
  hide(els.home);
  show(els.viewer);
  renderSlide();
}

// ---------- Chapter generation ----------
let loadingTimer;
let loadingAbort = null;
const loadingProgress = document.getElementById('loadingProgress');
const loadingTime = document.getElementById('loadingTime');
document.getElementById('loadingCancel').addEventListener('click', () => loadingAbort?.abort());

function setLoading(on) {
  busy = on;
  clearInterval(loadingTimer);
  if (!on) {
    loadingAbort?.abort(); // also releases the screen wake lock
    loadingAbort = null;
    return hide(els.loading);
  }
  loadingAbort = new AbortController();
  keepAwake(loadingAbort.signal);
  const started = Date.now();
  let i = 0;
  els.loadingText.textContent = LOADING_LINES[0];
  loadingProgress.textContent = 'Надсилаємо запит до Claude…';
  loadingTime.textContent = '0:00';
  show(els.loading);
  loadingTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - started) / 1000);
    loadingTime.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (sec % 3 === 0) {
      i = (i + 1) % LOADING_LINES.length;
      els.loadingText.textContent = LOADING_LINES[i];
    }
  }, 1000);
  return loadingAbort.signal;
}

// iOS drops network requests of a locked or backgrounded tab, so keep the screen on while waiting.
async function keepAwake(signal) {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    if (!lock) return;
    const release = () => lock.release().catch(() => {});
    if (signal.aborted) return release();
    signal.addEventListener('abort', release, { once: true });
  } catch {
    /* not supported or refused: nothing to do */
  }
}

function showProgress({ phase, slides }) {
  loadingProgress.textContent =
    phase === 'thinking' ? 'Claude обдумує сюжет…' : `Claude пише: слайд ${Math.max(1, slides)} з 5`;
}

// Only the text the writer needs — no image data.
function storyForApi() {
  if (!story) return null;
  return {
    title: story.title,
    characters: story.characters,
    chapters: story.chapters.map((ch) => ({
      prompt: ch.prompt,
      title: ch.title,
      slides: ch.slides.map(({ narration, dialogues }) => ({ narration, dialogues })),
    })),
  };
}

async function generateChapter(prompt) {
  if (busy) return false;
  const signal = setLoading(true);
  try {
    const data = await api('/api/chapter', { story: storyForApi(), prompt }, { signal, onProgress: showProgress });
    story ??= { title: '', characters: [], chapters: [] };
    story.title = data.story_title || story.title || 'Без назви';
    if (Array.isArray(data.characters) && data.characters.length) story.characters = data.characters;
    story.chapters.push({
      prompt,
      title: data.chapter_title,
      options: data.next_options || [],
      slides: data.slides.map((s) => ({ ...s, image: { status: 'loading' } })),
    });
    pos = { c: story.chapters.length - 1, s: 0 };
    elapsed = 0;
    save();
    story.chapters[pos.c].slides.forEach((_, i) => drawImage(pos.c, i));
    hide(els.ask);
    showViewer();
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
async function drawImage(c, s) {
  const key = `${c}:${s}`;
  if (inFlight.has(key)) return;
  inFlight.add(key);
  const slide = story.chapters[c].slides[s];
  slide.image = { status: 'loading' };
  if (pos.c === c && pos.s === s) renderArt();
  try {
    const { url } = await api('/api/image', {
      slide: { image_prompt: slide.image_prompt, characters_in_frame: slide.characters_in_frame },
      characters: story.characters,
      seed: c * 5 + s,
    });
    await preload(await displayUrl(url));
    slide.image = { status: 'done', url };
  } catch (err) {
    slide.image = { status: 'error', message: err.message };
  } finally {
    inFlight.delete(key);
    save();
    if (pos.c === c && pos.s === s) renderArt();
  }
}
function preload(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = url;
  });
}

// ---------- Rendering ----------
function slideDuration(slide) {
  const chars = slide.narration.length + (slide.dialogues || []).reduce((n, d) => n + d.text.length, 0);
  return Math.min(16000, Math.max(7000, 4500 + chars * 45));
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
  els.chapterLabel.textContent = `Розділ ${pos.c + 1} · ${ch.title}`;
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
    displayUrl(img.url).then(
      (src) => {
        node.src = src;
        if (node.complete) node.classList.add('ready');
      },
      () => {
        slide.image = { status: 'error', message: 'Фото загубилося — намалюй ще раз.' };
        renderArt();
      },
    );
    art.replaceChildren(node);
    if (node.complete) node.classList.add('ready');
  } else if (img.status === 'error') {
    const box = el('div', 'art-placeholder error');
    box.append(el('div', 'big', '🪄'), el('div', null, img.message || 'Не вдалося намалювати кадр'));
    const retry = el('button', 'retry-btn', '⟳ Намалювати ще раз');
    retry.addEventListener('click', (e) => {
      e.stopPropagation();
      drawImage(pos.c, pos.s);
    });
    box.append(retry);
    art.replaceChildren(box);
  } else {
    const box = el('div', 'art-placeholder');
    box.append(el('div', 'big', '🎨'), el('div', null, 'Малюємо кадр…'));
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
    sfx.style.animationDelay = '0.35s';
    frag.append(sfx);
  }
  const bubbles = el('div', 'bubbles');
  (slide.dialogues || []).forEach((d, i) => {
    const b = el('div', `bubble pop ${i % 2 ? 'right' : 'left'}`);
    b.style.animationDelay = `${0.6 + i * 0.5}s`;
    b.append(el('b', null, d.speaker), document.createTextNode(d.text));
    bubbles.append(b);
  });
  frag.append(bubbles);
  if (userPaused) frag.append(el('div', 'paused-badge', '❚❚'));
  els.slide.replaceChildren(frag);
  renderArt();

  // Warm up the next panel so the swipe feels instant.
  const next = currentChapter().slides[pos.s + 1];
  if (next?.image?.status === 'done') displayUrl(next.image.url).then(preload, () => {});
  save();
}

// ---------- Navigation ----------
function next() {
  if (!story) return;
  if (isLastSlideOfStory()) return openAsk();
  if (pos.s < currentChapter().slides.length - 1) pos.s++;
  else pos = { c: pos.c + 1, s: 0 };
  renderSlide();
}
function prev() {
  if (!story) return;
  if (pos.s > 0) pos.s--;
  else if (pos.c > 0) pos = { c: pos.c - 1, s: story.chapters[pos.c - 1].slides.length - 1 };
  renderSlide();
}

function openAsk() {
  const ch = currentChapter();
  els.askChapter.textContent = `Кінець розділу ${pos.c + 1}`;
  renderChips(els.askChips, ch.options || [], els.askPrompt);
  els.askPrompt.value = '';
  show(els.ask);
  // Fill the last progress bar
  const fills = els.bars.querySelectorAll('.bar > i');
  fills.forEach((f) => (f.style.width = '100%'));
}
function closeAsk() {
  hide(els.ask);
  elapsed = 0;
}

function setUserPaused(on) {
  userPaused = on;
  els.pauseBtn.textContent = on ? '▶' : '❚❚';
  els.pauseBtn.setAttribute('aria-label', on ? 'Відтворити' : 'Пауза');
  const badge = els.slide.querySelector('.paused-badge');
  if (on && !badge) els.slide.append(el('div', 'paused-badge', '❚❚'));
  if (!on) badge?.remove();
}

// ---------- Auto-advance loop ----------
function canAdvance() {
  if (els.viewer.classList.contains('hidden')) return false;
  if (!els.ask.classList.contains('hidden') || busy || userPaused || holding || document.hidden) return false;
  return currentSlide()?.image?.status === 'done'; // wait for the picture before the timer starts
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
  if (els.viewer.classList.contains('hidden') || e.target.matches('textarea')) return;
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
els.askBackBtn.addEventListener('click', closeAsk);

function submitOnEnter(textarea, form) {
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}
submitOnEnter(els.askPrompt, els.askForm);
submitOnEnter(els.startPrompt, els.startForm);

els.askForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = els.askPrompt.value.trim();
  if (!prompt) return els.askPrompt.focus();
  await generateChapter(prompt);
});

els.startForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = els.startPrompt.value.trim();
  if (!prompt) return els.startPrompt.focus();
  if (story?.chapters?.length && !confirm('Почати нову історію? Поточна буде видалена.')) return;
  const previous = story;
  story = null;
  const ok = await generateChapter(prompt);
  if (!ok) story = previous;
  else els.startPrompt.value = '';
});

els.resumeBtn.addEventListener('click', () => {
  pos = story.pos && story.chapters[story.pos.c]?.slides[story.pos.s] ? story.pos : { c: 0, s: 0 };
  // Panels that were still being drawn when the page closed get another try.
  story.chapters.forEach((ch, c) =>
    ch.slides.forEach((s, i) => s.image?.status !== 'done' && drawImage(c, i)),
  );
  showViewer();
});
// ---------- API keys (GitHub Pages build only) ----------
function setupKeys() {
  const form = document.getElementById('keysForm');
  if (!backend || !form) return;
  const box = document.getElementById('keysBox');
  const toggle = document.getElementById('keysToggle');
  const a = document.getElementById('keyAnthropic');
  const o = document.getElementById('keyOpenrouter');
  const showKeys = (open) => {
    box.hidden = !open;
    toggle.hidden = open;
    if (open) {
      const k = backend.getKeys();
      a.value = k.anthropic || '';
      o.value = k.openrouter || '';
    }
  };
  showKeys(!backend.hasKeys());
  const status = document.getElementById('keysStatus');
  const checkBtn = document.getElementById('keysCheck');
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
  toggle.addEventListener('click', () => showKeys(true));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const anthropic = a.value.trim();
    const openrouter = o.value.trim();
    if (!anthropic || !openrouter) return toast('Потрібні обидва ключі.');
    try {
      backend.setKeys({ anthropic, openrouter });
    } catch {
      return toast('Браузер не дозволив зберегти ключі (приватний режим?).');
    }
    showKeys(false);
    toast('Ключі збережено на цьому пристрої.', true);
  });
}

els.newStoryBtn.addEventListener('click', () => {
  if (!confirm('Видалити поточну історію й почати нову?')) return;
  story = null;
  save();
  showHome();
  els.startPrompt.focus();
});

// ---------- Boot ----------
renderChips(els.startChips, EXAMPLES, els.startPrompt);
showHome();
setupKeys();
if (!backend) fetch('/api/config')
  .then((r) => r.json())
  .then((cfg) => {
    if (cfg.demo) els.demoNote.textContent = 'Демо-режим: сценарій і малюнки — заглушки. Додай ключі API в .env, щоб чаклувати по-справжньому.';
    else if (cfg.placeholderImages) els.demoNote.textContent = 'Немає ключа для картинок (OPENROUTER_API_KEY або OPENAI_API_KEY) — замість ілюстрацій будуть заглушки.';
    else return;
    show(els.demoNote);
  })
  .catch(() => {});
