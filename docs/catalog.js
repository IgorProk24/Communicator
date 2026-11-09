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
];
