import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const RUB_RATES = {
  USD: 100,
  CNY: 14,
  IRR: 0.0024,
};

export function useCurrency() {
  const { t } = useTranslation();
  const exchangeRates = RUB_RATES;
  const targetCurrency = 'RUB';
  const isRussian = true;
  const currencySymbol = t('common.currency');

  // «1 875», «156,25»: русская группировка разрядов, копейки только если они есть.
  const formatAmount = useCallback((rubAmount: number, decimals: number = 2): string => {
    const whole = Number.isInteger(Number(rubAmount.toFixed(decimals)));
    return rubAmount.toLocaleString('ru-RU', {
      minimumFractionDigits: whole ? 0 : decimals,
      maximumFractionDigits: decimals,
    });
  }, []);

  const formatWithCurrency = useCallback(
    (rubAmount: number, decimals: number = 2): string => {
      return `${formatAmount(rubAmount, decimals)} ${currencySymbol}`;
    },
    [formatAmount, currencySymbol],
  );

  // Format amount with + sign (for earnings/bonuses)
  const formatPositive = useCallback(
    (rubAmount: number, decimals: number = 2): string => {
      return `+${formatAmount(rubAmount, decimals)} ${currencySymbol}`;
    },
    [formatAmount, currencySymbol],
  );

  const convertAmount = useCallback((rubAmount: number): number => {
    return rubAmount;
  }, []);

  const convertToRub = useCallback((amount: number): number => {
    return amount;
  }, []);

  return useMemo(
    () => ({
      exchangeRates,
      targetCurrency,
      isRussian,
      currencySymbol,
      formatAmount,
      formatWithCurrency,
      formatPositive,
      convertAmount,
      convertToRub,
    }),
    [
      exchangeRates,
      targetCurrency,
      isRussian,
      currencySymbol,
      formatAmount,
      formatWithCurrency,
      formatPositive,
      convertAmount,
      convertToRub,
    ],
  );
}
