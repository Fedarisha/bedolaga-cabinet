import { safeLocal } from './safeStorage';
const ACCOUNT_LINKING_SUGGESTION_KEY = 'account_linking_suggestion_pending';

export const ACCOUNT_LINKING_SUGGESTION_URL = '/profile/accounts?legacyRecovery=1';

export function requestAccountLinkingSuggestion(): void {
  if (typeof window === 'undefined') return;
  safeLocal.setItem(ACCOUNT_LINKING_SUGGESTION_KEY, '1');
}

export function consumeAccountLinkingSuggestion(): boolean {
  if (typeof window === 'undefined') return false;
  const requested = safeLocal.getItem(ACCOUNT_LINKING_SUGGESTION_KEY) === '1';
  if (requested) {
    safeLocal.removeItem(ACCOUNT_LINKING_SUGGESTION_KEY);
  }
  return requested;
}
