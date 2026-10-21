import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import { balanceApi } from '../api/balance';
import { useCurrency } from '../hooks/useCurrency';
import { Card } from '@/components/data-display/Card';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import PaymentMethodIcon from '@/components/PaymentMethodIcon';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

export default function TopUpMethodSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formatAmount, currencySymbol } = useCurrency();

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: balanceApi.getPaymentMethods,
  });

  const handleMethodClick = useCallback(
    (methodId: string) => {
      const params = new URLSearchParams();
      const amount = searchParams.get('amount');
      const returnTo = searchParams.get('returnTo');
      if (amount) params.set('amount', amount);
      if (returnTo) params.set('returnTo', returnTo);
      const qs = params.toString();
      navigate(`/balance/top-up/${methodId}${qs ? `?${qs}` : ''}`);
    },
    [navigate, searchParams],
  );

  useEffect(() => {
    if (isLoading || !paymentMethods) return;

    const availableMethods = paymentMethods.filter((method) => method.is_available);
    if (availableMethods.length === 1) {
      handleMethodClick(availableMethods[0].id);
    }
  }, [handleMethodClick, isLoading, paymentMethods]);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem}>
        <h1 className="text-3xl font-extrabold text-dark-50">{t('balance.selectPaymentMethod')}</h1>
      </motion.div>

      <motion.div variants={staggerItem} className="max-w-xl">
        <div className="napkin napkin-tilt">
          {isLoading ? (
            <SkeletonGroup className="space-y-3">
              <Skeleton variant="card" count={3} className="h-16" />
            </SkeletonGroup>
          ) : !paymentMethods || paymentMethods.length === 0 ? (
            <div className="py-6 text-center text-sm text-dark-400">
              {t('balance.noPaymentMethods')}
            </div>
          ) : (
            <div className="napkin-rows">
              {paymentMethods.map((method) => {
                const methodKey = method.id.toLowerCase().replace(/-/g, '_');
                const translatedName = t(`balance.paymentMethods.${methodKey}.name`, {
                  defaultValue: '',
                });
                const translatedDesc = t(`balance.paymentMethods.${methodKey}.description`, {
                  defaultValue: '',
                });

                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={!method.is_available}
                    onClick={() => handleMethodClick(method.id)}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 py-4 text-left first:pt-1 last:pb-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PaymentMethodIcon method={methodKey} className="h-8 w-8 flex-shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-lg font-semibold text-dark-50">
                        {method.name || translatedName}
                      </span>
                      {(method.description || translatedDesc) && (
                        <span className="block text-sm text-dark-400">
                          {method.description || translatedDesc}
                        </span>
                      )}
                      <span className="block font-hand text-xl text-accent-500">
                        {formatAmount(method.min_amount_kopeks / 100, 0)} –{' '}
                        {formatAmount(method.max_amount_kopeks / 100, 0)}
                        {'\u00A0'}
                        {currencySymbol}
                      </span>
                    </span>
                    <span className="font-hand text-3xl text-accent-500" aria-hidden="true">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
