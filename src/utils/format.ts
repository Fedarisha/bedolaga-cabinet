export const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

import i18next from 'i18next';
import { currencyApi, type ExchangeRates } from '../api/currency';
import { uiLocale } from './uiLocale';

const LANG_CURRENCY_MAP: Record<
  string,
  { currency: string; locale: string; symbol: string; key?: keyof ExchangeRates }
> = {
  ru: { currency: 'RUB', locale: 'ru-RU', symbol: '₽' },
  en: { currency: 'USD', locale: 'en-US', symbol: '$', key: 'USD' },
  zh: { currency: 'CNY', locale: 'zh-CN', symbol: '¥', key: 'CNY' },
  fa: { currency: 'IRR', locale: 'fa-IR', symbol: '﷼', key: 'IRR' },
};

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

/** Date-only (dd.mm.yyyy) in the active UI locale; '-' for a null date. */
export function formatShortDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(uiLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
