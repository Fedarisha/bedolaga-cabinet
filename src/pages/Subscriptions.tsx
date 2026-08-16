import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ClipboardIcon, PlusIcon } from '@/components/icons';
import { subscriptionApi } from '../api/subscription';
import { balanceApi } from '../api/balance';
import { useTheme } from '../hooks/useTheme';
import { getGlassColors } from '../utils/glassTheme';
import { useAuthStore } from '../store/auth';
import SubscriptionListCard from '../components/subscription/SubscriptionListCard';
import RestoreXUiDialog from '../components/subscription/RestoreXUiDialog';
import TrialOfferCard from '../components/dashboard/TrialOfferCard';

function EmptyState({ onBuy, onRestore }: { onBuy: () => void; onRestore: () => void }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  return (
    <div
      className="rounded-2xl border p-10 text-center"
      style={{ background: g.cardBg, borderColor: g.cardBorder }}
    >
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: g.innerBg }}
      >
        <ClipboardIcon className="h-8 w-8 opacity-40" />
      </div>
      <h3 className="mb-2 text-xl font-semibold" style={{ color: g.text }}>
        {t('subscriptions.empty', 'Нет подписок')}
      </h3>
      <p className="mb-6 text-sm" style={{ color: g.textSecondary }}>
        {t('subscriptions.emptyDesc', 'У вас пока нет активных подписок')}
      </p>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <button
          onClick={onBuy}
          className="rounded-xl bg-accent-500 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-600"
        >
          {t('subscriptions.buy', 'Купить подписку')}
        </button>
        <button
          onClick={onRestore}
          className="rounded-xl px-6 py-3 text-sm font-medium transition-colors"
          style={{
            background: g.innerBg,
            color: g.textSecondary,
            border: `1px solid ${g.cardBorder}`,
          }}
        >
          {t('xUiMigration.restoreButton', 'Восстановить старую подписку')}
        </button>
      </div>
    </div>
  );
}

export default function Subscriptions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  const subscriptions = data?.subscriptions ?? [];
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
      setTrialError(error.response?.data?.detail || t('common.error'));
    },
  });

  // Single-tariff mode with one subscription: skip list, go directly to detail
  if (data && !isMultiTariff && subscriptions.length === 1) {
    return <Navigate to={`/subscriptions/${subscriptions[0].id}`} replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold" style={{ color: g.text }}>
          {t('subscriptions.title', 'Мои подписки')}
        </h1>
        {!isLoading && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRestoreOpen(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-4"
              style={{
                background: g.innerBg,
                color: g.textSecondary,
                border: `1px solid ${g.cardBorder}`,
              }}
              title={t(
                'xUiMigration.restoreHint',
                'Перенос подписки из старой системы по VLESS-ссылке или UUID клиента',
              )}
            >
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                />
              </svg>
              <span className="sm:hidden">
                {t('xUiMigration.restoreButtonShort', 'Восстановить')}
              </span>
              <span className="hidden sm:inline">
                {t('xUiMigration.restoreButton', 'Восстановить старую подписку')}
              </span>
            </button>
            {subscriptions.length > 0 && (
              <button
                onClick={() => navigate('/subscription/purchase')}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-4"
                style={{
                  background: 'rgba(var(--color-accent-400), 0.1)',
                  color: 'rgb(var(--color-accent-400))',
                  border: '1px solid rgba(var(--color-accent-400), 0.2)',
                }}
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t('subscriptions.buyAnother', 'Купить ещё подписку')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Есть подписки, но платной активной нет (только триал/истёкшие) —
          даём ЯВНУЮ primary-кнопку покупки: мы продаём подписки. */}
      {!isLoading && subscriptions.length > 0 && !hasActivePaid && (
        <button
          onClick={() => navigate('/subscription/purchase')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 p-3.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-600"
        >
          <PlusIcon className="h-5 w-5" />
          {t('subscriptions.browsePlans', 'Посмотреть тарифы и купить подписку')}
        </button>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl"
              style={{ background: g.innerBg }}
            />
          ))}
        </div>
      )}

      {/* Empty state: показываем триал, если доступен; иначе — обычный empty с restore */}
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
              в витрину — даём явный путь к покупке подписки. Раньше при
              доступном триале это был единственный экран без кнопки «Купить»
              (Telegram-баг #605056/#605063). */}
          <button
            onClick={() => navigate('/subscription/purchase')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-600"
          >
            <PlusIcon className="h-5 w-5" />
            {t('subscriptions.browsePlans', 'Посмотреть тарифы и купить подписку')}
          </button>
        </div>
      )}
      {hasNoSubscriptions && !trialLoading && !trialInfo?.is_available && (
        <EmptyState
          onBuy={() => navigate('/subscription/purchase')}
          onRestore={() => setRestoreOpen(true)}
        />
      )}

      {/* Subscription grid */}
      {subscriptions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2">
          {subscriptions.map((sub) => (
            <SubscriptionListCard
              key={sub.id}
              subscription={sub}
              onClick={() => navigate(`/subscriptions/${sub.id}`)}
            />
          ))}
        </div>
      )}

      <RestoreXUiDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        onSuccess={(result) => navigate(`/subscriptions/${result.subscription_id}`)}
      />
    </div>
  );
}
