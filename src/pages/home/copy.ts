/**
 * Landing copy — RU + EN. The rest of the cabinet is Russian-only (the fork
 * dropped the other locales), but the public landing is what reviewers,
 * partners and non-Russian users see first, so it carries its own dictionary.
 *
 * Every technical claim here is taken from the protocol source:
 * github.com/Fedarisha/Xray-core-fedarisha (proxy/fedarisha/transport/*.go).
 */

export type LandingLang = 'ru' | 'en';

export interface LandingCopy {
  meta: { title: string; description: string };
  nav: { protocol: string; pricing: string; apps: string; faq: string; about: string };
  header: { cabinet: string; cabinetShort: string; langLabel: string };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    sourceLink: string;
  };
  relay: {
    you: string;
    bucket: string;
    bucketPath: string;
    server: string;
    caption: string;
    logTitle: string;
  };
  proof: string[];
  protocol: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: { seq: string; title: string; text: string }[];
    dpiTitle: string;
    dpiLines: string[];
    dpiNote: string;
    realTitle: string;
    realLines: string[];
    tradeoff: string;
    github: string;
  };
  features: {
    eyebrow: string;
    title: string;
    items: { key: string; title: string; text: string }[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    unlimited: string;
    gb: string;
    perMonthTraffic: string;
    devices: (count: number) => string;
    from: string;
    daily: string;
    perDay: string;
    perMonth: string;
    select: string;
    cta: string;
    fallbackTitle: string;
    fallbackText: string;
    fallbackCta: string;
  };
  apps: {
    eyebrow: string;
    title: string;
    intro: string;
    fedarishaClients: string;
    windows: string;
    android: string;
    others: string;
    othersText: string;
    viaCabinet: string;
    source: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: { q: string; a: string }[];
  };
  about: {
    eyebrow: string;
    title: string;
    text: string;
    founded: string;
    foundedValue: string;
    code: string;
    codeValue: string;
    contactsTitle: string;
    telegram: string;
    email: string;
    github: string;
    support: string;
  };
  cta: { title: string; subtitle: string; primary: string; secondary: string };
  footer: {
    support: string;
    rules: string;
    privacy: string;
    offer: string;
    personalData: string;
    rights: string;
  };
}

const pluralRu = (n: number, one: string, few: string, many: string) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

const ru: LandingCopy = {
  meta: {
    title: 'САЛФЕТКА5 — VPN с открытым протоколом Fedarisha',
    description:
      'VPN-сервис с собственным открытым протоколом Fedarisha: трафик шифруется и передаётся как файлы через S3-совместимое облако, поэтому для провайдера это обычная работа с хранилищем.',
  },
  nav: {
    protocol: 'Протокол',
    pricing: 'Тарифы',
    apps: 'Приложения',
    faq: 'Вопросы',
    about: 'О сервисе',
  },
  header: { cabinet: 'Личный кабинет', cabinetShort: 'Войти', langLabel: 'Язык' },
  hero: {
    eyebrow: 'Fedarisha · открытый транспорт',
    title: 'VPN, который выглядит как обычное облачное хранилище.',
    subtitle:
      'САЛФЕТКА5 — VPN-сервис с собственным протоколом Fedarisha. Ваш трафик шифруется и передаётся маленькими файлами через S3-совместимое облако, поэтому со стороны это просто работа с диском, а не VPN.',
    ctaPrimary: 'Открыть кабинет',
    ctaSecondary: 'Как это работает',
    sourceLink: 'Исходный код протокола на GitHub',
  },
  relay: {
    you: 'Вы',
    bucket: 'S3-хранилище',
    bucketPath: 'sessions/7f3a9c…/',
    server: 'Сервер',
    caption:
      'Каждый кадр трафика — отдельный файл. Он живёт в хранилище около 30 секунд и удаляется после прочтения.',
    logTitle: 'что видит провайдер',
  },
  proof: [
    'X25519 + AES-256-GCM',
    'S3-совместимые облака',
    'Открытый код',
    'Windows · macOS · Linux · iOS · Android',
    'Без логов трафика',
  ],
  protocol: {
    eyebrow: 'Протокол',
    title: 'Как работает Fedarisha',
    intro:
      'Обычный VPN-трафик провайдер узнаёт по сигнатуре и блокирует. Fedarisha прячет туннель в самое будничное действие в интернете — чтение и запись файлов в облачное хранилище.',
    steps: [
      {
        seq: 'c_00000001',
        title: 'Упаковка',
        text: 'Клиент договаривается с сервером о ключе (X25519 → HKDF-SHA256), шифрует ваш трафик AES-256-GCM, при необходимости сжимает и режет на файлы до 2 МБ.',
      },
      {
        seq: 'c_00000002',
        title: 'Запись в облако',
        text: 'Файлы кладутся в папку сессии в S3-совместимом хранилище обычными PUT-запросами по HTTPS. Снаружи это неотличимо от синхронизации документов.',
      },
      {
        seq: 'c_00000003',
        title: 'Чтение и вывод в сеть',
        text: 'Сервер забирает файлы по порядковым номерам, расшифровывает и отправляет трафик в интернет. Ответ возвращается тем же путём — файлами с префиксом s_.',
      },
    ],
    dpiTitle: 'Что видит провайдер',
    dpiLines: [
      'PUT  sessions/7f3a9c…/c_0000002a   200',
      'GET  sessions/7f3a9c…/s_0000002b   200',
      'PUT  sessions/7f3a9c…/c_0000002c   200',
    ],
    dpiNote:
      'HTTPS-запросы к публичному облаку. Чтобы их отрезать, придётся заблокировать всё облако целиком.',
    realTitle: 'Что происходит на самом деле',
    realLines: [
      'Зашифрованные кадры вашего трафика',
      'Ключ есть только у вас и у сервера',
      'Файлы стираются через ~30 секунд',
    ],
    tradeoff:
      'Цена маскировки — задержка 50–250 мс и стоимость запросов к хранилищу. Поэтому в САЛФЕТКА5 Fedarisha дополняет быстрые протоколы (VLESS, Reality), а не заменяет их: обычный режим — для скорости, Fedarisha — когда остальное заблокировано.',
    github: 'Смотреть код транспорта',
  },
  features: {
    eyebrow: 'Почему САЛФЕТКА5',
    title: 'Что вы получаете',
    items: [
      {
        key: 'protocol',
        title: 'Собственный протокол',
        text: 'Fedarisha написан нами и опубликован с открытым кодом. Любой может проверить, что внутри, и собрать ядро сам.',
      },
      {
        key: 'crypto',
        title: 'Сквозное шифрование',
        text: 'Обмен ключами X25519, вывод ключа HKDF-SHA256, шифрование AES-256-GCM. Ключ сессии не покидает ваше устройство и сервер.',
      },
      {
        key: 'speed',
        title: 'Быстрые протоколы для каждого дня',
        text: 'VLESS и Reality для видео, звонков и игр — с минимальными задержками, пока их не режут.',
      },
      {
        key: 'devices',
        title: 'Все устройства',
        text: 'Windows, macOS, Linux, iOS и Android. Несколько устройств на одной подписке — лимит зависит от тарифа.',
      },
      {
        key: 'nologs',
        title: 'Без логов трафика',
        text: 'Мы не храним историю посещений и не передаём данные третьим лицам. Что именно храним — в политике конфиденциальности.',
      },
      {
        key: 'support',
        title: 'Живая поддержка',
        text: 'Отвечаем в Telegram и ВКонтакте, помогаем с настройкой и переносом подписки между устройствами.',
      },
    ],
  },
  pricing: {
    eyebrow: 'Тарифы',
    title: 'Подписка',
    subtitle: 'Выберите объём трафика и число устройств под свои задачи.',
    unlimited: 'Безлимит',
    gb: 'ГБ',
    perMonthTraffic: 'в месяц',
    devices: (n) => `${n} ${pluralRu(n, 'устройство', 'устройства', 'устройств')}`,
    from: 'от',
    daily: 'Суточный',
    perDay: '/ день',
    perMonth: '/ мес',
    select: 'Выбрать',
    cta: 'Все тарифы',
    fallbackTitle: 'Тарифы и оплата — в личном кабинете',
    fallbackText:
      'Войдите в кабинет, выберите тариф, срок и способ оплаты. Подписка активируется сразу после оплаты.',
    fallbackCta: 'Перейти к тарифам',
  },
  apps: {
    eyebrow: 'Приложения',
    title: 'Чем подключаться',
    intro:
      'Для Fedarisha нужен клиент со встроенным ядром протокола — мы собираем такие версии популярных приложений и публикуем их код.',
    fedarishaClients: 'Клиенты с Fedarisha',
    windows: 'Windows — сборка v2rayN',
    android: 'Android — сборка v2rayNG',
    others: 'macOS, iOS, Linux',
    othersText:
      'Для обычных протоколов (VLESS, Reality) подойдут стандартные клиенты. Ссылки на приложения и пошаговые инструкции открываются в кабинете после входа.',
    viaCabinet: 'Инструкции в кабинете',
    source: 'Код',
  },
  faq: {
    eyebrow: 'Вопросы',
    title: 'Частые вопросы',
    items: [
      {
        q: 'Что такое Fedarisha?',
        a: 'Транспорт для VPN, встроенный в наш форк Xray-core. Вместо прямого соединения с сервером клиент и сервер обмениваются зашифрованными файлами через общее S3-совместимое хранилище. Для наблюдателя это выглядит как работа с облачным диском.',
      },
      {
        q: 'Почему не просто VLESS или Reality?',
        a: 'Они быстрее, и мы используем их в обычном режиме. Но их можно заблокировать по сигнатуре или отрезать по адресам серверов. Fedarisha остаётся, когда доступны только крупные публичные облака.',
      },
      {
        q: 'Почему «Салфетка»?',
        a: 'Каждый кадр трафика — маленький одноразовый листок: файл записывается в облако, читается второй стороной и удаляется примерно через 30 секунд.',
      },
      {
        q: 'Какие данные вы храните?',
        a: 'Данные для входа (почта или Telegram ID) и историю платежей у платёжных провайдеров. Историю посещений и содержимое трафика мы не логируем. Подробности — в политике конфиденциальности.',
      },
      {
        q: 'Сколько устройств можно подключить?',
        a: 'Зависит от тарифа: лимит устройств и объём трафика указаны у каждого тарифа в кабинете.',
      },
      {
        q: 'Код действительно открыт?',
        a: 'Да. Форк Xray-core с транспортом Fedarisha, панель и сборки клиентов опубликованы в организации Fedarisha на GitHub.',
      },
    ],
  },
  about: {
    eyebrow: 'О сервисе',
    title: 'Кто мы',
    text: 'САЛФЕТКА5 — независимый VPN-сервис, запущенный в 2026 году. Мы разрабатываем протокол Fedarisha и всё вокруг него: ядро, панель управления, клиенты и этот кабинет.',
    founded: 'Запуск',
    foundedValue: '2026',
    code: 'Код',
    codeValue: 'открытый',
    contactsTitle: 'Контакты',
    telegram: 'Telegram-бот',
    email: 'Почта',
    github: 'GitHub',
    support: 'Поддержка',
  },
  cta: {
    title: 'Готовы попробовать?',
    subtitle: 'Войдите в кабинет, выберите тариф и подключитесь за пару минут.',
    primary: 'Открыть кабинет',
    secondary: 'Написать в поддержку',
  },
  footer: {
    support: 'Поддержка',
    rules: 'Правила',
    privacy: 'Конфиденциальность',
    offer: 'Оферта',
    personalData: 'Персональные данные',
    rights: 'Все права защищены',
  },
};

const en: LandingCopy = {
  meta: {
    title: 'SALFETKA5 — VPN with the open-source Fedarisha protocol',
    description:
      'A VPN service built on our own open-source protocol, Fedarisha: traffic is encrypted and relayed as small files through S3-compatible cloud storage, so to the network it looks like ordinary storage activity.',
  },
  nav: { protocol: 'Protocol', pricing: 'Pricing', apps: 'Apps', faq: 'FAQ', about: 'About' },
  header: { cabinet: 'Open cabinet', cabinetShort: 'Sign in', langLabel: 'Language' },
  hero: {
    eyebrow: 'Fedarisha · open-source transport',
    title: 'A VPN that looks like ordinary cloud storage.',
    subtitle:
      'SALFETKA5 is a VPN service built on our own protocol, Fedarisha. Your traffic is encrypted and relayed as small files through S3-compatible cloud storage — so from the outside it is file syncing, not a VPN.',
    ctaPrimary: 'Open cabinet',
    ctaSecondary: 'How it works',
    sourceLink: 'Protocol source on GitHub',
  },
  relay: {
    you: 'You',
    bucket: 'S3 bucket',
    bucketPath: 'sessions/7f3a9c…/',
    server: 'Server',
    caption:
      'Every frame of traffic is a separate file. It lives in the bucket for about 30 seconds and is deleted once read.',
    logTitle: 'what the network sees',
  },
  proof: [
    'X25519 + AES-256-GCM',
    'S3-compatible clouds',
    'Open source',
    'Windows · macOS · Linux · iOS · Android',
    'No traffic logs',
  ],
  protocol: {
    eyebrow: 'Protocol',
    title: 'How Fedarisha works',
    intro:
      'Regular VPN traffic has a signature that a network operator can detect and block. Fedarisha hides the tunnel inside the most mundane thing on the internet — reading and writing files in cloud storage.',
    steps: [
      {
        seq: 'c_00000001',
        title: 'Pack',
        text: 'The client agrees on a key with the server (X25519 → HKDF-SHA256), encrypts your traffic with AES-256-GCM, compresses it when useful and splits it into files of up to 2 MB.',
      },
      {
        seq: 'c_00000002',
        title: 'Write to the cloud',
        text: 'Files are written into a session folder in an S3-compatible bucket with plain HTTPS PUT requests. Externally this is indistinguishable from syncing documents.',
      },
      {
        seq: 'c_00000003',
        title: 'Read and forward',
        text: 'The server fetches files in sequence order, decrypts them and forwards your traffic to the internet. Replies travel back the same way as files prefixed s_.',
      },
    ],
    dpiTitle: 'What the network sees',
    dpiLines: [
      'PUT  sessions/7f3a9c…/c_0000002a   200',
      'GET  sessions/7f3a9c…/s_0000002b   200',
      'PUT  sessions/7f3a9c…/c_0000002c   200',
    ],
    dpiNote:
      'HTTPS requests to a public cloud. Cutting them off means blocking the entire cloud provider.',
    realTitle: 'What is actually happening',
    realLines: [
      'Encrypted frames of your traffic',
      'Only you and the server hold the key',
      'Files are wiped after ~30 seconds',
    ],
    tradeoff:
      'The cost of the disguise is 50–250 ms of added latency and storage request fees. That is why SALFETKA5 uses Fedarisha alongside fast protocols (VLESS, Reality) rather than instead of them: the normal mode for speed, Fedarisha for when everything else is blocked.',
    github: 'Read the transport code',
  },
  features: {
    eyebrow: 'Why SALFETKA5',
    title: 'What you get',
    items: [
      {
        key: 'protocol',
        title: 'Our own protocol',
        text: 'Fedarisha is written by us and published as open source. Anyone can inspect it and build the core themselves.',
      },
      {
        key: 'crypto',
        title: 'End-to-end encryption',
        text: 'X25519 key exchange, HKDF-SHA256 key derivation, AES-256-GCM encryption. The session key never leaves your device and the server.',
      },
      {
        key: 'speed',
        title: 'Fast protocols for everyday use',
        text: 'VLESS and Reality for video, calls and gaming with minimal latency — for as long as they stay unblocked.',
      },
      {
        key: 'devices',
        title: 'Every device',
        text: 'Windows, macOS, Linux, iOS and Android. Several devices on one subscription — the limit depends on the plan.',
      },
      {
        key: 'nologs',
        title: 'No traffic logs',
        text: 'We do not keep browsing history and do not share data with third parties. What we do store is listed in the privacy policy.',
      },
      {
        key: 'support',
        title: 'Real support',
        text: 'We answer on Telegram and VK, help with setup and with moving a subscription between devices.',
      },
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Plans',
    subtitle: 'Pick the traffic volume and number of devices that fit you.',
    unlimited: 'Unlimited',
    gb: 'GB',
    perMonthTraffic: 'per month',
    devices: (n) => `${n} ${n === 1 ? 'device' : 'devices'}`,
    from: 'from',
    daily: 'Daily',
    perDay: '/ day',
    perMonth: '/ mo',
    select: 'Choose',
    cta: 'All plans',
    fallbackTitle: 'Plans and payment live in the cabinet',
    fallbackText:
      'Sign in, pick a plan, a period and a payment method. The subscription activates right after payment.',
    fallbackCta: 'See plans',
  },
  apps: {
    eyebrow: 'Apps',
    title: 'How to connect',
    intro:
      'Fedarisha needs a client with the protocol core built in — we ship such builds of popular apps and publish their source.',
    fedarishaClients: 'Clients with Fedarisha',
    windows: 'Windows — v2rayN build',
    android: 'Android — v2rayNG build',
    others: 'macOS, iOS, Linux',
    othersText:
      'Standard clients work for the regular protocols (VLESS, Reality). App links and step-by-step guides open in the cabinet after sign-in.',
    viaCabinet: 'Guides in the cabinet',
    source: 'Source',
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Common questions',
    items: [
      {
        q: 'What is Fedarisha?',
        a: 'A VPN transport built into our fork of Xray-core. Instead of a direct connection, the client and the server exchange encrypted files through a shared S3-compatible bucket. To an observer it looks like cloud drive activity.',
      },
      {
        q: 'Why not just VLESS or Reality?',
        a: 'They are faster, and we use them in the normal mode. But they can be blocked by signature or by server address. Fedarisha keeps working when only the big public clouds remain reachable.',
      },
      {
        q: 'Why “Salfetka” (napkin)?',
        a: 'Every frame of traffic is a small disposable sheet: a file is written to the cloud, read by the other side and deleted roughly 30 seconds later.',
      },
      {
        q: 'What data do you keep?',
        a: 'Sign-in details (email or Telegram ID) and payment history held by payment providers. We do not log browsing history or traffic contents. Details are in the privacy policy.',
      },
      {
        q: 'How many devices can I connect?',
        a: 'It depends on the plan: the device limit and traffic volume are listed next to each plan in the cabinet.',
      },
      {
        q: 'Is the code really open?',
        a: 'Yes. The Xray-core fork with the Fedarisha transport, the control panel and the client builds are published under the Fedarisha organisation on GitHub.',
      },
    ],
  },
  about: {
    eyebrow: 'About',
    title: 'Who we are',
    text: 'SALFETKA5 is an independent VPN service launched in 2026. We build the Fedarisha protocol and everything around it: the core, the control panel, the clients and this cabinet.',
    founded: 'Launched',
    foundedValue: '2026',
    code: 'Code',
    codeValue: 'open source',
    contactsTitle: 'Contacts',
    telegram: 'Telegram bot',
    email: 'Email',
    github: 'GitHub',
    support: 'Support',
  },
  cta: {
    title: 'Ready to try?',
    subtitle: 'Sign in, pick a plan and connect in a couple of minutes.',
    primary: 'Open cabinet',
    secondary: 'Contact support',
  },
  footer: {
    support: 'Support',
    rules: 'Terms',
    privacy: 'Privacy',
    offer: 'Offer',
    personalData: 'Personal data',
    rights: 'All rights reserved',
  },
};

export const LANDING_COPY: Record<LandingLang, LandingCopy> = { ru, en };

/** Public repositories referenced from the landing. */
export const FEDARISHA_LINKS = {
  org: 'https://github.com/Fedarisha',
  core: 'https://github.com/Fedarisha/Xray-core-fedarisha',
  transport: 'https://github.com/Fedarisha/Xray-core-fedarisha/tree/main/proxy/fedarisha',
  v2rayN: 'https://github.com/voltara13/v2rayN',
  v2rayNG: 'https://github.com/voltara13/v2rayNG',
} as const;
