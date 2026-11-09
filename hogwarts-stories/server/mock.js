// Demo mode: canned chapters and drawn-by-code placeholder pictures, so the UI works without API keys.

export function mockChapter(story, prompt) {
  const n = (story.chapters?.length || 0) + 1;
  const h = story.heroine;
  const beats = [
    [`${h.name} помічає тебе першою й усміхається так, ніби чекала саме на цю зустріч.`, [[h.name, 'Ну привіт. Не думала, що ти тут з\'явишся.']]],
    ['Ви на мить замовкаєте, і навколо ніби стає тихіше.', [['Ти', 'Здається, нам є що розповісти одне одному.']]],
    [`${h.name} сміється й поправляє волосся — вона явно трохи хвилюється.`, [[h.name, 'Добре. Але спершу — чесна відповідь на одне питання.']]],
    ['Вона нахиляється ближче, і ти відчуваєш легкий аромат її парфумів.', [[h.name, 'Ти досі такий самий, як я пам\'ятаю?'], ['Ти', 'Перевір сама.']]],
    ['Телефон у її кишені вібрує. Вона дивиться на екран — і змінюється на обличчі.', [[h.name, 'Ой. Здається, у нас проблема…']]],
  ];
  return {
    chapter_title: n === 1 ? 'Початок' : `Розділ ${n}: ${prompt.slice(0, 30)}`,
    characters: [{ name: h.name, visual: h.visual }],
    slides: beats.map(([narration, lines], i) => ({
      narration: i === 0 && n > 1 ? `(${prompt}) ${narration}` : narration,
      dialogues: lines.map(([speaker, text]) => ({ speaker, text })),
      sfx: '',
      image_prompt: 'demo',
      characters_in_frame: [h.name],
    })),
    next_options: ['Запросити її на прогулянку', 'Пожартувати, щоб розрядити момент', 'Сказати, що це найкращий вечір за рік'],
  };
}

const PALETTES = [
  ['#3a2418', '#c07a4a', '#ffd9a8'],
  ['#1d1a2e', '#6b4e8a', '#e0a35a'],
  ['#0f1c2e', '#5f86b8', '#cfe8ff'],
  ['#14141c', '#7a2f3a', '#ff9aa5'],
  ['#1c2a1f', '#4f8a56', '#d8f5c8'],
];

// A soft city-at-dusk placeholder.
export function mockPanelSvg(seed = 0) {
  const [a, b, c] = PALETTES[Math.abs(seed) % PALETTES.length];
  const windows = Array.from({ length: 28 }, (_, i) => {
    const x = 40 + ((i * 137 + seed * 53) % 940);
    const y = 820 + ((i * 89 + seed * 31) % 420);
    return `<rect x="${x}" y="${y}" width="18" height="26" rx="3" fill="${c}" opacity="${0.35 + (i % 4) / 6}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1536" width="1024" height="1536">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="1024" height="1536" fill="url(#g)"/>
  <circle cx="${300 + (seed * 97) % 420}" cy="380" r="120" fill="${c}" opacity="0.35"/>
  <path d="M0 780 H140 V640 H260 V720 H380 V560 H520 V700 H640 V600 H780 V740 H900 V660 H1024 V1536 H0Z" fill="#000" opacity="0.45"/>
  ${windows}
</svg>`;
}
