// Prompts and the JSON schema Claude fills in for every chapter of 5 slides.

export const SLIDES_PER_CHAPTER = 5;

export const SYSTEM_PROMPT = `Ти — сценарист інтерактивного коміксу-фанфіку у світі Гаррі Поттера, який читають у форматі сторіс на телефоні.

Історія твориться разом із читачем: після кожних ${SLIDES_PER_CHAPTER} слайдів він пише, що має статися далі, а ти пишеш наступний розділ рівно з ${SLIDES_PER_CHAPTER} слайдів.

Як писати:
- Мова — українська. Імена й назви бери з українського перекладу «А-БА-БА-ГА-ЛА-МА-ГА»: Гаррі Поттер, Герміона Ґрейнджер, Рон Візлі, Албус Дамблдор, Северус Снейп, Драко Мелфой, Геґрід, Гоґвортс, Ґрифіндор, Слизерин, квідич, маґли тощо.
- Розвивай саме те, що попросив читач, навіть якщо це несподіваний поворот. Зберігай характери героїв і логіку світу, зв'язність із попередніми розділами.
- Кожен слайд — один кадр коміксу з чіткою дією. Розділ має власну міні-арку, а останній, ${SLIDES_PER_CHAPTER}-й слайд закінчується інтригою чи вибором, щоб читачеві хотілося вирішити, що буде далі.
- narration — коротка підводка оповідача, до 180 символів. dialogues — 0–2 короткі репліки на слайд, кожна до 110 символів. Пиши живо, з гумором і емоціями, як у добрих коміксах.
- sfx — звукове слово для кадру з дією («БАХ!», «ШУРХ…», «ВЖУХ!»), або порожній рядок.

Ілюстрації малює окрема модель, яка не знає сюжету і не читає українською, тому:
- image_prompt пиши англійською: що відбувається в кадрі, ракурс (close-up, wide shot, low angle…), місце, світло, настрій. Вертикальна композиція.
- Не називай у image_prompt жодних імен персонажів, назв франшизи чи брендів — описуй людей тільки за зовнішністю (наприклад, "the bespectacled boy with messy black hair"). Не проси тексту, літер чи бульбашок із репліками на картинці.
- characters_in_frame — імена (як у characters) усіх, хто видно в кадрі.
- characters — повний актуальний «візуальний паспорт» усіх персонажів, що вже з'являлися: name українською, visual англійською (вік, статура, волосся, очі, одяг, характерні деталі). Зберігай описи з попередніх розділів незмінними, щоб герої виглядали однаково; додавай нових за потреби.

Наостанок дай next_options — 3 короткі (до 60 символів), різні за настроєм ідеї, що могло б статися далі.

Якщо запит читача недоречний для світу чи жорстокий, м'яко поверни історію в безпечне, але цікаве русло, не виходячи з ролі оповідача.`;

export const CHAPTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['story_title', 'chapter_title', 'characters', 'slides', 'next_options'],
  properties: {
    story_title: { type: 'string', description: 'Назва всієї історії. Якщо вона вже є — повтори без змін.' },
    chapter_title: { type: 'string', description: 'Коротка назва цього розділу.' },
    characters: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'visual'],
        properties: {
          name: { type: 'string' },
          visual: { type: 'string' },
        },
      },
    },
    slides: {
      type: 'array',
      description: `Рівно ${SLIDES_PER_CHAPTER} слайдів.`,
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
              properties: {
                speaker: { type: 'string' },
                text: { type: 'string' },
              },
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

// Everything the reader has seen so far, as compact text, plus their new wish.
export function buildUserMessage(story, prompt) {
  const parts = [];
  if (!story || !story.chapters?.length) {
    parts.push('Це початок нової історії.');
  } else {
    parts.push(`Назва історії: «${story.title}».`);
    if (story.characters?.length) {
      parts.push(
        'Візуальні паспорти персонажів (зберігай їх):\n' +
          story.characters.map((c) => `- ${c.name}: ${c.visual}`).join('\n'),
      );
    }
    parts.push('Історія досі:');
    story.chapters.forEach((ch, i) => {
      const lines = [`\n## Розділ ${i + 1}: ${ch.title}`, `Побажання читача: «${ch.prompt}»`];
      ch.slides.forEach((s, j) => {
        lines.push(`Слайд ${j + 1}. ${s.narration}`);
        for (const d of s.dialogues || []) lines.push(`  ${d.speaker}: ${d.text}`);
      });
      parts.push(lines.join('\n'));
    });
  }
  parts.push(
    `\nЧитач хоче, щоб далі сталося ось що:\n«${prompt}»\n\nНапиши розділ ${(story?.chapters?.length || 0) + 1} — рівно ${SLIDES_PER_CHAPTER} слайдів.`,
  );
  return parts.join('\n\n');
}

export const IMAGE_STYLE =
  'Vertical comic book panel, 2:3 portrait. Rich hand-inked lines with painterly watercolor shading, ' +
  'cinematic lighting, magical warm-and-moody palette, expressive faces, detailed background of a ' +
  'gothic wizarding castle world. Original character designs. Absolutely no text, letters, captions, ' +
  'logos or speech bubbles in the image.';

export function buildImagePrompt(slide, characters = []) {
  const inFrame = new Set((slide.characters_in_frame || []).map((n) => n.trim().toLowerCase()));
  const cast = characters.filter((c) => inFrame.has(c.name.trim().toLowerCase()));
  let prompt = `${IMAGE_STYLE}\n\nScene: ${slide.image_prompt}`;
  if (cast.length) {
    prompt += '\n\nCharacters in this panel (keep their look exactly):\n' + cast.map((c) => `- ${c.visual}`).join('\n');
  }
  return prompt;
}
