export const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

import { uiLocale } from './uiLocale';

const DEFAULT_CURRENCY = { currency: 'RUB', locale: 'ru-RU', symbol: '₽' };

export function formatPrice(kopeks: number, lang?: string): string {
  void lang;
  const config = DEFAULT_CURRENCY;
  const rubles = kopeks / 100;
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 0,
    }).format(rubles);
  } catch {
    return `${Math.round(rubles)} ${config.symbol}`;
  }
}

/** A date-only string (YYYY-MM-DD) is a calendar day, not UTC midnight: parsed as a local
 * date so the day label never slips back a day for viewers west of UTC. Full timestamps
 * stay instants. */
export function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** A machine date rendered for the locale; a string the browser cannot parse is shown as is.
 * Bot 4.8.0 sent a human-formatted date in WebSocket events and the success modal printed
 * "Invalid Date" — the raw text is always better than that. */
export function formatDateOrRaw(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale, options);
}

/**
 * День и месяц без года — для пометок, живущих считаные дни («временно до 16.09»).
 *
 * Год в таком чипе занимает место, которого на телефоне нет: имя человека рядом
 * уезжало в многоточие.
 */
export function formatDayMonth(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(uiLocale(), { day: '2-digit', month: '2-digit' });
}

/** Date-only (dd.mm.yyyy) in the active UI locale; '-' for a null date. */
export function formatShortDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(uiLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
