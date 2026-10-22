import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useBranding } from '../hooks/useBranding';
import { landingApi } from '../api/landings';
import type { LandingTariff } from '../api/landings';
import { infoApi } from '../api/info';
import { formatPrice } from '../utils/format';
import { cn } from '../lib/utils';

/*
 * Публичная главная в стиле «салфетки»: на салфетке ручкой нарисовано, как
 * работает VPN, тарифы — меню с точками до цены. Тексты короткие и по делу.
 */

const FAQ = ['ruSites', 'devices', 'deviceCount', 'speed', 'history', 'help'] as const;
const STEPS = ['login', 'pay', 'connect'] as const;
const CIRCLE_TILT = [-8, 6, -3];

/** Дуга-стрелка между узлами схемы, нарисованная от руки. */
const HandArrow = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 60 54"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    className="h-[54px] w-[60px] overflow-visible"
    aria-hidden="true"
  >
    <path pathLength={1} className="napkin-draw" d={d} />
  </svg>
);

const NodeIcon = ({ children }: { children: ReactNode }) => (
  <span className="grid h-[54px] w-[54px] place-items-center text-accent-500" aria-hidden="true">
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[46px] w-[46px]"
    >
      {children}
    </svg>
  </span>
);

function pricePerMonth(total: number, days: number): number {
  return Math.round((total / days) * 30);
}

export default function Home() {
  const { t } = useTranslation();
  const { appName, logoLetter, hasCustomLogo, logoUrl } = useBranding();
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [period, setPeriod] = useState<number | null>(null);

  useEffect(() => {
    document.title = appName ? `${appName} — ${t('home.meta.title')}` : t('home.meta.title');
  }, [appName, t]);

  const cabinetHost = import.meta.env.VITE_CABINET_HOST;
  const needsCrossOrigin = Boolean(cabinetHost) && cabinetHost !== window.location.hostname;
  const buildCabinetHref = (path: string) =>
    needsCrossOrigin ? `${window.location.protocol}//${cabinetHost}${path}` : path;

  const CabinetLink = ({
    to,
    children,
    className,
  }: {
    to: string;
    children: ReactNode;
    className: string;
  }) =>
    needsCrossOrigin ? (
      <a href={buildCabinetHref(to)} className={className}>
        {children}
      </a>
    ) : (
      <Link to={to} className={className}>
        {children}
      </Link>
    );

  const { data: landingData } = useQuery({
    queryKey: ['home-landing', 'main'],
    queryFn: () => landingApi.getConfig('main'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const { data: support } = useQuery({
    queryKey: ['support-config'],
    queryFn: infoApi.getSupportConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const tariffs: LandingTariff[] = landingData?.tariffs ?? [];
  const periodTariffs = tariffs.filter((tariff) => !tariff.is_daily && tariff.periods.length);
  const dailyTariffs = tariffs.filter((tariff) => tariff.is_daily);
  const periods = useMemo(
    () =>
      [...new Set(periodTariffs.flatMap((tariff) => tariff.periods.map((p) => p.days)))].sort(
        (a, b) => a - b,
      ),
    [periodTariffs],
  );
  // По умолчанию — самый длинный срок: в нём месяц выходит дешевле всего.
  const activePeriod = period ?? periods[periods.length - 1] ?? null;
  const shortest = periods[0];

  const periodLabel = (days: number) =>
    days % 30 === 0
      ? t('home.napkin.months', { count: days / 30 })
      : t('home.napkin.days', { count: days });

  const supportTg = support?.support_tg_username?.trim();
  const supportTgUrl =
    support?.support_url?.trim() ||
    (supportTg ? `https://telegram.me/${supportTg.replace(/^@/, '')}` : '');
  const supportVk = support?.support_vk_url?.trim();

  return (
    <div className="min-h-[100dvh] text-dark-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b-[1.5px] border-dashed border-dark-700 bg-dark-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 py-3.5 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
          <Link to="/home" className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
              <span
                className={cn(
                  'absolute font-display text-base font-extrabold text-accent-500 transition-opacity duration-200',
                  hasCustomLogo && logoLoaded ? 'opacity-0' : 'opacity-100',
                )}
              >
                {logoLetter}
              </span>
              {hasCustomLogo && logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  className={cn(
                    'absolute h-full w-full object-contain transition-opacity duration-200',
                    logoLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  onLoad={() => setLogoLoaded(true)}
                />
              )}
            </span>
            <span className="font-display text-lg font-extrabold tracking-wide text-dark-100">
              {appName}
            </span>
          </Link>
          <nav className="ml-auto hidden gap-6 text-base font-medium text-dark-400 md:flex">
            <a href="#how" className="hover:text-accent-500">
              {t('home.napkin.navHow')}
            </a>
            <a href="#menu" className="hover:text-accent-500">
              {t('home.napkin.navTariffs')}
            </a>
            <a href="#start" className="hover:text-accent-500">
              {t('home.napkin.navStart')}
            </a>
            <a href="#help" className="hover:text-accent-500">
              {t('home.napkin.navHelp')}
            </a>
          </nav>
          <CabinetLink
            to="/"
            className="napkin-btn !min-h-[44px] !w-auto !px-[18px] !text-base max-md:ml-auto"
          >
            {t('home.header.cabinetShort')}
          </CabinetLink>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="overflow-x-clip">
          <div className="mx-auto grid max-w-6xl gap-0 py-10 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)] md:py-20">
            <div className="relative z-[2] pt-3">
              <h1 className="mb-7 text-[clamp(44px,8.2vw,104px)] font-extrabold leading-[0.96] tracking-[-0.025em] md:-mr-[14%]">
                {t('home.napkin.titleLead')}{' '}
                <span className="font-semibold text-dark-400">{t('home.napkin.titleMid')}</span>{' '}
                <span className="hl hl-swipe">{t('home.napkin.titleAccent')}</span>
              </h1>
              <p className="mb-8 max-w-[30ch] text-[clamp(19px,1.7vw,22px)]">
                {t('home.napkin.lead')}
              </p>
              <div className="flex flex-wrap gap-3.5">
                <CabinetLink to="/" className="napkin-btn !w-auto">
                  {t('home.header.cabinet')}
                </CabinetLink>
                <a href="#menu" className="napkin-btn-line !w-auto">
                  {t('home.napkin.seeTariffs')}
                </a>
              </div>
              <div className="mt-11 flex flex-wrap gap-x-8 gap-y-2.5 border-t-[1.5px] border-dashed border-dark-700 pt-5">
                {(['years', 'devices', 'traffic'] as const).map((key) => (
                  <div key={key}>
                    <b className="block font-hand text-4xl leading-none text-accent-500">
                      {t(`home.napkin.facts.${key}.value`)}
                    </b>
                    <span className="text-[15px] text-dark-400">
                      {t(`home.napkin.facts.${key}.label`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Схема на салфетке */}
            <figure
              id="how"
              className="napkin relative z-[3] m-0 mt-10 rotate-[1.4deg] scroll-mt-24 self-start px-6 pb-5 pt-7 md:mt-6 transition-transform duration-500 hover:rotate-[0.6deg] md:rotate-[2.4deg]"
              aria-label={t('home.napkin.schemeLabel')}
            >
              <ol className="m-0 list-none p-0 px-1.5">
                <li className="grid grid-cols-[54px_1fr] items-center gap-3.5">
                  <NodeIcon>
                    <path
                      pathLength={1}
                      className="napkin-draw"
                      d="M15 6.5c6-.6 12-.4 18 .2 1.6.2 2.4 1.3 2.4 3l-.2 28.6c0 1.7-1 2.6-2.6 2.7-5.8.4-11.7.3-17.4-.1-1.6-.1-2.5-1.1-2.5-2.8l.1-28.7c0-1.6.8-2.8 2.2-2.9Z"
                    />
                    <path pathLength={1} className="napkin-draw" d="M21 35.6c2 .2 4 .1 6-.1" />
                  </NodeIcon>
                  <div className="font-hand text-3xl font-bold leading-none text-accent-500">
                    {t('home.napkin.scheme.you')}
                  </div>
                </li>
                <li className="relative ml-2.5 h-[54px] text-accent-500" aria-hidden="true">
                  <HandArrow d="M18 2c-4 14 4 30 2 48M11 41c3 4 6 7 9 9 2-3 5-7 8-9" />
                  <span className="absolute left-[76px] top-2.5 -rotate-3 whitespace-nowrap font-hand text-[22px] text-dark-100">
                    {t('home.napkin.scheme.encrypted')}
                  </span>
                </li>
                <li className="grid grid-cols-[54px_1fr] items-center gap-3.5">
                  <NodeIcon>
                    <path
                      pathLength={1}
                      className="napkin-draw"
                      d="M8 12c10-.8 21-.9 32-.2.8 5-.1 9.8.2 14.4-10.8.8-21.6.6-32.3-.2-.4-4.6-.5-9.2.1-14Z"
                    />
                    <path
                      pathLength={1}
                      className="napkin-draw"
                      d="M8.4 26.4c-.3 4-.1 8 .2 11.6 10.4.9 21 1 31.4.1.4-3.8.3-7.7 0-11.5M14 19h.1M14 33h.1M21 19h11M21 33h11"
                    />
                  </NodeIcon>
                  <div>
                    <div className="font-hand text-3xl font-bold leading-none text-accent-500">
                      {t('home.napkin.scheme.ru')}
                    </div>
                    <div className="mt-0.5 text-[15px] leading-snug text-dark-400">
                      {t('home.napkin.scheme.ruNote')}
                    </div>
                  </div>
                </li>
                <li className="relative ml-2.5 h-[54px] text-accent-500" aria-hidden="true">
                  <HandArrow d="M21 2c3 15-5 30-1 48M12 42c3 3 5 6 8 8 3-3 5-6 9-8" />
                  <span className="absolute left-[76px] top-2.5 max-w-[190px] -rotate-3 font-hand text-[19px] text-dark-100 sm:max-w-none sm:whitespace-nowrap sm:text-[22px]">
                    {t('home.napkin.scheme.disguise')}
                  </span>
                </li>
                <li className="grid grid-cols-[54px_1fr] items-center gap-3.5">
                  <NodeIcon>
                    <path
                      pathLength={1}
                      className="napkin-draw"
                      d="M24 6c10 .2 18 8.2 18 18.1C41.8 34.3 34 42 24 42 14 41.8 6.2 34 6 24.2 6.1 14 14 6.1 24 6Z"
                    />
                    <path
                      pathLength={1}
                      className="napkin-draw"
                      d="M7 24c11 .6 23 .5 34-.1M24 6.4c-5.6 5.2-7.7 11.6-7.6 17.8.2 6.6 2.8 12.6 7.5 17.6M24 6.4c5.4 5 7.8 11.4 7.7 17.6-.1 6.8-2.6 12.8-7.6 17.8"
                    />
                  </NodeIcon>
                  <div>
                    <div className="font-hand text-3xl font-bold leading-none text-accent-500">
                      {t('home.napkin.scheme.eu')}
                    </div>
                    <div className="mt-0.5 text-[15px] leading-snug text-dark-400">
                      {t('home.napkin.scheme.euNote')}
                    </div>
                  </div>
                </li>
                <li className="relative ml-2.5 h-[54px] text-accent-500" aria-hidden="true">
                  <HandArrow d="M17 2c-2 16 5 31 3 48M11 41c3 4 6 7 9 9 2-3 6-7 9-9" />
                  <span className="absolute left-[76px] top-2.5 max-w-[190px] -rotate-3 font-hand text-[19px] text-dark-100 sm:max-w-none sm:whitespace-nowrap sm:text-[22px]">
                    {t('home.napkin.scheme.exit')}
                  </span>
                </li>
                <li className="grid grid-cols-[54px_1fr] items-center gap-3.5">
                  <NodeIcon>
                    <path
                      pathLength={1}
                      className="napkin-draw"
                      d="M7.5 10.2c11-.9 22.2-.8 33.2-.1.7 9.4.6 18.8-.1 28.2-11 .8-22.1.8-33-.1-.7-9.4-.8-18.8-.1-28Z"
                    />
                    <path
                      pathLength={1}
                      className="napkin-draw"
                      d="M7.6 17.4c11 .5 22 .4 33-.1M12.6 13.8h.1M16.4 13.8h.1M14 25c6.4-.3 12.8-.2 19.2.1M14 31.2c4.2-.2 8.2-.1 12.2.1"
                    />
                  </NodeIcon>
                  <div className="font-hand text-3xl font-bold leading-none text-accent-500">
                    {t('home.napkin.scheme.anySite')}
                  </div>
                </li>
              </ol>
              <figcaption className="mt-4 text-right font-hand text-2xl font-bold text-accent-500">
                — {logoLetter}5
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Частые вопросы */}
        <section className="py-14 md:py-28" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-6xl gap-8 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-24">
            <h2
              id="faq-title"
              className="self-start font-display text-[clamp(32px,5vw,56px)] font-extrabold leading-[1.02] md:sticky md:top-28"
            >
              {t('home.napkin.faqTitle')}
            </h2>
            <dl className="m-0">
              {FAQ.map((key) => (
                <div
                  key={key}
                  className="border-b-[1.5px] border-dashed border-dark-700 py-5 first:pt-0"
                >
                  <dt className="text-xl font-semibold text-dark-50">
                    {t(`home.napkin.faq.${key}.q`)}
                  </dt>
                  <dd className="m-0 mt-1.5 flex flex-wrap items-baseline gap-x-3 text-[17px] text-dark-400">
                    <span className="font-hand text-3xl font-bold leading-none text-accent-500">
                      {t(`home.napkin.faq.${key}.short`)}
                    </span>
                    <span>{t(`home.napkin.faq.${key}.a`)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Тарифы — меню */}
        {tariffs.length > 0 && (
          <section
            id="menu"
            className="scroll-mt-20 border-y-[1.5px] border-dashed border-dark-700 bg-dark-900 py-14 md:py-28"
            aria-labelledby="menu-title"
          >
            <div className="mx-auto max-w-6xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
              <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
                <h2
                  id="menu-title"
                  className="font-display text-[clamp(32px,5vw,56px)] font-extrabold leading-[1.02]"
                >
                  {t('home.pricing.title')}
                </h2>
                {periods.length > 1 && (
                  <div
                    className="inline-flex w-full gap-1 rounded-full border-2 border-dark-100 bg-dark-950 p-1.5 sm:w-auto"
                    role="group"
                    aria-label={t('home.napkin.periodLabel')}
                  >
                    {periods.map((days) => (
                      <button
                        key={days}
                        type="button"
                        aria-pressed={days === activePeriod}
                        onClick={() => setPeriod(days)}
                        className={cn(
                          'flex-1 rounded-full px-4 py-3 text-base font-semibold transition-colors sm:flex-none',
                          days === activePeriod ? 'bg-accent-500 text-on-accent' : 'text-dark-100',
                        )}
                      >
                        {periodLabel(days)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <ul className="m-0 list-none border-t-2 border-dark-100 p-0">
                {periodTariffs.map((tariff) => {
                  const current = tariff.periods.find((p) => p.days === activePeriod);
                  const base = tariff.periods.find((p) => p.days === shortest);
                  if (!current) return null;
                  const perMonth = pricePerMonth(current.price_kopeks, current.days);
                  const save =
                    base && current.days > base.days
                      ? Math.round(
                          (1 -
                            current.price_kopeks /
                              ((base.price_kopeks / base.days) * current.days)) *
                            100,
                        )
                      : 0;
                  return (
                    <li
                      key={tariff.id}
                      className="grid grid-cols-1 gap-x-6 gap-y-1.5 border-b-2 border-dark-100 py-7 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="flex min-w-0 items-baseline gap-3.5">
                        <h3 className="whitespace-nowrap font-display text-[clamp(24px,3.4vw,40px)] font-extrabold">
                          {tariff.name}
                        </h3>
                        <span className="hidden min-w-6 flex-1 -translate-y-2 border-b-[3px] border-dotted border-dark-400 sm:block" />
                      </div>
                      <div className="whitespace-nowrap font-mono text-[clamp(28px,3.4vw,40px)] font-bold tabular-nums">
                        {formatPrice(current.price_kopeks)}
                      </div>
                      <div className="text-base text-dark-400">
                        <b className="font-semibold text-dark-100">
                          {tariff.traffic_limit_gb > 0
                            ? `${tariff.traffic_limit_gb} ${t('home.pricing.gb')}`
                            : t('home.pricing.unlimited')}
                        </b>{' '}
                        {t('home.napkin.perMonth')} ·{' '}
                        <b className="font-semibold text-dark-100">
                          {t('home.pricing.devices', { count: tariff.device_limit })}
                        </b>
                      </div>
                      {save > 0 && (
                        <div className="-rotate-3 whitespace-nowrap font-hand text-2xl text-accent-500 sm:justify-self-end">
                          {t('home.napkin.perMonthSave', { price: formatPrice(perMonth), save })}
                        </div>
                      )}
                    </li>
                  );
                })}
                {dailyTariffs.map((tariff) => (
                  <li
                    key={tariff.id}
                    className="grid grid-cols-1 gap-x-6 gap-y-1.5 border-b-2 border-dark-100 py-7 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="flex min-w-0 items-baseline gap-3.5">
                      <h3 className="whitespace-nowrap font-display text-[clamp(24px,3.4vw,40px)] font-extrabold">
                        {tariff.name}
                      </h3>
                      <span className="hidden min-w-6 flex-1 -translate-y-2 border-b-[3px] border-dotted border-dark-400 sm:block" />
                    </div>
                    <div className="whitespace-nowrap font-mono text-[clamp(28px,3.4vw,40px)] font-bold tabular-nums">
                      {formatPrice(tariff.daily_price_kopeks ?? 0)} {t('home.pricing.perDay')}
                    </div>
                    <div className="text-base text-dark-400">
                      <b className="font-semibold text-dark-100">
                        {tariff.traffic_limit_gb} {t('home.pricing.gb')}
                      </b>{' '}
                      {t('home.napkin.perMonth')} ·{' '}
                      <b className="font-semibold text-dark-100">
                        {t('home.pricing.devices', { count: tariff.device_limit })}
                      </b>
                    </div>
                    <div className="-rotate-3 whitespace-nowrap font-hand text-2xl text-accent-500 sm:justify-self-end">
                      {t('home.napkin.dailyNote')}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 text-base text-dark-400">
                <span>{t('home.napkin.payNote')}</span>
                <CabinetLink to="/subscription/purchase" className="napkin-btn !w-auto">
                  {t('home.napkin.chooseTariff')}
                </CabinetLink>
              </div>
            </div>
          </section>
        )}

        {/* Как подключиться */}
        <section id="start" className="scroll-mt-20 py-14 md:py-28" aria-labelledby="start-title">
          <div className="mx-auto max-w-6xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
            <h2
              id="start-title"
              className="font-display text-[clamp(32px,5vw,56px)] font-extrabold leading-[1.02]"
            >
              {t('home.napkin.startTitle')}
            </h2>
            <ol className="m-0 mt-12 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-14">
              {STEPS.map((key, i) => (
                <li
                  key={key}
                  className={cn('relative pt-[86px]', i === 1 && 'md:mt-12', i === 2 && 'md:mt-24')}
                >
                  <span
                    className="absolute -left-1.5 top-0 h-[70px] w-[76px] text-accent-500"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 76 70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      className="absolute inset-0 h-full w-full"
                    >
                      <ellipse
                        pathLength={1}
                        className="napkin-draw"
                        cx="38"
                        cy="35"
                        rx="33"
                        ry="29"
                        transform={`rotate(${CIRCLE_TILT[i]} 38 35)`}
                      />
                    </svg>
                    <b className="absolute inset-0 grid place-items-center font-hand text-[44px]">
                      {i + 1}
                    </b>
                  </span>
                  <h3 className="mb-2 text-[22px] font-semibold">
                    {t(`home.napkin.steps.${key}.title`)}
                  </h3>
                  <p className="m-0 text-dark-400">{t(`home.napkin.steps.${key}.text`)}</p>
                </li>
              ))}
            </ol>
            <div className="mt-14 flex">
              <CabinetLink to="/" className="napkin-btn !w-auto">
                {t('home.header.cabinet')}
              </CabinetLink>
            </div>
          </div>
        </section>

        {/* Поддержка */}
        {(supportTgUrl || supportVk) && (
          <section id="help" className="scroll-mt-20 pb-14 md:pb-28" aria-labelledby="help-title">
            <div className="mx-auto grid max-w-6xl items-center gap-8 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-16">
              <h2
                id="help-title"
                className="font-display text-[clamp(36px,6.4vw,78px)] font-extrabold leading-[1.02]"
              >
                <span className="hl">{t('nav.support')}</span>
              </h2>
              <div className="grid gap-3.5">
                {supportTgUrl && (
                  <a
                    href={supportTgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 rounded-[16px_12px_18px_14px] border-2 border-dark-100 px-5 py-4 transition-[transform,box-shadow] hover:translate-x-1.5 hover:shadow-[-6px_0_0_rgb(var(--napkin-marker))]"
                  >
                    <span>
                      <small className="block text-sm text-dark-400">Telegram</small>
                      <strong className="text-xl font-semibold">{supportTg || 'Telegram'}</strong>
                    </span>
                    <span className="font-hand text-3xl text-accent-500" aria-hidden="true">
                      →
                    </span>
                  </a>
                )}
                {supportVk && (
                  <a
                    href={supportVk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 rounded-[16px_12px_18px_14px] border-2 border-dark-100 px-5 py-4 transition-[transform,box-shadow] hover:translate-x-1.5 hover:shadow-[-6px_0_0_rgb(var(--napkin-marker))]"
                  >
                    <span className="min-w-0">
                      <small className="block text-sm text-dark-400">{t('home.napkin.vk')}</small>
                      <strong className="block truncate text-xl font-semibold">
                        {supportVk.replace(/^https?:\/\//, '')}
                      </strong>
                    </span>
                    <span className="font-hand text-3xl text-accent-500" aria-hidden="true">
                      →
                    </span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t-[1.5px] border-dashed border-dark-700">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-7 gap-y-3.5 pb-10 pt-7 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] text-[15px] text-dark-400">
          {import.meta.env.VITE_LEGAL_INFO && <span>{import.meta.env.VITE_LEGAL_INFO}</span>}
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/support" className="hover:text-accent-500">
              {t('nav.support')}
            </Link>
            <Link to="/info?tab=rules" className="hover:text-accent-500">
              {t('info.rules')}
            </Link>
            <Link to="/info?tab=privacy" className="hover:text-accent-500">
              {t('info.privacy')}
            </Link>
            <Link to="/info?tab=offer" className="hover:text-accent-500">
              {t('info.offer')}
            </Link>
            <Link to="/info?tab=personal-data" className="hover:text-accent-500">
              {t('info.personalData')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
