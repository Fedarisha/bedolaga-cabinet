import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { HIDDEN_UNDER_KEYBOARD, useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';

import { HomeIcon, SubscriptionIcon, WalletIcon, UsersIcon, ChatIcon, WheelIcon } from './icons';
import type { MobileNavItem, MobileNavKey } from './mobileNavRoutes';

type NavIcon = React.ComponentType<{ className?: string }>;

const ICONS: Record<MobileNavKey, NavIcon> = {
  dashboard: HomeIcon,
  subscription: SubscriptionIcon,
  balance: WalletIcon,
  wheel: WheelIcon,
  referral: UsersIcon,
  support: ChatIcon,
};

interface MobileBottomNavProps {
  /** Экраны панели — из mobileNavItems(); AppShell рендерит панель только на них. */
  items: readonly MobileNavItem[];
  /** Открыто выезжающее меню шапки: у него есть все те же пункты, панель поверх него лишняя. */
  isMenuOpen?: boolean;
}

export function MobileBottomNav({ items, isMenuOpen = false }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { haptic } = usePlatform();
  const isKeyboardOpen = useVirtualKeyboard();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleNavClick = () => {
    haptic.impact('light');
  };

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 transition-all duration-200 lg:hidden',
        // «Салфетка»: панель прижата к низу, отделена графитовой линией
        'border-t-2 border-dark-100 bg-dark-950',
        isKeyboardOpen || isMenuOpen ? HIDDEN_UNDER_KEYBOARD : 'opacity-100',
      )}
      style={{
        // Панель стоит вплотную к низу; безопасная зона (индикатор «Домой» iOS)
        // и боковые вырезы в альбомной ориентации — внутренними отступами.
        paddingTop: '4px',
        paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(8px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(8px, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="flex justify-around">
        {items.map((item) => {
          const Icon = ICONS[item.key];
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                // На 360 пяти пунктам достаётся по ~64 px: при px-3 подпись
                // «Колесо удачи» заходила на соседа. Боковых полей нет (подсветка —
                // по всему пункту), подпись короткая (navShort), а если и она не
                // влезла — многоточие, не наезд.
                'relative flex min-w-0 flex-1 flex-col items-center justify-center px-0 py-2 transition-colors duration-200',
                isActive(item.path)
                  ? 'font-semibold text-accent-500'
                  : 'text-dark-400 hover:text-dark-200',
              )}
            >
              <Icon className="h-6 w-6" />
              <span
                className={cn(
                  'mt-1 max-w-full truncate px-0.5 text-xs',
                  // Активный пункт подчёркнут маркером
                  isActive(item.path) &&
                    'bg-[linear-gradient(transparent_55%,rgb(var(--napkin-marker))_55%)]',
                )}
              >
                {t(`navShort.${item.key}`, { defaultValue: t(`nav.${item.key}`) })}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
