import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useToast } from './Toast';
import {
  ACCOUNT_LINKING_SUGGESTION_URL,
  consumeAccountLinkingSuggestion,
} from '../utils/accountLinkingSuggestion';

export default function AccountLinkingSuggestionNotifier() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/profile/accounts') return;
    if (!consumeAccountLinkingSuggestion()) return;

    showToast({
      type: 'info',
      title: t('accountLinkingSuggestion.title'),
      message: t('accountLinkingSuggestion.message'),
      duration: 12000,
      onClick: () => navigate(ACCOUNT_LINKING_SUGGESTION_URL),
    });
  }, [location.pathname, navigate, showToast, t]);

  return null;
}
