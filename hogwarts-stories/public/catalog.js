// The story library. Every heroine is an adult; `visual` and `portraitScene` are English because they feed
// the image model. `trait` is shown on the library card.
export const CATALOG = [
  {
    id: 'old-friend',
    title: 'Несподівана зустріч',
    tagline: 'Шкільна подруга, з якою ви не бачилися сім років, — посеред Хрещатика.',
    setting:
      'Суботній вечір у центрі Києва. Ти поспішаєш крізь натовп на Хрещатику й буквально врізаєшся в Олю — подругу зі шкільних років, з якою ви колись були нерозлучні, а потім роз\'їхалися різними містами. Вона щойно повернулася до Києва.',
    opening: 'Я впізнаю її й пропоную зайти на каву, згадати старі часи',
    heroine: {
      name: 'Оля',
      trait: 'Іронічна',
      portraitScene:
        'on Khreshchatyk street in Kyiv at golden-hour evening, city lights and passers-by softly blurred behind her, holding her film camera, playful half-smile',
      age: 26,
      about: 'Іронічна, смілива, працює фотографинею, щойно повернулася зі Львова. Пам\'ятає про тебе більше, ніж ти думаєш.',
      visual:
        'a 26-year-old Ukrainian woman, slim, shoulder-length wavy chestnut hair, hazel-green eyes, a few light freckles, warm smile; wearing a camel wool coat over a cream knit sweater and a thin gold necklace, a film camera on a strap',
    },
    colors: ['#3a2418', '#c07a4a'],
  },
  {
    id: 'roommate',
    title: 'Вечір, коли вимкнули світло',
    tagline: 'Нова сусідка по квартирі, свічки й цілий вечір удвох.',
    setting:
      'Тиждень тому в другу кімнату твоєї орендованої квартири на Подолі заїхала Марта. Ви ледве встигали перекинутися парою слів. Сьогодні ввечері в усьому будинку вимикають світло на кілька годин, телефони сідають, і ви вперше залишаєтеся вдвох на кухні.',
    opening: 'Я запалюю свічки й пропоную Марті разом приготувати вечерю на газовій плиті',
    heroine: {
      name: 'Марта',
      trait: 'Затишна',
      portraitScene:
        'in a cozy Kyiv apartment kitchen lit only by candles during a power outage, warm flickering light, sitting at the table with a mug of tea, shy smile',
      age: 23,
      about: 'Студентка-архітекторка, спершу здається тихою, але має гострий гумор і любить настільні ігри. Не терпить, коли її недооцінюють.',
      visual:
        'a 23-year-old Ukrainian woman, petite, long straight dark-brown hair often in a loose bun, brown eyes, round tortoiseshell glasses, natural look; wearing an oversized grey hoodie and soft lounge trousers, cozy home setting',
    },
    colors: ['#1d1a2e', '#e0a35a'],
  },
  {
    id: 'night-train',
    title: 'Нічний потяг до Львова',
    tagline: 'Одне купе, незнайомка з книжкою і вісім годин дороги.',
    setting:
      'Нічний інтерсіті з Києва до Львова. У твоєму купе лише одна попутниця — Софія, яка читає книжку й, здається, не дуже хоче говорити. Потяг зупиняється посеред поля через затримку, і світло в купе тьмяніє.',
    opening: 'Я пропоную їй чай із термоса й питаю, що вона читає',
    heroine: {
      name: 'Софія',
      trait: 'Загадкова',
      portraitScene:
        'in a night train compartment, warm reading lamp, dark window with passing lights, an open book in her hands, glancing up with a curious look',
      age: 27,
      about: 'Лікарка-інтерна, втомлена після чергувань, саркастична, але щира. Їде до Львова на важливу для неї зустріч і нервує.',
      visual:
        'a 27-year-old Ukrainian woman, tall, platinum-blonde hair in a sleek low ponytail, light blue eyes, defined cheekbones; wearing a black turtleneck, a long dark trench coat and small silver earrings',
    },
    colors: ['#0f1c2e', '#5f86b8'],
  },
  {
    id: 'colleague',
    title: 'Дедлайн до півночі',
    tagline: 'Нова колега, порожній офіс і реліз, який мав вийти ще вчора.',
    setting:
      'IT-компанія на Лівому березі. Усі вже пішли додому, а ти й Аліна — нова продакт-менеджерка, з якою ви сперечалися на кожній нараді, — мусите доробити реліз до півночі. За вікном світиться нічне місто.',
    opening: 'Я замовляю нам піцу й пропоную перемир\'я до кінця дедлайну',
    heroine: {
      name: 'Аліна',
      trait: 'Запальна',
      portraitScene:
        'in an empty modern office at night, laptop glow and the night city skyline through the window behind her, arms crossed, confident challenging smile',
      age: 25,
      about: 'Амбітна, пряма, звикла все контролювати, але за роботою ховає мрію про власну студію дизайну. Обожнює гострі суперечки.',
      visual:
        'a 25-year-old Ukrainian woman, athletic, long dark wavy hair, dark brown eyes, bold eyebrows, red lipstick; wearing a white button-up shirt with rolled sleeves, black tailored trousers and a smartwatch',
    },
    colors: ['#14141c', '#d14d5a'],
  },
  {
    id: 'first-date',
    title: 'Побачення, що пішло не за планом',
    tagline: 'Метч із застосунку, заброньований ресторан, і все одразу йде шкереберть.',
    setting:
      'Ти вперше зустрічаєшся з Діаною, з якою ви тиждень листувалися в застосунку для знайомств. Біля ресторану на Ярославовій виявляється, що бронь загубили, а з неба починається злива.',
    opening: 'Я сміюся, беру її за руку, і ми біжимо ховатися від зливи в найближчу книгарню',
    heroine: {
      name: 'Діана',
      trait: 'Спонтанна',
      portraitScene:
        'on an old Kyiv street in light rain at dusk, glowing bookstore window behind her, wet curls, laughing',
      age: 24,
      about: 'Весела, спонтанна, вчителька англійської й танцівниця сальси. Любить пригоди й перевіряє людей на почуття гумору.',
      visual:
        'a 24-year-old Ukrainian woman, curvy, voluminous curly auburn hair, green eyes, bright smile with dimples; wearing a dark green midi dress, a denim jacket and white sneakers',
    },
    colors: ['#1c2a1f', '#6fae73'],
  },

  // ---------- Shelf "Манга": original stories in the spirit of popular romance manga with adult leads.
  // Characters, scenes and arcs are our own; `inspiredBy` only names the mood they borrow.
  // `arc` is the story's planned route: the first chapter follows step 1, and after every chapter the
  // reader gets one option along the arc plus a free choice. `style` picks the picture style.
  {
    id: 'secret-otaku',
    shelf: 'manga',
    style: 'realistic',
    inspiredBy: 'Wotakoi: Love is Hard for Otaku',
    title: 'Таємні отаку',
    tagline: 'Найсуворіша колега в офісі — і ти бачиш її в косплеї на фестивалі коміксів.',
    setting:
      'Токіо, рекламна агенція в Сібуї. Ти працюєш тут другий місяць. Юі Сакурада — менеджерка проєктів, яку в офісі бояться за холодний погляд і ідеальні таблиці. У суботу на фестивалі коміксів у Біґ Сайті ти впізнаєш її в косплеї героїні старого фентезі-аніме — і вона тебе теж.',
    opening: 'Сюжет: впізнати Юі на фестивалі й опинитися з нею віч-на-віч',
    arc: [
      'Фестиваль коміксів: ти впізнаєш Юі в косплеї, вона в паніці тягне тебе за стенд.',
      'Угода: вона просить мовчати в офісі, ви обмінюєтеся контактами «для безпеки».',
      'Перший спільний вечір: кооп-гра онлайн до третьої ночі, на ранок обоє заспані на нараді.',
      'Колеги помічають, що ви переглядаєтеся, і починаються чутки.',
      'Юі пропонує «зустрічатися як друзі-гіки» — щоб мати компанію на івенти, нічого серйозного.',
      'Її давній друг-фотограф кличе її на спільну фотосесію, і тебе неприємно колить ревнощі.',
      'Перше справжнє побачення без ігор і аніме — і обоє не знають, про що говорити, поки не сміються з цього.',
      'Чесна розмова на даху офісу: що між вами насправді.',
    ],
    heroine: {
      name: 'Юі',
      age: 26,
      trait: 'Таємна фанатка',
      about: 'На роботі — стримана й точна, вдома — пристрасна фанатка фентезі-аніме, яка шиє косплеї ночами. Найбільше боїться, що колеги дізнаються про її хобі.',
      visual:
        'a 26-year-old Japanese woman, slim, long straight black hair with blunt bangs, dark brown eyes, sharp elegant features; at work wears a navy blazer and white blouse with thin silver glasses',
      portraitScene:
        'at a big comic convention in Tokyo, wearing a tasteful handmade fantasy cosplay (long blue cloak, silver circlet, fully covered), crowd and colorful booths blurred behind her, embarrassed half-smile',
    },
    colors: ['#1b2238', '#5a76c8'],
  },
  {
    id: 'level-99',
    shelf: 'manga',
    style: 'realistic',
    inspiredBy: 'My Love Story with Yamada-kun at Lv999',
    title: 'Рівень 99: кохання офлайн',
    tagline: 'Новачка у твоїй гільдії весь місяць питала поради в чаті. Сьогодні офлайн-зустріч.',
    setting:
      'Токіо. Ти — лідер гільдії в популярній онлайн-RPG, мовчазний гравець 99 рівня. Місяць тому до гільдії вступила новачка під ніком «Akane_Mochi», яка постійно гине в рейдах і засипає тебе питаннями. На офлайн-зустрічі гільдії в кіберкафе в Акіхабарі виявляється, що за ніком — Акане Морі, студентка магістратури, яка грає, щоб відволіктися після важкого року.',
    opening: 'Сюжет: офлайн-зустріч гільдії, де ти вперше бачиш Акане наживо',
    arc: [
      'Офлайн-зустріч гільдії: Акане не впізнає тебе за ніком, поки ти не відповідаєш її ж фразою з чату.',
      'Ти пропонуєш навчити її проходити складний рейд — тренування після пар у кіберкафе.',
      'Перша перемога в рейді: вона радіє так голосно, що на вас оглядається все кафе.',
      'Хтось із гільдії натякає, що ти ніколи нікому так не допомагав.',
      'Ви вперше йдете кудись не грати: нічна прогулянка Акіхабарою й гра в автоматах.',
      'Її колишній з’являється в грі й намагається повернути її в стару гільдію.',
      'Великий турнір гільдій: ви граєте в парі, і все вирішує останній бій.',
      'Після турніру ти нарешті кажеш наживо те, що не наважувався написати в чаті.',
    ],
    heroine: {
      name: 'Акане',
      age: 24,
      trait: 'Щира',
      about: 'Відкрита, емоційна, трохи незграбна, сміється з власних помилок. У грі безстрашна, у житті ніяковіє від компліментів. Вчиться на дизайнерку.',
      visual:
        'a 24-year-old Japanese woman, petite, shoulder-length wavy chestnut-brown hair, big warm brown eyes, round face, expressive; wearing an oversized pastel hoodie, a pleated skirt and gaming headphones around her neck',
      portraitScene:
        'in a cozy Akihabara internet cafe at night, RGB-lit monitors and keyboards blurred behind her, holding a gaming headset, bright excited smile',
    },
    colors: ['#24163a', '#a05cd6'],
  },
  {
    id: 'live-house',
    shelf: 'manga',
    style: 'anime',
    inspiredBy: 'Nana',
    title: 'Пісня для двох',
    tagline: 'Солістка панк-гурту, зламаний підсилювач за десять хвилин до виступу — і ти за пультом.',
    setting:
      'Токіо, маленький лайв-хаус у Сімокітадзаві. Ти — звукорежисер клубу. За десять хвилин до виступу гурту «Black Moth» вигорає підсилювач, а їхня солістка Міо Канзакі, різка й упевнена, дивиться на тебе так, ніби це твоя провина. Зал уже повний.',
    opening: 'Сюжет: врятувати виступ «Black Moth», коли за десять хвилин до початку вигорає підсилювач',
    arc: [
      'Аварія перед виступом: ти рятуєш звук, а Міо співає так, що зал завмирає.',
      'Після концерту вона знаходить тебе на задньому дворі клубу й пропонує нічний рамен «на подяку».',
      'Міо просить записати демо гурту в клубі вночі, поки ніхто не бачить.',
      'Вона показує тобі незакінчену пісню, яку ще нікому не співала.',
      'Продюсер великого лейблу пропонує гурту тур — але тільки з Міо, без решти.',
      'Гітарист гурту ревнує і звинувачує тебе, що ти «забираєш» Міо.',
      'Сніжна ніч на даху клубу: Міо питає, чи варто їй їхати.',
      'Великий фінальний концерт: її пісня, присвячена вам обом.',
    ],
    heroine: {
      name: 'Міо',
      age: 23,
      trait: 'Бунтарка',
      about: 'Різка, горда, з чорним гумором, але неймовірно віддана людям, яких підпускає близько. Пише пісні ночами й ненавидить, коли її жаліють.',
      visual:
        'a 23-year-old Japanese woman, slim, short choppy black hair with a single red streak, sharp dark eyes with smoky eyeliner, small silver ear cuffs; wearing a black leather jacket over a band t-shirt, ripped black jeans and combat boots',
      portraitScene:
        'on the small stage of a Tokyo live house, holding a microphone stand, red and blue stage lights and haze behind her, defiant confident smirk',
    },
    colors: ['#1a0d12', '#c8324a'],
  },
];
