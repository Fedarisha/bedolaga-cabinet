import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  PiAndroidLogo,
  PiArrowRight,
  PiArrowUpRight,
  PiCaretDown,
  PiChatCircleDots,
  PiCheck,
  PiCode,
  PiDevices,
  PiEnvelopeSimple,
  PiEyeSlash,
  PiGithubLogo,
  PiLightning,
  PiLockKey,
  PiTelegramLogo,
  PiWindowsLogo,
} from 'react-icons/pi';
import { useBranding } from '../../hooks/useBranding';
import { landingApi, type LandingTariff } from '../../api/landings';
import { formatPrice } from '../../utils/format';
import { FEDARISHA_LINKS } from './copy';
import { useLandingLang } from './useLandingLang';
import RelayDiagram from './RelayDiagram';
import './landing.css';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function useCabinetHref() {
  const cabinetHost = import.meta.env.VITE_CABINET_HOST;
  const cross = Boolean(cabinetHost) && cabinetHost !== window.location.hostname;
  const href = (path: string) =>
    cross ? `${window.location.protocol}//${cabinetHost}${path}` : path;
  return { cross, href };
}

function CabinetLink({
  to,
  className,
  children,
  ariaLabel,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const { cross, href } = useCabinetHref();
  return cross ? (
    <a href={href(to)} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ) : (
    <Link to={to} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/**
 * Section wrapper. Deliberately no scroll-reveal: full-page screenshot tools
 * (including the ones reviewers use) never scroll, and a landing whose lower
 * half is invisible to them defeats the purpose of the page.
 */
function Reveal({
  id,
  className = '',
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-accent-400">
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: 'left' | 'center';
}) {
  const centered = align === 'center';
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-dark-50 sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-4 text-base leading-relaxed text-dark-300 sm:text-lg">{intro}</p>}
    </div>
  );
}

const FEATURE_ICONS: Record<string, ReactNode> = {
  protocol: <PiCode className="h-6 w-6" />,
  crypto: <PiLockKey className="h-6 w-6" />,
  speed: <PiLightning className="h-6 w-6" />,
  devices: <PiDevices className="h-6 w-6" />,
  nologs: <PiEyeSlash className="h-6 w-6" />,
  support: <PiChatCircleDots className="h-6 w-6" />,
};

function cheapestMonthly(tariff: LandingTariff): number | null {
  if (tariff.is_daily) return tariff.daily_price_kopeks ?? null;
  const priced = tariff.periods.filter((p) => p.days > 0);
  if (!priced.length) return null;
  // Cheapest effective price per 30 days — a yearly plan is cheaper per month
  // than a monthly one, and the "from" price should say so.
  return Math.min(...priced.map((p) => Math.round((p.price_kopeks / p.days) * 30)));
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const { lang, copy, setLang } = useLandingLang();
  const { appName, logoLetter, hasCustomLogo, logoUrl } = useBranding();
  const [logoLoaded, setLogoLoaded] = useState(false);

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;
  const legalInfo = import.meta.env.VITE_LEGAL_INFO;

  useEffect(() => {
    document.title = copy.meta.title;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previous = meta?.getAttribute('content') ?? null;
    meta?.setAttribute('content', copy.meta.description);
    return () => {
      if (meta && previous !== null) meta.setAttribute('content', previous);
    };
  }, [copy]);

  const { data: landingData } = useQuery({
    queryKey: ['home-landing', 'main'],
    queryFn: () => landingApi.getConfig('main'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const tariffs: LandingTariff[] = landingData?.tariffs ?? [];

  const nav: { id: string; label: string }[] = [
    { id: 'protocol', label: copy.nav.protocol },
    { id: 'pricing', label: copy.nav.pricing },
    { id: 'apps', label: copy.nav.apps },
    { id: 'faq', label: copy.nav.faq },
    { id: 'about', label: copy.nav.about },
  ];

  return (
    <div className="fed-landing relative min-h-[100dvh] bg-dark-950 text-dark-100" lang={lang}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-dark-800/60 bg-dark-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/home" className="flex shrink-0 items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-dark-700/60 bg-dark-800/80">
              <span
                className={`absolute text-base font-bold text-accent-400 transition-opacity duration-200 ${
                  hasCustomLogo && logoLoaded ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {logoLetter}
              </span>
              {hasCustomLogo && logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  className={`absolute h-full w-full object-contain transition-opacity duration-200 ${
                    logoLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setLogoLoaded(true)}
                />
              )}
            </div>
            <span className="font-display text-base font-semibold tracking-tight text-dark-50">
              {appName}
            </span>
          </Link>

          <nav
            className="hidden items-center gap-6 text-sm text-dark-300 md:flex"
            aria-label="Sections"
          >
            {nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="transition-colors hover:text-dark-50"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              role="group"
              aria-label={copy.header.langLabel}
              className="flex rounded-lg border border-dark-700/60 bg-dark-900/70 p-0.5 font-mono text-[11px]"
            >
              {(['ru', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`rounded-md px-2 py-1 transition-colors ${
                    lang === l ? 'bg-dark-700 text-dark-50' : 'text-dark-400 hover:text-dark-200'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <CabinetLink to="/" className="btn-primary hidden h-9 px-4 text-sm sm:inline-flex">
              {copy.header.cabinet}
              <PiArrowRight className="h-4 w-4" />
            </CabinetLink>
            <CabinetLink
              to="/"
              className="btn-primary inline-flex h-9 px-3 text-sm sm:hidden"
              ariaLabel={copy.header.cabinet}
            >
              {copy.header.cabinetShort}
            </CabinetLink>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="relative pt-14 sm:pt-20 lg:pt-24">
          <div className="fed-grid pointer-events-none absolute inset-x-0 -top-16 bottom-0 -z-0" />
          <div className="relative">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="fed-sheet" aria-hidden="true">
                  <span>c_hello</span>
                </span>
                <Eyebrow>{copy.hero.eyebrow}</Eyebrow>
              </div>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.06] tracking-tight text-dark-50 sm:text-5xl lg:text-[3.75rem]">
                {copy.hero.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-dark-300 sm:text-lg">
                {copy.hero.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <CabinetLink to="/" className="btn-primary h-11 px-6 text-sm">
                  {copy.hero.ctaPrimary}
                  <PiArrowRight className="h-4 w-4" />
                </CabinetLink>
                <a href="#protocol" className="btn-secondary h-11 px-6 text-sm">
                  {copy.hero.ctaSecondary}
                </a>
              </div>
              <ExternalLink
                href={FEDARISHA_LINKS.transport}
                className="mt-6 inline-flex items-center gap-2 font-mono text-xs text-dark-400 transition-colors hover:text-dark-100"
              >
                <PiGithubLogo className="h-4 w-4" />
                {copy.hero.sourceLink}
                <PiArrowUpRight className="h-3.5 w-3.5" />
              </ExternalLink>
            </div>

            {/* The thesis, drawn: one frame of traffic = one file in a bucket. */}
            <div className="mt-12 sm:mt-14">
              <RelayDiagram copy={copy.relay} />
            </div>
          </div>

          {/* Proof strip */}
          <ul className="mt-14 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-dark-800/60 py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-dark-400 sm:mt-16">
            {copy.proof.map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500/80" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Protocol */}
        <Reveal id="protocol" className="mt-24 sm:mt-32">
          <SectionHeading
            eyebrow={copy.protocol.eyebrow}
            title={copy.protocol.title}
            intro={copy.protocol.intro}
          />

          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {copy.protocol.steps.map((step) => (
              <li key={step.seq} className="card flex flex-col">
                <span className="fed-sheet self-start" aria-hidden="true">
                  <span>{step.seq}</span>
                </span>
                <h3 className="mt-4 text-lg font-semibold text-dark-50">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dark-400">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="card mt-4 grid gap-8 p-6 sm:p-8 md:grid-cols-2">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-dark-500">
                {copy.protocol.dpiTitle}
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-dark-800/80 bg-dark-950/80 p-4 font-mono text-[12px] leading-6 text-dark-300">
                {copy.protocol.dpiLines.map((line) => {
                  const status = line.slice(-3);
                  return (
                    <span key={line} className="block">
                      {line.slice(0, -3)}
                      <span className="text-success-400">{status}</span>
                    </span>
                  );
                })}
              </pre>
              <p className="mt-3 text-sm leading-relaxed text-dark-400">{copy.protocol.dpiNote}</p>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-dark-500">
                {copy.protocol.realTitle}
              </div>
              <ul className="mt-3 space-y-3">
                {copy.protocol.realLines.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-3 text-sm text-dark-200 sm:text-base"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500/10 ring-1 ring-accent-500/25">
                      <PiCheck className="h-3.5 w-3.5 text-accent-400" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-dark-400">{copy.protocol.tradeoff}</p>
              <ExternalLink
                href={FEDARISHA_LINKS.transport}
                className="btn-secondary mt-6 h-10 px-4 text-sm"
              >
                <PiGithubLogo className="h-4 w-4" />
                {copy.protocol.github}
              </ExternalLink>
            </div>
          </div>
        </Reveal>

        {/* Features */}
        <Reveal className="mt-24 sm:mt-32">
          <SectionHeading eyebrow={copy.features.eyebrow} title={copy.features.title} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.features.items.map((item) => (
              <div key={item.key} className="card transition-colors hover:border-accent-500/30">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400 ring-1 ring-accent-500/20">
                  {FEATURE_ICONS[item.key]}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-dark-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dark-400">{item.text}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Pricing */}
        <Reveal id="pricing" className="mt-24 sm:mt-32">
          {tariffs.length > 0 ? (
            <>
              <SectionHeading
                eyebrow={copy.pricing.eyebrow}
                title={copy.pricing.title}
                intro={copy.pricing.subtitle}
              />
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tariffs.map((tariff) => {
                  const price = cheapestMonthly(tariff);
                  return (
                    <CabinetLink
                      key={tariff.id}
                      to="/buy/main"
                      className="card group flex flex-col transition-colors hover:border-accent-500/30"
                    >
                      <h3 className="text-lg font-semibold text-dark-50">{tariff.name}</h3>
                      {tariff.description && (
                        <p className="mt-1 text-sm text-dark-400">{tariff.description}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-dark-400">
                        <span>
                          {tariff.traffic_limit_gb === 0
                            ? copy.pricing.unlimited
                            : `${tariff.traffic_limit_gb} ${copy.pricing.gb} ${copy.pricing.perMonthTraffic}`}
                        </span>
                        <span>{copy.pricing.devices(tariff.device_limit)}</span>
                      </div>
                      {price != null && (
                        <div className="mt-6 border-t border-dark-800/60 pt-4">
                          <div className="text-xs text-dark-500">
                            {tariff.is_daily ? copy.pricing.daily : copy.pricing.from}
                          </div>
                          <div className="mt-1 flex items-baseline gap-1 font-display text-3xl font-bold text-dark-50">
                            {formatPrice(price)}
                            <span className="text-base font-normal text-dark-400">
                              {tariff.is_daily ? copy.pricing.perDay : copy.pricing.perMonth}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-400">
                        {copy.pricing.select}
                        <PiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </CabinetLink>
                  );
                })}
              </div>
              <div className="mt-10">
                <CabinetLink to="/buy/main" className="btn-primary h-11 px-6 text-sm">
                  {copy.pricing.cta}
                  <PiArrowRight className="h-4 w-4" />
                </CabinetLink>
              </div>
            </>
          ) : (
            <div className="card grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Eyebrow>{copy.pricing.eyebrow}</Eyebrow>
                <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-dark-50 sm:text-3xl">
                  {copy.pricing.fallbackTitle}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-dark-400 sm:text-base">
                  {copy.pricing.fallbackText}
                </p>
              </div>
              <CabinetLink to="/" className="btn-primary h-11 px-6 text-sm">
                {copy.pricing.fallbackCta}
                <PiArrowRight className="h-4 w-4" />
              </CabinetLink>
            </div>
          )}
        </Reveal>

        {/* Apps */}
        <Reveal id="apps" className="mt-24 sm:mt-32">
          <SectionHeading
            eyebrow={copy.apps.eyebrow}
            title={copy.apps.title}
            intro={copy.apps.intro}
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="card">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-dark-500">
                {copy.apps.fedarishaClients}
              </div>
              <ul className="mt-4 divide-y divide-dark-800/60">
                {[
                  {
                    icon: <PiWindowsLogo className="h-5 w-5" />,
                    label: copy.apps.windows,
                    href: FEDARISHA_LINKS.v2rayN,
                  },
                  {
                    icon: <PiAndroidLogo className="h-5 w-5" />,
                    label: copy.apps.android,
                    href: FEDARISHA_LINKS.v2rayNG,
                  },
                ].map((app) => (
                  <li key={app.href} className="flex items-center justify-between gap-4 py-3.5">
                    <span className="flex items-center gap-3 text-sm text-dark-100 sm:text-base">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-dark-800/80 text-dark-200">
                        {app.icon}
                      </span>
                      {app.label}
                    </span>
                    <ExternalLink
                      href={app.href}
                      className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs text-dark-400 transition-colors hover:text-dark-100"
                    >
                      <PiGithubLogo className="h-4 w-4" />
                      {copy.apps.source}
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card flex flex-col">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-dark-500">
                {copy.apps.others}
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-dark-400 sm:text-base">
                {copy.apps.othersText}
              </p>
              <CabinetLink to="/" className="btn-secondary mt-6 h-10 self-start px-4 text-sm">
                {copy.apps.viaCabinet}
                <PiArrowRight className="h-4 w-4" />
              </CabinetLink>
            </div>
          </div>
        </Reveal>

        {/* FAQ */}
        <Reveal id="faq" className="mt-24 sm:mt-32">
          <SectionHeading eyebrow={copy.faq.eyebrow} title={copy.faq.title} />
          <div className="mt-10 divide-y divide-dark-800/60 border-y border-dark-800/60">
            {copy.faq.items.map((item) => (
              <details key={item.q} className="fed-faq group">
                <summary className="flex items-center justify-between gap-6 py-5 text-left text-base font-semibold text-dark-50 sm:text-lg">
                  {item.q}
                  <PiCaretDown className="fed-faq-caret h-5 w-5 shrink-0 text-dark-500" />
                </summary>
                <p className="max-w-3xl pb-6 text-sm leading-relaxed text-dark-400 sm:text-base">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>

        {/* About */}
        <Reveal id="about" className="mt-24 sm:mt-32">
          <div className="card grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Eyebrow>{copy.about.eyebrow}</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-dark-50 sm:text-4xl">
                {copy.about.title}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-dark-300">
                {copy.about.text}
              </p>
              <dl className="mt-8 grid grid-cols-2 gap-6 sm:max-w-sm">
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-dark-500">
                    {copy.about.founded}
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-bold text-dark-50">
                    {copy.about.foundedValue}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-dark-500">
                    {copy.about.code}
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-bold text-dark-50">
                    {copy.about.codeValue}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-dark-500">
                {copy.about.contactsTitle}
              </div>
              <ul className="mt-4 space-y-3 text-sm sm:text-base">
                {botUsername && (
                  <li>
                    <ExternalLink
                      href={`https://telegram.me/${botUsername}`}
                      className="inline-flex items-center gap-3 text-dark-100 transition-colors hover:text-accent-400"
                    >
                      <PiTelegramLogo className="h-5 w-5 text-dark-400" />
                      <span>
                        <span className="block text-xs text-dark-500">{copy.about.telegram}</span>@
                        {botUsername}
                      </span>
                    </ExternalLink>
                  </li>
                )}
                {contactEmail && (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="inline-flex items-center gap-3 text-dark-100 transition-colors hover:text-accent-400"
                    >
                      <PiEnvelopeSimple className="h-5 w-5 text-dark-400" />
                      <span>
                        <span className="block text-xs text-dark-500">{copy.about.email}</span>
                        {contactEmail}
                      </span>
                    </a>
                  </li>
                )}
                <li>
                  <ExternalLink
                    href={FEDARISHA_LINKS.org}
                    className="inline-flex items-center gap-3 text-dark-100 transition-colors hover:text-accent-400"
                  >
                    <PiGithubLogo className="h-5 w-5 text-dark-400" />
                    <span>
                      <span className="block text-xs text-dark-500">{copy.about.github}</span>
                      github.com/Fedarisha
                    </span>
                  </ExternalLink>
                </li>
                <li>
                  <CabinetLink
                    to="/support"
                    className="inline-flex items-center gap-3 text-dark-100 transition-colors hover:text-accent-400"
                  >
                    <PiChatCircleDots className="h-5 w-5 text-dark-400" />
                    <span>
                      <span className="block text-xs text-dark-500">{copy.about.support}</span>
                      {copy.footer.support}
                    </span>
                  </CabinetLink>
                </li>
              </ul>
              {legalInfo && (
                <p className="mt-6 text-xs leading-relaxed text-dark-500">{legalInfo}</p>
              )}
            </div>
          </div>
        </Reveal>

        {/* CTA */}
        <Reveal className="mt-24 sm:mt-32">
          <div className="card relative overflow-hidden p-8 text-center sm:p-12">
            <div className="fed-grid pointer-events-none absolute inset-0" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold tracking-tight text-dark-50 sm:text-4xl">
                {copy.cta.title}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-dark-300 sm:text-base">
                {copy.cta.subtitle}
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <CabinetLink to="/" className="btn-primary h-11 px-6 text-sm">
                  {copy.cta.primary}
                  <PiArrowRight className="h-4 w-4" />
                </CabinetLink>
                <CabinetLink to="/support" className="btn-secondary h-11 px-6 text-sm">
                  {copy.cta.secondary}
                </CabinetLink>
              </div>
            </div>
          </div>
        </Reveal>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-dark-800/60 bg-dark-950/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-xs text-dark-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CabinetLink to="/support" className="transition-colors hover:text-dark-200">
              {copy.footer.support}
            </CabinetLink>
            <CabinetLink to="/info?tab=rules" className="transition-colors hover:text-dark-200">
              {copy.footer.rules}
            </CabinetLink>
            <CabinetLink to="/info?tab=privacy" className="transition-colors hover:text-dark-200">
              {copy.footer.privacy}
            </CabinetLink>
            <CabinetLink to="/info?tab=offer" className="transition-colors hover:text-dark-200">
              {copy.footer.offer}
            </CabinetLink>
            <CabinetLink
              to="/info?tab=personal-data"
              className="transition-colors hover:text-dark-200"
            >
              {copy.footer.personalData}
            </CabinetLink>
            <ExternalLink
              href={FEDARISHA_LINKS.org}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-dark-200"
            >
              <PiGithubLogo className="h-3.5 w-3.5" />
              GitHub
            </ExternalLink>
          </div>
          <div className="font-mono text-[11px] text-dark-600">
            © {new Date().getFullYear()} {appName} · {copy.footer.rights}
          </div>
        </div>
      </footer>
    </div>
  );
}
