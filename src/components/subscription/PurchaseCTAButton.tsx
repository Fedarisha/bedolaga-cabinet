import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Subscription } from '../../types';
import { needsTariff, tariffSelectionPath } from '../../utils/legacySubscription';

interface PurchaseCTAButtonProps {
  subscription: Subscription | null;
  /** In multi-tariff mode, link to /subscriptions/:id/renew instead of /subscription/purchase */
  isMultiTariff?: boolean;
}

export default function PurchaseCTAButton({
  subscription,
  isMultiTariff = false,
}: PurchaseCTAButtonProps) {
  const { t } = useTranslation();

  const isExpired =
    !subscription ||
    (!subscription.is_active && !subscription.is_trial && !subscription.is_limited);
  const isTrial = subscription?.is_trial;
  const isDaily = subscription?.is_daily;
  // Старая подписка (куплена в классике, тарифа нет): продлить нельзя — ведём на витрину тарифов.
  const requiresTariff = needsTariff(subscription);

  // Daily tariffs renew automatically — no manual renewal button needed in multi-tariff
  if (isMultiTariff && isDaily && !isExpired) return null;

  const buttonText = requiresTariff
    ? t('subscription.cta.moveToTariff')
    : isExpired
      ? t('subscription.getSubscription')
      : isTrial
        ? t('subscription.trialUpgrade.title')
        : t('subscription.extend');

  const hintText = isExpired
    ? t('subscription.cta.expiredHint')
    : requiresTariff
      ? t('subscription.cta.moveToTariffHint')
      : isTrial
        ? t('subscription.cta.trialHint')
        : isMultiTariff
          ? t('subscription.cta.renewHint', 'Продление подписки')
          : t('subscription.cta.activeHint');

  // Legacy (no tariff) → tariff catalog pinned to this subscription
  // Trial → purchase page (buy a real tariff, trial can't be renewed)
  // Multi-tariff active → per-subscription renew page
  // Otherwise → purchase page
  const linkTo =
    requiresTariff && subscription?.id
      ? tariffSelectionPath(subscription.id)
      : isTrial
        ? '/subscription/purchase'
        : isMultiTariff && subscription?.id
          ? `/subscriptions/${subscription.id}/renew`
          : '/subscription/purchase';

  // Истёкшая подписка — главное действие экрана (чернила), у живой — обводка.
  return (
    <Link to={linkTo} className={isExpired ? 'napkin-btn' : 'napkin-btn-line'} title={hintText}>
      {buttonText}
    </Link>
  );
}
