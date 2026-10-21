import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { SubscriptionListItem } from '../../types';

/** Что главная знает о подписке: элемент списка + занятые устройства. */
export interface NapkinSubscription {
  sub: SubscriptionListItem;
  usedDevices?: number;
}

type SubState = 'ok' | 'soon' | 'paused' | 'expired' | 'limited';

const SOON_DAYS = 3;
const DAY_MS = 86_400_000;

function daysLeft(endDate: string | null): number {
  if (!endDate) return 0;
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / DAY_MS));
}

function stateOf(sub: SubscriptionListItem): SubState {
  const status = sub.status.toLowerCase();
  if (sub.is_daily && (status === 'disabled' || sub.is_daily_paused)) return 'paused';
  if (status === 'limited') return 'limited';
  if (status === 'expired' || status === 'disabled') return 'expired';
  if (!sub.is_daily && daysLeft(sub.end_date) <= SOON_DAYS) return 'soon';
  return 'ok';
}

function formatDay(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

const CheckCircle = () => (
  <svg
    viewBox="0 0 44 44"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-11 w-11 text-success-600"
  >
    <path
      pathLength={1}
      className="napkin-draw"
      d="M22 3.5c10.4.2 18.4 8.4 18.5 18.6-.1 10.2-8.3 18.4-18.6 18.4C11.7 40.3 3.6 32.1 3.5 22 3.7 11.6 11.8 3.6 22 3.5Z"
    />
    <path pathLength={1} className="napkin-draw" d="M13 22.5l6.5 6.5L31.5 15" />
  </svg>
);

const WarnCircle = () => (
  <svg
    viewBox="0 0 44 44"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="h-11 w-11 text-warning-600"
  >
    <path
      pathLength={1}
      className="napkin-draw"
      d="M22 3.5c10.4.2 18.4 8.4 18.5 18.6-.1 10.2-8.3 18.4-18.6 18.4C11.7 40.3 3.6 32.1 3.5 22 3.7 11.6 11.8 3.6 22 3.5Z"
    />
    <path pathLength={1} className="napkin-draw" d="M22 12.5v13M22 31.5v.5" />
  </svg>
);

function Headline({ ok, children }: { ok: boolean; children: string }) {
  return (
    <div className="flex items-center gap-3">
      {ok ? <CheckCircle /> : <WarnCircle />}
      <h2 className="font-display text-2xl font-extrabold leading-tight text-dark-50">
        {children}
      </h2>
    </div>
  );
}

function SubscriptionRow({ item }: { item: NapkinSubscription }) {
  const { t } = useTranslation();
  const { sub, usedDevices } = item;
  const state = stateOf(sub);
  const days = daysLeft(sub.end_date);
  const title = sub.name || sub.tariff_name || t('subscription.defaultName', 'Подписка');
  const devices =
    sub.device_limit === 0
      ? t('dashboard.napkin.devicesUnlimited', { used: usedDevices ?? 0 })
      : t('dashboard.napkin.devicesOf', { used: usedDevices ?? '…', max: sub.device_limit });

  let mark: string | null = null;
  let hint = '';
  if (state === 'ok') hint = t('dashboard.napkin.until', { date: formatDay(sub.end_date) });
  if (state === 'soon') {
    mark = t('dashboard.napkin.days', { count: days });
    hint = t('dashboard.napkin.renewHint');
  }
  if (state === 'paused') {
    mark = t('dashboard.napkin.paused');
    hint = t('dashboard.napkin.topUpHint');
  }
  if (state === 'expired') {
    mark = t('dashboard.napkin.expired');
    hint = t('dashboard.napkin.renewHint');
  }
  if (state === 'limited') {
    mark = t('dashboard.napkin.limited');
    hint = t('dashboard.napkin.trafficHint');
  }

  return (
    <Link
      to={`/subscriptions/${sub.id}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-0.5 py-3 transition-colors hover:bg-dark-900"
    >
      <span className="min-w-0">
        <strong className="block truncate text-lg font-semibold text-dark-100">{title}</strong>
        <small className="block text-sm text-dark-400">
          {[sub.name ? sub.tariff_name : null, devices].filter(Boolean).join(' · ')}
        </small>
      </span>
      <span className="text-right">
        {mark ? (
          <b
            className={cn(
              'hl font-hand text-3xl leading-none',
              state === 'soon' ? 'text-accent-500' : 'text-warning-700',
            )}
          >
            {mark}
          </b>
        ) : (
          <span className="font-hand text-3xl leading-none text-accent-500">
            {t('dashboard.napkin.days', { count: days })}
          </span>
        )}
        <small className="block text-xs text-dark-400">{hint}</small>
      </span>
    </Link>
  );
}

interface Props {
  items: NapkinSubscription[];
}

/** Салфетка на главной: «Интернет работает» и цифры, либо список подписок с пометками. */
export default function NapkinStatus({ items }: Props) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  const states = items.map((i) => stateOf(i.sub));
  const problems = states.filter((s) => s !== 'ok').length;

  if (items.length === 1) {
    const { sub, usedDevices } = items[0];
    const state = states[0];
    const days = daysLeft(sub.end_date);
    const headline =
      state === 'ok' || state === 'soon'
        ? t('dashboard.napkin.working')
        : state === 'paused'
          ? t('dashboard.napkin.pausedTitle')
          : state === 'limited'
            ? t('dashboard.napkin.limitedTitle')
            : t('dashboard.napkin.expiredTitle');
    const unlimited = !sub.traffic_limit_gb;
    return (
      <div className="napkin napkin-tilt" role="status" data-onboarding="welcome">
        <Headline ok={state === 'ok' || state === 'soon'}>{headline}</Headline>
        <p className="mt-2 text-base text-dark-400">
          {state === 'paused'
            ? t('dashboard.napkin.pausedHint')
            : t('dashboard.napkin.paidUntil', {
                tariff: sub.tariff_name || sub.name || '',
                date: formatDay(sub.end_date),
              })}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2.5 border-t-[1.5px] border-dashed border-dark-700 pt-4">
          <div>
            <b
              className={cn(
                'block font-hand text-4xl leading-none text-accent-500',
                state === 'soon' && 'hl',
              )}
            >
              {days}
            </b>
            <span className="text-sm text-dark-400">
              {t('dashboard.napkin.daysLeftLabel', { count: days })}
            </span>
          </div>
          <div>
            <b className="block font-hand text-4xl leading-none text-accent-500">
              {sub.device_limit === 0
                ? (usedDevices ?? '…')
                : t('dashboard.napkin.usedOfMax', {
                    used: usedDevices ?? '…',
                    max: sub.device_limit,
                  })}
            </b>
            <span className="text-sm text-dark-400">{t('dashboard.napkin.devicesLabel')}</span>
          </div>
          <div>
            <b className="block font-hand text-4xl leading-none text-accent-500">
              {t('dashboard.napkin.gb', { value: Math.round(sub.traffic_used_gb) })}
            </b>
            <span className="text-sm text-dark-400">
              {unlimited
                ? t('dashboard.napkin.unlimited')
                : t('dashboard.napkin.ofLimit', { limit: sub.traffic_limit_gb })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const headline =
    problems === 0
      ? t('dashboard.napkin.working')
      : problems === 1
        ? t('dashboard.napkin.attentionOne')
        : t('dashboard.napkin.attentionMany');

  return (
    <div className="napkin napkin-tilt" role="status" data-onboarding="welcome">
      <Headline ok={problems === 0}>{headline}</Headline>
      <div className="napkin-rows mt-3">
        {items.map((item) => (
          <SubscriptionRow key={item.sub.id} item={item} />
        ))}
      </div>
    </div>
  );
}
