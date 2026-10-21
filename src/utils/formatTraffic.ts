import i18n from '../i18n';
import { formatDecimal } from './formatNumber';
import { uiLocale } from './uiLocale';

const NBSP = ' ';

/**
 * Format traffic amount with appropriate unit (MB/GB/TB).
 * Units come from i18n so RU shows «ГБ» consistently with the rest of the UI
 * (templates previously mixed latin "GB" with localized «ГБ» on one screen);
 * the decimal separator follows the interface language («41,2 ГБ», not «41.2 ГБ»).
 * Единица приклеена неразрывным пробелом: в узкой строке «ТБ» уезжало отдельной
 * строкой под число. Порог ТБ — по округлённому значению: 999,99 ГБ
 * показывалось как «1 000,0 ГБ».
 */
export function formatTraffic(gb: number, locale: string = uiLocale()): string {
  if (Math.round(gb * 10) / 10 >= 1000)
    return `${formatDecimal(gb / 1000, 1, locale)}${NBSP}${i18n.t('common.units.tb', 'TB')}`;
  if (gb >= 1) return `${formatDecimal(gb, 1, locale)}${NBSP}${i18n.t('common.units.gb', 'GB')}`;
  return `${formatDecimal(gb * 1024, 0, locale)}${NBSP}${i18n.t('common.units.mb', 'MB')}`;
}

/**
 * Returns the i18n key for the "per <period>" suffix to display next to a
 * traffic limit, based on the tariff's traffic reset mode.
 *
 * Reset modes mirror the backend: 'DAY', 'WEEK', 'MONTH', 'MONTH_ROLLING',
 * 'NO_RESET'. A null/undefined mode means "use the global default", which is
 * MONTH on the backend — so we fall back to the monthly suffix.
 *
 * Returns null for NO_RESET (the limit is for the whole period, no suffix).
 */
export function trafficResetSuffixKey(resetMode?: string | null): string | null {
  switch (resetMode) {
    case 'NO_RESET':
      return null;
    case 'DAY':
      return 'common.units.perDayTraffic';
    case 'WEEK':
      return 'common.units.perWeekTraffic';
    case 'MONTH':
    case 'MONTH_ROLLING':
    default:
      return 'common.units.perMonthTraffic';
  }
}
