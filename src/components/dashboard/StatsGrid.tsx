import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useCurrency } from '../../hooks/useCurrency';

interface StatsGridProps {
  balanceRubles: number;
}

const WalletIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 14h.01M10 14h.01" />
  </svg>
);

const HelpIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    <path d="M9 9h6M9 13h4" />
  </svg>
);

const LinkAccountsIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const PeopleIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function StatsGrid({ balanceRubles }: StatsGridProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();

  const cards = [
    {
      title: t('dashboard.simple.balanceTitle'),
      description: `${formatAmount(balanceRubles)} ${currencySymbol} · ${t('dashboard.simple.balanceHint')}`,
      to: '/balance',
      icon: WalletIcon,
      onboarding: 'balance',
    },
    {
      title: t('dashboard.simple.accountsTitle'),
      description: t('dashboard.simple.accountsHint'),
      to: '/profile/accounts',
      icon: LinkAccountsIcon,
    },
    {
      title: t('dashboard.simple.supportTitle'),
      description: `${t('dashboard.simple.supportValue').toLocaleLowerCase()} ${t('dashboard.simple.supportHint')}`,
      to: '/support',
      icon: HelpIcon,
    },
    {
      title: t('dashboard.simple.referralTitle'),
      description: t('dashboard.simple.referralHint'),
      to: '/referral',
      icon: PeopleIcon,
    },
  ];

  return (
    <div className="napkin-rows">
      {cards.map((card, i) => (
        <Link
          key={i}
          to={card.to}
          className="group grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-lg px-1 py-3 transition-colors hover:bg-dark-900"
          data-onboarding={card.onboarding}
        >
          <span className="flex h-11 w-11 items-center justify-center text-accent-500">
            <card.icon />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold leading-tight text-dark-100">
              {card.title}
            </span>
            <span className="mt-0.5 block text-sm leading-snug text-dark-400">
              {card.description}
            </span>
          </span>
          <span
            className="font-hand text-3xl text-accent-500 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
