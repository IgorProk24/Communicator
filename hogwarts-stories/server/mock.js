// Demo mode: canned chapters and drawn-by-code placeholder panels, so the UI works without API keys.

const BEATS = [
  ['Над Гоґвортсом спускається ніч, але в Ґрифіндорській вітальні ще горить камін.', 'ШУРХ…'],
  ['Раптом у вікно влітає сова з дивним сувоєм, перев\'язаним срібною стрічкою.', 'ТУК-ТУК!'],
  ['Сувій розгортається сам і світиться так, що аж очі мружаться.', 'ВЖУХ!'],
  ['Літери складаються в карту коридору, якого ніхто з них раніше не бачив.', ''],
  ['Десь у підземеллях лунає гуркіт. Хтось уже йде слідом…', 'БАХ!'],
];
const LINES = [
  ['Гаррі', 'Ви теж це чули?'],
  ['Рон', 'Скажи, що це просто Півз…'],
  ['Герміона', 'Я читала про такі сувої! Вони показують лише те, що хоче замок.'],
  ['Гаррі', 'Тоді замок хоче, щоб ми туди пішли.'],
  ['Рон', 'Чудово. Просто чудово.'],
];

export function mockChapter(story, prompt) {
  const n = (story?.chapters?.length || 0) + 1;
  return {
    story_title: story?.title || 'Таємниця сріблястого сувою',
    chapter_title: n === 1 ? 'Нічний лист' : `Розділ ${n}: ${prompt.slice(0, 30)}`,
    characters: [
      { name: 'Гаррі', visual: 'boy, 12, messy black hair, round glasses, red-gold scarf' },
      { name: 'Рон', visual: 'tall freckled boy, 12, bright red hair' },
      { name: 'Герміона', visual: 'girl, 12, bushy brown hair, books in arms' },
    ],
    slides: BEATS.map(([narration, sfx], i) => ({
      narration: i === 0 && n > 1 ? `(${prompt}) ${narration}` : narration,
      dialogues: i % 2 === 0 ? [{ speaker: LINES[i][0], text: LINES[i][1] }] : [
        { speaker: LINES[i][0], text: LINES[i][1] },
        { speaker: LINES[(i + 1) % 5][0], text: LINES[(i + 1) % 5][1] },
      ],
      sfx,
      image_prompt: 'demo',
      characters_in_frame: ['Гаррі'],
    })),
    next_options: ['Піти за картою просто зараз', 'Розповісти все Дамблдору', 'Сховати сувій і чекати ранку'],
  };
}

const PALETTES = [
  ['#1b1036', '#5b2a86', '#f6c453'],
  ['#0d2b2b', '#1f6f6b', '#e9d8a6'],
  ['#2a0f12', '#8c2f39', '#ffb703'],
  ['#0b1d3a', '#2d5d9f', '#cfe8ff'],
  ['#1a1a2e', '#4a3f6b', '#e94560'],
];

export function mockPanelSvg(seed = 0) {
  const [a, b, c] = PALETTES[Math.abs(seed) % PALETTES.length];
  const stars = Array.from({ length: 40 }, (_, i) => {
    const x = (i * 97 + seed * 31) % 1024;
    const y = (i * 53 + seed * 17) % 900;
    return `<circle cx="${x}" cy="${y}" r="${(i % 3) + 1}" fill="${c}" opacity="${0.3 + (i % 5) / 8}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1536" width="1024" height="1536">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="1024" height="1536" fill="url(#g)"/>${stars}
  <circle cx="760" cy="300" r="110" fill="${c}" opacity="0.85"/>
  <path d="M0 1200 L120 1000 L180 1060 L260 820 L330 900 L420 640 L500 860 L560 760 L640 980 L720 900 L820 1080 L1024 1000 L1024 1536 L0 1536Z" fill="#000" opacity="0.55"/>
  <path d="M380 1536 L380 700 L420 620 L460 700 L460 1536Z M560 1536 L560 780 L600 690 L640 780 L640 1536Z" fill="#000" opacity="0.7"/>
  <rect x="405" y="760" width="30" height="45" rx="15" fill="${c}" opacity="0.9"/>
  <rect x="585" y="840" width="30" height="45" rx="15" fill="${c}" opacity="0.9"/>
</svg>`;
}
