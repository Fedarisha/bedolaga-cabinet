import { safeLocal, safeSession } from './safeStorage';
const LEGACY_AUTH_RECOVERY_KEY = 'legacy_auth_recovery_requested';

export function requestLegacyAuthRecovery(): void {
  if (typeof window === 'undefined') return;
  safeSession.setItem(LEGACY_AUTH_RECOVERY_KEY, '1');
  safeLocal.setItem(LEGACY_AUTH_RECOVERY_KEY, '1');
}

export function clearLegacyAuthRecovery(): void {
  if (typeof window === 'undefined') return;
  safeSession.removeItem(LEGACY_AUTH_RECOVERY_KEY);
  safeLocal.removeItem(LEGACY_AUTH_RECOVERY_KEY);
}

export function consumeLegacyAuthRecovery(): boolean {
  if (typeof window === 'undefined') return false;
  const requested =
    safeSession.getItem(LEGACY_AUTH_RECOVERY_KEY) === '1' ||
    safeLocal.getItem(LEGACY_AUTH_RECOVERY_KEY) === '1';
  if (requested) {
    clearLegacyAuthRecovery();
  }
  return requested;
}

export function hasLegacyAuthRecoveryRequest(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    safeSession.getItem(LEGACY_AUTH_RECOVERY_KEY) === '1' ||
    safeLocal.getItem(LEGACY_AUTH_RECOVERY_KEY) === '1'
  );
}

export const LEGACY_AUTH_RECOVERY_RETURN_URL = '/profile/accounts?legacyRecovery=1';
