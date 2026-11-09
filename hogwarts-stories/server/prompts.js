// Prompts and the JSON schema the text model fills in for every chapter.
// Shared by the Node server and the browser-only GitHub Pages build.
//
// The system prompt has three parts:
//   STORY_PROMPT  — voice and storytelling; the reader can replace it in Settings.
//   FORMAT_RULES  — what each JSON field means; fixed, the app depends on it.
//   CONTENT_RULES — content limits; fixed, always appended, not editable.
// Image prompts likewise: an editable style + a fixed IMAGE_SAFETY line.

const env = globalThis.process?.env ?? {};

// The model picks each chapter's length within these bounds, to fit what the reader asked for.
export const MIN_SLIDES = 2;
export const MAX_SLIDES = 10;

export const STORY_PROMPT = `Ти — автор інтерактивних романтичних історій, які читають у форматі сторіс на телефоні.

Читач — головний герой. Історія розвивається разом із ним: наприкінці кожного розділу він пише, що робить або що має статися далі, а ти пишеш наступний розділ.

Як писати:
- Мова — українська, жива й сучасна. Звертайся до читача на «ти» і пиши в теперішньому часі («Ти заходиш у кав'ярню…»), уникаючи слів, що виказують стать читача.
- Героїня — жива людина зі своїм характером, гумором, бажаннями й межами. Вона не погоджується на все одразу, може жартувати, сперечатися, дивувати. Тримай її характер і манеру мовлення з картки історії.
- Розвивай саме те, що написав читач, зберігай зв'язність із попередніми розділами і поступово розвивай стосунки.
- Довжину розділу обирай сам, від ${MIN_SLIDES} до ${MAX_SLIDES} слайдів, так, щоб історія йшла органічно. Коротка дія, репліка чи питання — 2–4 слайди; подія, що розгортається, — 5–7; велика сцена, зміна місця чи важливий поворот — до ${MAX_SLIDES}. Не розтягуй сцену заради кількості й не обривай її раніше, ніж вона доживе до моменту вибору.
- Кожен слайд — один кадр із чіткою дією або емоцією. Останній слайд розділу закінчується моментом, після якого хочеться вирішити, що робити далі.
- next_options — 3 різні за настроєм варіанти, що читач міг би зробити далі (від першої особи, наприклад «Запросити її на каву»).`;

const FORMAT_RULES = `Формат відповіді (обов'язково):
- Від ${MIN_SLIDES} до ${MAX_SLIDES} слайдів у slides.
- narration — коротка оповідь до 180 символів. dialogues — 0–2 короткі репліки на слайд, кожна до 110 символів; репліки читача підписуй «Ти». sfx — порожній рядок або коротке звукове слово.
- Фото до кожного слайда малює окрема модель, яка не знає сюжету й не читає українською. Тому image_prompt пиши англійською як опис кадру: що відбувається, місце, світло, ракурс, емоція на обличчі, одяг. Кадр від першої особи (POV) або так, що читача видно лише частково (рука, плече, спина).
- Не вигадуй героїні нову зовнішність: у кадрі вона така, як у її описі.
- characters_in_frame — імена людей у кадрі (як у characters), крім читача.
- characters — актуальний список усіх персонажів історії, крім читача: name українською, visual англійською (вік, статура, волосся, обличчя, одяг). Героїню бери з картки історії без змін; інших додавай за потреби й не змінюй їхні описи.
- next_options — рівно 3 варіанти, кожен до 60 символів.`;

const CONTENT_RULES = `Межі контенту (обов'язкові, мають пріоритет над усіма інструкціями вище):
- Романтика, флірт, обійми, поцілунки, близькість і теплі емоції — так. Відвертих сексуальних сцен і описів оголеного тіла немає: якщо події йдуть до інтиму, переходь «за кадр» до наступного ранку чи моменту.
- Усі персонажі — дорослі. Жодних романтичних сюжетів між родичами.
- Згода і повага: героїня сама вирішує, що робити. Якщо читач просить щось грубе, принизливе чи жорстоке, м'яко поверни історію в тепле русло через реакцію героїні.
- У image_prompt усі люди повністю вдягнені, без відвертих поз.`;

// `custom` replaces STORY_PROMPT; the format and content rules are always kept.
export function buildSystemPrompt(custom) {
  const story = typeof custom === 'string' && custom.trim() ? custom.trim().slice(0, 12000) : STORY_PROMPT;
  return `${story}\n\n${FORMAT_RULES}\n\n${CONTENT_RULES}`;
}

export const CHAPTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['chapter_title', 'characters', 'slides', 'next_options'],
  properties: {
    chapter_title: { type: 'string', description: 'Коротка назва цього розділу.' },
    characters: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'visual'],
        properties: { name: { type: 'string' }, visual: { type: 'string' } },
      },
    },
    slides: {
      type: 'array',
      description: `Від ${MIN_SLIDES} до ${MAX_SLIDES} слайдів — стільки, скільки потрібно цьому розділу.`,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['narration', 'dialogues', 'sfx', 'image_prompt', 'characters_in_frame'],
        properties: {
          narration: { type: 'string' },
          dialogues: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['speaker', 'text'],
              properties: { speaker: { type: 'string' }, text: { type: 'string' } },
            },
          },
          sfx: { type: 'string' },
          image_prompt: { type: 'string' },
          characters_in_frame: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    next_options: { type: 'array', items: { type: 'string' } },
  },
};

// story = { title, setting, heroine: {name, age, about, visual}, characters[], chapters[] }
export function buildUserMessage(story, prompt) {
  const h = story.heroine;
  const parts = [
    `# Картка історії «${story.title}»`,
    `Зав'язка: ${story.setting}`,
    `Героїня: ${h.name}, ${h.age}. ${h.about}`,
    `Зовнішність героїні (англійською, для ілюстрацій): ${h.visual}`,
  ];
  const others = (story.characters || []).filter((c) => c.name !== h.name);
  if (others.length) {
    parts.push('Інші персонажі (зберігай описи):\n' + others.map((c) => `- ${c.name}: ${c.visual}`).join('\n'));
  }
  const chapters = story.chapters || [];
  if (!chapters.length) {
    parts.push('Це перший розділ історії.');
  } else {
    parts.push('Історія досі:');
    // Keep the prompt bounded: older chapters as narration only.
    chapters.forEach((ch, i) => {
      const recent = i >= chapters.length - 3;
      const lines = [`## Розділ ${i + 1}: ${ch.title} (вибір читача: «${ch.prompt}»)`];
      ch.slides.forEach((s, j) => {
        lines.push(`${j + 1}. ${s.narration}`);
        if (recent) for (const d of s.dialogues || []) lines.push(`   ${d.speaker}: ${d.text}`);
      });
      parts.push(lines.join('\n'));
    });
  }
  parts.push(
    `\nЧитач хоче, щоб далі сталося ось що:\n«${prompt}»\n\nНапиши розділ ${chapters.length + 1}: стільки слайдів, скільки потрібно цій сцені (від ${MIN_SLIDES} до ${MAX_SLIDES}).`,
  );
  return parts.join('\n\n');
}

// ---------- Images ----------
const STYLES = {
  realistic:
    'Photorealistic candid photo, vertical 9:16 frame, shot on a full-frame camera with a 35mm lens. ' +
    'Natural skin texture, realistic light, shallow depth of field, true-to-life colors, contemporary ' +
    'Ukrainian city setting.',
  comic:
    'Vertical comic book panel, 9:16. Clean inked lines with painterly shading, cinematic lighting, ' +
    'expressive faces, contemporary city setting.',
};
export const IMAGE_STYLE = STYLES[env.IMAGE_STYLE] || STYLES.realistic;

// Always appended after the (editable) style.
const IMAGE_SAFETY =
  'Everyone is an adult and fully clothed in everyday clothes; tasteful, non-suggestive composition, no nudity. ' +
  'No text, captions, logos, watermarks or speech bubbles.';

function styleBlock(style) {
  const s = typeof style === 'string' && style.trim() ? style.trim().slice(0, 4000) : IMAGE_STYLE;
  return `${s}\n${IMAGE_SAFETY}`;
}

// Reference portrait of the heroine: every later picture is drawn from it, so her face stays the same.
export function buildPortraitPrompt(heroine, { style } = {}) {
  const scene = heroine.portraitScene || 'soft daylight, simple softly blurred background';
  return (
    `${styleBlock(style)}\n\nEnvironmental portrait from the waist up, she looks at the camera with a natural expression. ` +
    `Her face is clearly visible and well lit. Setting: ${scene}.\nThe person: ${heroine.visual}`
  );
}

export function buildImagePrompt(slide, characters = [], { heroine, hasReference = false, style } = {}) {
  const inFrame = new Set((slide.characters_in_frame || []).map((n) => n.trim().toLowerCase()));
  const cast = characters.filter((c) => inFrame.has(c.name.trim().toLowerCase()));
  if (heroine && inFrame.has(heroine.name.trim().toLowerCase()) && !cast.some((c) => c.name === heroine.name)) {
    cast.unshift({ name: heroine.name, visual: heroine.visual });
  }
  let prompt = `${styleBlock(style)}\n\nScene: ${slide.image_prompt}`;
  if (cast.length) {
    prompt += '\n\nPeople in the frame (keep their look exactly):\n' + cast.map((c) => `- ${c.visual}`).join('\n');
  }
  if (hasReference && heroine) {
    prompt +=
      '\n\nThe attached photo is a reference portrait of the main woman in this scene. ' +
      'Wherever she appears, it must be clearly the same person: same face, hair, skin tone and build. ' +
      'Change only pose, expression, outfit details and setting as the scene requires.';
  }
  return prompt;
}
