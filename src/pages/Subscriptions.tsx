import { useState } from 'react';
import { getApiErrorMessage } from '../utils/api-error';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '../api/subscription';
import { balanceApi } from '../api/balance';
import { useAuthStore } from '../store/auth';
import { SubscriptionRow } from '../components/dashboard/NapkinStatus';
import TrialOfferCard from '../components/dashboard/TrialOfferCard';

function EmptyState({ onBuy }: { onBuy: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="napkin napkin-tilt text-center">
      <h2 className="font-display text-2xl font-extrabold text-dark-50">
        {t('subscriptions.empty', 'Нет подписок')}
      </h2>
      <p className="mb-6 mt-2 text-base text-dark-400">
        {t('subscriptions.emptyDesc', 'У вас пока нет активных подписок')}
      </p>
      <button type="button" onClick={onBuy} className="napkin-btn">
        {t('subscriptions.buy', 'Купить подписку')}
      </button>
    </div>
  );
}

export default function Subscriptions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [trialError, setTrialError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  const subscriptions = data?.subscriptions ?? [];
  const deviceQueries = useQueries({
    queries: subscriptions.map((sub) => ({
      queryKey: ['devices', sub.id],
      queryFn: () => subscriptionApi.getDevices(sub.id),
      staleTime: 60_000,
    })),
  });
  const isMultiTariff = data?.multi_tariff_enabled ?? false;
  const hasNoSubscriptions = !isLoading && subscriptions.length === 0;
  // Есть ли хотя бы одна НАСТОЯЩАЯ (платная, не триал) живая подписка. От этого
  // зависит CTA: «+ Купить ещё» — только если уже есть платная; иначе показываем
  // явную «Посмотреть тарифы и купить подписку» (триал/истёкшие — это ещё не покупка).
  const hasActivePaid = subscriptions.some(
    (s) => !s.is_trial && (s.status === 'active' || s.status === 'limited'),
  );

  // Если у юзера нет подписок — проверяем доступность триала, иначе
  // (в multi-tariff) ему вообще негде увидеть оффер.
  const { data: trialInfo, isLoading: trialLoading } = useQuery({
    queryKey: ['trial-info'],
    queryFn: () => subscriptionApi.getTrialInfo(),
    enabled: hasNoSubscriptions,
    staleTime: 30_000,
  });

  const { data: balanceData } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    enabled: hasNoSubscriptions && !!trialInfo?.is_available,
    staleTime: 30_000,
  });

  const activateTrialMutation = useMutation({
    mutationFn: () => subscriptionApi.activateTrial(),
    onSuccess: () => {
      setTrialError(null);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['trial-info'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      refreshUser();
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      setTrialError(getApiErrorMessage(error, t('common.error')));
    },
  });

  // Single-tariff mode with one subscription: skip list, go directly to detail
  if (data && !isMultiTariff && subscriptions.length === 1) {
    return <Navigate to={`/subscriptions/${subscriptions[0].id}`} replace />;
  }

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-3xl font-extrabold text-dark-50">
        {t('subscriptions.title', 'Мои подписки')}
      </h1>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      )}

      {/* Empty state: показываем триал, если доступен; иначе — обычный empty */}
      {hasNoSubscriptions && !trialLoading && trialInfo?.is_available && (
        <div className="space-y-4">
          <TrialOfferCard
            trialInfo={trialInfo}
            balanceKopeks={balanceData?.balance_kopeks ?? 0}
            balanceRubles={balanceData?.balance_rubles ?? 0}
            activateTrialMutation={activateTrialMutation}
            trialError={trialError}
          />
          {/* Новый пользователь не обязан активировать триал, чтобы попасть
              в витрину — даём явный путь к покупке подписки. */}
          <button
            type="button"
            onClick={() => navigate('/subscription/purchase')}
            className="napkin-btn-line"
          >
            {t('subscriptions.browsePlans', 'Посмотреть тарифы и купить подписку')}
          </button>
        </div>
      )}
      {hasNoSubscriptions && !trialLoading && !trialInfo?.is_available && (
        <EmptyState onBuy={() => navigate('/subscription/purchase')} />
      )}

      {subscriptions.length > 0 && (
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
          <div className="napkin-rows">
            {subscriptions.map((sub, index) => (
              <SubscriptionRow
                key={sub.id}
                big
                item={{ sub, usedDevices: deviceQueries[index]?.data?.total }}
              />
            ))}
          </div>
          <div className="mt-6 lg:mt-2">
            <button
              type="button"
              onClick={() => navigate('/subscription/purchase')}
              className={hasActivePaid ? 'napkin-btn-line' : 'napkin-btn'}
            >
              {hasActivePaid
                ? t('subscriptions.buyAnother', 'Купить ещё подписку')
                : t('subscriptions.browsePlans', 'Посмотреть тарифы и купить подписку')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
