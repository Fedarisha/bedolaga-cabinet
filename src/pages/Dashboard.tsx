import { safeLocal } from '@/utils/safeStorage';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getApiErrorMessage } from '../utils/api-error';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import { useBlockingStore } from '../store/blocking';
import { subscriptionApi } from '../api/subscription';
import { referralApi } from '../api/referral';
import { balanceApi } from '../api/balance';
import { wheelApi } from '../api/wheel';
import Onboarding, { useOnboarding } from '../components/Onboarding';
import NapkinStatus, { type NapkinSubscription } from '../components/dashboard/NapkinStatus';
import SubscriptionCardExpired from '../components/dashboard/SubscriptionCardExpired';
import TrialOfferCard from '../components/dashboard/TrialOfferCard';
import StatsGrid from '../components/dashboard/StatsGrid';
import { giftApi } from '../api/gift';
import PendingGiftCard from '../components/dashboard/PendingGiftCard';
import { API } from '../config/constants';
import type { Subscription, SubscriptionListItem } from '../types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/primitives/Sheet';

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

type DashboardSubscriptionAction = 'renew' | 'connect';

type DashboardSubscriptionChoice = {
  id: number;
  title: string;
  subtitle: string;
  isTrial: boolean;
  connectedDevices?: number;
  deviceLimit: number;
  devicesLoading: boolean;
};

function subscriptionChoiceFromListItem(
  subscription: SubscriptionListItem,
  fallbackTitle: string,
  deviceStats?: { total: number; device_limit: number },
  devicesLoading = false,
): DashboardSubscriptionChoice {
  return {
    id: subscription.id,
    title: subscription.name || subscription.tariff_name || fallbackTitle,
    subtitle: subscription.name && subscription.tariff_name ? subscription.tariff_name : '',
    isTrial: subscription.is_trial,
    connectedDevices: deviceStats?.total,
    deviceLimit: deviceStats?.device_limit ?? subscription.device_limit,
    devicesLoading,
  };
}

function subscriptionChoiceFromStatus(
  subscription: Subscription,
  fallbackTitle: string,
  deviceStats?: { total: number; device_limit: number },
  devicesLoading = false,
): DashboardSubscriptionChoice {
  return {
    id: subscription.id,
    title: subscription.name || subscription.tariff_name || fallbackTitle,
    subtitle: subscription.name && subscription.tariff_name ? subscription.tariff_name : '',
    isTrial: subscription.is_trial,
    connectedDevices: deviceStats?.total,
    deviceLimit: deviceStats?.device_limit ?? subscription.device_limit,
    devicesLoading,
  };
}

function isSubscriptionAtDeviceLimit(subscription: DashboardSubscriptionChoice) {
  if (subscription.deviceLimit === 0) return false;
  if (subscription.connectedDevices == null) return false;
  return subscription.connectedDevices >= subscription.deviceLimit;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const queryClient = useQueryClient();
  const { isCompleted: isOnboardingCompleted, complete: completeOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const blockingType = useBlockingStore((state) => state.blockingType);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [subscriptionAction, setSubscriptionAction] = useState<DashboardSubscriptionAction | null>(
    null,
  );

  // Refresh user data on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Fetch balance from API
  const { data: balanceData } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: API.BALANCE_STALE_TIME_MS,
    refetchOnMount: 'always',
  });

  // Multi-tariff: check if user has multiple subscriptions
  const { data: multiSubData } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 60_000,
  });
  const isMultiTariff = multiSubData?.multi_tariff_enabled ?? false;

  const { data: subscriptionResponse, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getSubscription(),
    retry: false,
    staleTime: API.BALANCE_STALE_TIME_MS,
    refetchOnMount: 'always',
    enabled: !isMultiTariff,
  });

  const subscription = subscriptionResponse?.subscription ?? null;

  const { data: trialInfo, isLoading: trialLoading } = useQuery({
    queryKey: ['trial-info'],
    queryFn: () => subscriptionApi.getTrialInfo(),
    enabled: !subscription && !subLoading,
  });

  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    enabled: !!subscription && !isMultiTariff,
    staleTime: API.BALANCE_STALE_TIME_MS,
  });

  const multiSubscriptionDeviceQueries = useQueries({
    queries: (multiSubData?.subscriptions ?? []).map((sub) => ({
      queryKey: ['devices', sub.id],
      queryFn: () => subscriptionApi.getDevices(sub.id),
      enabled: isMultiTariff,
      staleTime: API.BALANCE_STALE_TIME_MS,
    })),
  });

  const { isLoading: refLoading } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  });

  const { data: wheelConfig } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
    staleTime: 60000,
    retry: false,
  });

  const { data: pendingGifts } = useQuery({
    queryKey: ['pending-gifts'],
    queryFn: giftApi.getPendingGifts,
    staleTime: 30_000,
    retry: false,
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

  // Traffic refresh state and mutation
  const [trafficRefreshCooldown, setTrafficRefreshCooldown] = useState(0);
  const [trafficData, setTrafficData] = useState<{
    traffic_used_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
  } | null>(null);

  const refreshTrafficMutation = useMutation({
    mutationFn: () => subscriptionApi.refreshTraffic(subscription?.id),
    onSuccess: (data) => {
      setTrafficData({
        traffic_used_gb: data.traffic_used_gb,
        traffic_used_percent: data.traffic_used_percent,
        is_unlimited: data.is_unlimited,
      });
      safeLocal.setItem(
        `traffic_refresh_ts_${subscription?.id ?? 'default'}`,
        Date.now().toString(),
      );
      if (data.rate_limited && data.retry_after_seconds) {
        setTrafficRefreshCooldown(data.retry_after_seconds);
      } else {
        setTrafficRefreshCooldown(30);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription', subscription?.id] });
    },
    onError: (error: {
      response?: { status?: number; headers?: { get?: (key: string) => string } };
    }) => {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers?.get?.('Retry-After');
        setTrafficRefreshCooldown(retryAfter ? parseInt(retryAfter, 10) : 30);
      }
    },
  });

  // Cooldown timer
  useEffect(() => {
    if (trafficRefreshCooldown <= 0) return;
    const timer = setInterval(() => {
      setTrafficRefreshCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [trafficRefreshCooldown]);

  // Auto-refresh traffic on mount (with 30s caching)
  const hasAutoRefreshed = useRef(false);

  useEffect(() => {
    if (!subscription) return;
    if (hasAutoRefreshed.current) return;
    hasAutoRefreshed.current = true;

    const lastRefresh = safeLocal.getItem(`traffic_refresh_ts_${subscription?.id ?? 'default'}`);
    const now = Date.now();
    const cacheMs = API.TRAFFIC_CACHE_MS;

    if (lastRefresh && now - parseInt(lastRefresh, 10) < cacheMs) {
      const elapsed = now - parseInt(lastRefresh, 10);
      const remaining = Math.ceil((cacheMs - elapsed) / 1000);
      if (remaining > 0) {
        setTrafficRefreshCooldown(remaining);
      }
      return;
    }

    refreshTrafficMutation.mutate();
  }, [subscription, refreshTrafficMutation]);

  // В multi-tariff /cabinet/subscription отключён, поэтому subscriptionResponse=undefined.
  // Используем список из /cabinet/subscriptions/list — пустой массив означает «нет подписок»,
  // и тогда показываем TrialOfferCard. Без этой ветки multi-tariff юзер никогда не видел триал.
  const hasNoSubscription = isMultiTariff
    ? multiSubData !== undefined && (multiSubData.subscriptions?.length ?? 0) === 0
    : subscriptionResponse?.has_subscription === false && !subLoading;

  // Show onboarding for new users after data loads
  useEffect(() => {
    if (!isOnboardingCompleted && !subLoading && !refLoading && !blockingType) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOnboardingCompleted, subLoading, refLoading, blockingType]);

  const onboardingSteps = useMemo(() => {
    type Placement = 'top' | 'bottom' | 'left' | 'right';
    const steps: Array<{
      target: string;
      title: string;
      description: string;
      placement: Placement;
    }> = [
      {
        target: 'welcome',
        title: t('onboarding.steps.welcome.title'),
        description: t('onboarding.steps.welcome.description'),
        placement: 'bottom',
      },
      {
        target: 'balance',
        title: t('onboarding.steps.balance.title'),
        description: t('onboarding.steps.balance.description'),
        placement: 'bottom',
      },
    ];

    if (subscription?.subscription_url) {
      steps.splice(1, 0, {
        target: 'connect-devices',
        title: t('onboarding.steps.connectDevices.title'),
        description: t('onboarding.steps.connectDevices.description'),
        placement: 'bottom',
      });
    }

    return steps;
  }, [t, subscription]);

  const handleOnboardingComplete = () => {
    completeOnboarding();
    setShowOnboarding(false);
  };

  const hasExistingSubscriptions = (multiSubData?.subscriptions?.length ?? 0) > 0;
  const hasAnySubscription = hasExistingSubscriptions || !!subscription;
  const dashboardSubscriptions = useMemo<DashboardSubscriptionChoice[]>(() => {
    const fallbackTitle = t('subscription.defaultName', 'Подписка');

    if (multiSubData?.subscriptions?.length) {
      return multiSubData.subscriptions.map((sub, index) => {
        const devicesQuery = multiSubscriptionDeviceQueries[index];
        return subscriptionChoiceFromListItem(
          sub,
          fallbackTitle,
          devicesQuery?.data,
          devicesQuery?.isLoading ?? true,
        );
      });
    }

    if (subscription) {
      return [
        subscriptionChoiceFromStatus(
          subscription,
          fallbackTitle,
          devicesData,
          !!subscription && devicesData == null,
        ),
      ];
    }

    return [];
  }, [devicesData, multiSubData, multiSubscriptionDeviceQueries, subscription, t]);

  const napkinItems = useMemo<NapkinSubscription[]>(() => {
    if (isMultiTariff) {
      return (multiSubData?.subscriptions ?? []).map((sub, index) => ({
        sub,
        usedDevices: multiSubscriptionDeviceQueries[index]?.data?.total,
      }));
    }
    if (!subscription) return [];
    return [
      {
        sub: {
          id: subscription.id,
          name: subscription.name ?? null,
          status: subscription.status,
          tariff_id: subscription.tariff_id ?? null,
          tariff_name: subscription.tariff_name ?? null,
          traffic_limit_gb: subscription.traffic_limit_gb,
          traffic_used_gb: trafficData?.traffic_used_gb ?? subscription.traffic_used_gb,
          device_limit: subscription.device_limit,
          end_date: subscription.end_date,
          subscription_url: subscription.subscription_url,
          subscription_crypto_link: null,
          is_trial: subscription.is_trial,
          is_daily: subscription.is_daily,
          is_daily_paused: subscription.is_daily_paused,
          autopay_enabled: subscription.autopay_enabled,
          connected_squads: subscription.connected_squads,
        },
        usedDevices: devicesData?.total,
      },
    ];
  }, [
    isMultiTariff,
    multiSubData,
    multiSubscriptionDeviceQueries,
    subscription,
    trafficData,
    devicesData,
  ]);

  const navigateToSubscriptionAction = (
    action: DashboardSubscriptionAction,
    selectedSubscription: DashboardSubscriptionChoice,
  ) => {
    setSubscriptionAction(null);

    if (action === 'connect') {
      if (isSubscriptionAtDeviceLimit(selectedSubscription)) {
        navigate(`/subscriptions/${selectedSubscription.id}`);
        return;
      }

      navigate(`/connection?sub=${selectedSubscription.id}`);
      return;
    }

    if (selectedSubscription.isTrial) {
      navigate(`/subscription/purchase?subscriptionId=${selectedSubscription.id}&from=dashboard`);
      return;
    }

    navigate(`/subscriptions/${selectedSubscription.id}/renew?from=dashboard`);
  };

  const handleSubscriptionAction = (action: DashboardSubscriptionAction) => {
    if (dashboardSubscriptions.length === 1) {
      navigateToSubscriptionAction(action, dashboardSubscriptions[0]);
      return;
    }

    setSubscriptionAction(action);
  };

  const getSubscriptionChoiceSubtitle = (sub: DashboardSubscriptionChoice) => {
    if (subscriptionAction !== 'connect') return sub.subtitle;

    if (sub.devicesLoading) return t('dashboard.simple.checkingDevices');
    if (isSubscriptionAtDeviceLimit(sub)) return t('dashboard.simple.noDeviceSlots');

    if (sub.deviceLimit === 0) {
      return t('dashboard.devicesConnectedUnlimited', { used: sub.connectedDevices ?? 0 });
    }

    return t('dashboard.devicesOfMax', {
      used: sub.connectedDevices ?? 0,
      max: sub.deviceLimit,
    });
  };

  return (
    <div className="pt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
      <div className="space-y-6">
        <h1 className="sr-only">{t('nav.dashboard', 'Главная')}</h1>

        {pendingGifts && pendingGifts.length > 0 && <PendingGiftCard gifts={pendingGifts} />}

        {/* Салфетка со статусом. В классическом режиме истёкшая подписка остаётся на своей
          карточке: там быстрое продление с баланса. */}
        {!isMultiTariff && subLoading ? (
          <div className="napkin">
            <div className="skeleton mb-3 h-8 w-48" />
            <div className="skeleton mb-4 h-4 w-40" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : !isMultiTariff &&
          (subscription?.is_expired ||
            subscription?.status === 'disabled' ||
            subscription?.is_limited) ? (
          <SubscriptionCardExpired
            subscription={subscription}
            balanceKopeks={balanceData?.balance_kopeks ?? 0}
            balanceRubles={balanceData?.balance_rubles ?? 0}
          />
        ) : (
          <NapkinStatus items={napkinItems} />
        )}

        {(isMultiTariff
          ? multiSubData?.subscriptions !== undefined
          : dashboardSubscriptions.length > 0) && (
          <div className="space-y-3">
            <div className="grid gap-3.5" data-onboarding="connect-devices">
              {dashboardSubscriptions.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubscriptionAction('connect')}
                    disabled={
                      dashboardSubscriptions.length === 1 &&
                      dashboardSubscriptions[0].devicesLoading
                    }
                    className="napkin-btn"
                  >
                    {t('dashboard.simple.connectMain')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubscriptionAction('renew')}
                    className="napkin-btn-line"
                  >
                    {t('dashboard.simple.renewMain')}
                  </button>
                </>
              )}
              <Link to="/subscription/purchase?from=dashboard" className="napkin-btn-line">
                {hasAnySubscription
                  ? t('subscriptions.buyAnother', 'Купить ещё подписку')
                  : t('subscriptions.buySubscription', 'Купить подписку')}
              </Link>
            </div>

            <Sheet
              open={subscriptionAction !== null && dashboardSubscriptions.length > 1}
              onOpenChange={(open) => {
                if (!open) setSubscriptionAction(null);
              }}
            >
              <SheetContent className="mx-auto max-w-lg rounded-t-3xl" showCloseButton>
                <SheetHeader className="px-0 text-left">
                  <SheetTitle>{t('dashboard.simple.chooseSubscription')}</SheetTitle>
                  <SheetDescription>
                    {subscriptionAction === 'renew'
                      ? t('dashboard.simple.chooseForRenew')
                      : t('dashboard.simple.chooseForConnect')}
                  </SheetDescription>
                </SheetHeader>

                <div className="napkin-rows mt-3">
                  {dashboardSubscriptions.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        subscriptionAction && navigateToSubscriptionAction(subscriptionAction, sub)
                      }
                      disabled={subscriptionAction === 'connect' && sub.devicesLoading}
                      className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-dark-900 disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-dark-100">
                          {sub.title}
                        </span>
                        {getSubscriptionChoiceSubtitle(sub) && (
                          <span className="mt-0.5 block truncate text-sm text-dark-400">
                            {getSubscriptionChoiceSubtitle(sub)}
                          </span>
                        )}
                      </span>
                      <span className="font-hand text-3xl text-accent-500" aria-hidden="true">
                        →
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setSubscriptionAction(null)}
                  className="napkin-btn-line mt-4"
                >
                  {t('common.cancel')}
                </button>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Trial Activation */}
        {hasNoSubscription && !trialLoading && trialInfo?.is_available && (
          <TrialOfferCard
            trialInfo={trialInfo}
            balanceKopeks={balanceData?.balance_kopeks || 0}
            balanceRubles={balanceData?.balance_rubles || 0}
            activateTrialMutation={activateTrialMutation}
            trialError={trialError}
          />
        )}
      </div>

      <div className="mt-6 space-y-2 lg:mt-0">
        <h2 className="napkin-label pt-4 lg:pt-1">{t('dashboard.napkin.more')}</h2>
        <StatsGrid balanceRubles={balanceData?.balance_rubles || 0} />

        {wheelConfig?.is_enabled && (
          <Link
            to="/wheel"
            className="group flex items-center justify-between rounded-2xl border border-dark-700/60 bg-dark-900/70 p-4"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">🎰</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-dark-100">{t('wheel.banner.title')}</h3>
                <p className="text-sm text-dark-400">{t('wheel.banner.description')}</p>
              </div>
            </div>
            <div className="flex-shrink-0 text-dark-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent-400">
              <ChevronRightIcon />
            </div>
          </Link>
        )}
      </div>

      {showOnboarding && (
        <Onboarding
          steps={onboardingSteps}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
