const LEGACY_AUTH_RECOVERY_KEY = 'legacy_auth_recovery_requested';

export function requestLegacyAuthRecovery(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LEGACY_AUTH_RECOVERY_KEY, '1');
  localStorage.setItem(LEGACY_AUTH_RECOVERY_KEY, '1');
}

export function clearLegacyAuthRecovery(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LEGACY_AUTH_RECOVERY_KEY);
  localStorage.removeItem(LEGACY_AUTH_RECOVERY_KEY);
}

export function consumeLegacyAuthRecovery(): boolean {
  if (typeof window === 'undefined') return false;
  const requested =
    sessionStorage.getItem(LEGACY_AUTH_RECOVERY_KEY) === '1' ||
    localStorage.getItem(LEGACY_AUTH_RECOVERY_KEY) === '1';
  if (requested) {
    clearLegacyAuthRecovery();
  }
  return requested;
}

export function hasLegacyAuthRecoveryRequest(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem(LEGACY_AUTH_RECOVERY_KEY) === '1' ||
    localStorage.getItem(LEGACY_AUTH_RECOVERY_KEY) === '1'
  );
}

export const LEGACY_AUTH_RECOVERY_RETURN_URL = '/profile/accounts?legacyRecovery=1';
