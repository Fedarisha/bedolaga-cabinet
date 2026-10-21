import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { useShallow } from 'zustand/shallow';
import { authApi } from '../api/auth';
import { isValidEmail } from '../utils/validation';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
  type BrandingInfo,
  type EmailAuthEnabled,
} from '../api/branding';
import { useLogoBlobUrl } from '../hooks/useLogoBlobUrl';
import { getAndClearReturnUrl } from '../utils/token';
import { getApiErrorMessage } from '../utils/api-error';
import { getTelegramInitData, isInTelegramWebApp, useTelegramSDK } from '../hooks/useTelegramSDK';
import LanguageSwitcher from '../components/LanguageSwitcher';
import OAuthProviderIcon from '../components/OAuthProviderIcon';
import { saveOAuthState } from '../utils/oauth';
import { getPendingReferralCode } from '../utils/referral';
import {
  LEGACY_AUTH_RECOVERY_RETURN_URL,
  clearLegacyAuthRecovery,
  consumeLegacyAuthRecovery,
  hasLegacyAuthRecoveryRequest,
  requestLegacyAuthRecovery,
} from '../utils/legacyAuthRecovery';
import { requestAccountLinkingSuggestion } from '../utils/accountLinkingSuggestion';

const BLOCKED_LOGIN_PROVIDERS = new Set(['google', 'telegram']);

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAuthenticated,
    isAuthInitializing,
    loginWithEmail,
    loginWithTelegram,
    registerWithEmail,
  } = useAuthStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      isAuthInitializing: state.isLoading,
      loginWithEmail: state.loginWithEmail,
      loginWithTelegram: state.loginWithTelegram,
      registerWithEmail: state.registerWithEmail,
    })),
  );

  // Get referral code from localStorage (captured from ?ref= param at module level in auth store)
  const referralCode = getPendingReferralCode() || '';

  const [authMode, setAuthMode] = useState<'login' | 'register'>(() =>
    referralCode ? 'register' : 'login',
  );
  const [email, setEmail] = useState('');
  const [emailStep, setEmailStep] = useState<'email' | 'password'>('email');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(() => isLogoPreloaded());
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [agreePersonalData, setAgreePersonalData] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [isLegacyRecoveryOpen, setIsLegacyRecoveryOpen] = useState(false);
  const [openAccountsAfterLogin, setOpenAccountsAfterLogin] = useState(false);
  const isManualLoginRedirectRef = useRef(false);
  // Автовход Mini App выполняется — форму входа в это время показывать нельзя,
  // иначе пользователь на долю секунды видит Яндекс/VK и успевает нажать.
  const [telegramAuthPending, setTelegramAuthPending] = useState(false);
  const telegramAuthStartedRef = useRef(false);

  // Telegram safe area insets
  const { safeAreaInset, contentSafeAreaInset } = useTelegramSDK();
  const safeTop = Math.max(safeAreaInset.top, contentSafeAreaInset.top);
  const safeBottom = Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom);

  // Получаем URL для возврата после авторизации
  const getReturnUrl = useCallback(() => {
    if (consumeLegacyAuthRecovery()) {
      return LEGACY_AUTH_RECOVERY_RETURN_URL;
    }
    // Сначала проверяем state от React Router
    const stateFrom = (location.state as { from?: string })?.from;
    if (stateFrom && stateFrom !== '/login') {
      return stateFrom;
    }
    // Затем проверяем сохранённый URL в sessionStorage (от safeRedirectToLogin)
    const savedUrl = getAndClearReturnUrl();
    if (savedUrl && savedUrl !== '/login') {
      return savedUrl;
    }
    // По умолчанию на главную
    return '/';
  }, [location.state]);

  // Fetch branding with unified cache
  const cachedBranding = useMemo(() => getCachedBranding(), []);

  const { data: branding } = useQuery<BrandingInfo>({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding();
      setCachedBranding(data);
      await preloadLogo(data);
      return data;
    },
    staleTime: 60000,
    initialData: cachedBranding ?? undefined,
    initialDataUpdatedAt: 0,
  });

  // Check if email auth is enabled
  const { data: emailAuthConfig } = useQuery<EmailAuthEnabled>({
    queryKey: ['email-auth-enabled'],
    queryFn: brandingApi.getEmailAuthEnabled,
    staleTime: 60000,
  });
  const isEmailAuthEnabled = emailAuthConfig?.enabled ?? true;

  // Fetch enabled OAuth providers
  const { data: oauthData } = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: authApi.getOAuthProviders,
    staleTime: 60000,
  });
  const oauthProviders = Array.isArray(oauthData?.providers)
    ? oauthData.providers.filter((provider) => !BLOCKED_LOGIN_PROVIDERS.has(provider.name))
    : [];

  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: string) => {
    setError('');
    setOauthLoading(provider);
    try {
      const { authorize_url, state } = await authApi.getOAuthAuthorizeUrl(provider);

      // Validate redirect URL — only allow HTTPS to prevent open redirect
      let parsed: URL;
      try {
        parsed = new URL(authorize_url);
      } catch {
        throw new Error('Invalid OAuth redirect URL');
      }
      if (parsed.protocol !== 'https:') {
        throw new Error('Invalid OAuth redirect URL');
      }

      saveOAuthState(state, provider);
      window.location.href = authorize_url;
    } catch {
      setError(t('auth.oauthError', 'Authorization was denied or failed'));
      setOauthLoading(null);
    }
  };

  const appName = branding ? branding.name : import.meta.env.VITE_APP_NAME || 'VPN';
  const appLogo = branding?.logo_letter || import.meta.env.VITE_APP_LOGO || 'V';
  const logoUrl = useLogoBlobUrl();

  // Set document title
  useEffect(() => {
    document.title = appName || 'VPN';
  }, [appName]);

  useEffect(() => {
    clearLegacyAuthRecovery();
  }, []);

  useEffect(() => {
    if (isManualLoginRedirectRef.current) return;
    if (isAuthenticated) {
      navigate(getReturnUrl(), { replace: true });
    }
  }, [isAuthenticated, navigate, getReturnUrl]);

  // Автовход в Telegram Mini App по initData.
  //
  // Кнопки бота открывают кабинет на обычных маршрутах (корень, /balance,
  // /subscription…), а ProtectedRoute уводит неавторизованного сюда. Без этого
  // эффекта у пользователя БЕЗ сохранённой сессии вход в Mini App невозможен
  // вообще: initialize() умеет только восстановить старую сессию, а OAuth
  // (Яндекс/VK) внутри WebView не доводится до конца — state лежит в
  // sessionStorage, а провайдер открывается вне вебвью, и OAuthCallback
  // сваливается в ветку привязки аккаунта вместо логина.
  //
  // Вне Telegram эффект не срабатывает (нет initData), поэтому на сайте
  // остаётся прежняя форма: Яндекс/VK/почта.
  useEffect(() => {
    // Ждём окончания bootstrap: иначе гонка со сбросом протухших токенов.
    if (isAuthInitializing) return;
    if (telegramAuthStartedRef.current) return;

    const initData = getTelegramInitData();
    if (!isInTelegramWebApp() || !initData) return;

    telegramAuthStartedRef.current = true;
    setTelegramAuthPending(true);

    const tryTelegramAuth = async () => {
      // Одна повторная попытка: сразу после запуска Mini App бэкенд иногда
      // отвечает 401 на ещё не осевшую сессию.
      const MAX_RETRIES = 1;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Редирект делаем сами — иначе эффект выше повторно вызовет
          // getReturnUrl(), а тот одноразовый и вернёт уже '/'.
          isManualLoginRedirectRef.current = true;
          await loginWithTelegram(initData);
          navigate(getReturnUrl(), { replace: true });
          return;
        } catch (err) {
          isManualLoginRedirectRef.current = false;
          const status = (err as { response?: { status?: number } }).response?.status;
          if (status === 401 && attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          setError(getApiErrorMessage(err, '') || t('auth.telegramRequired'));
        }
      }
      // Не получилось — показываем обычную форму с текстом ошибки сверху,
      // чтобы у пользователя остался запасной вход.
      setTelegramAuthPending(false);
    };

    void tryTelegramAuth();
  }, [isAuthInitializing, loginWithTelegram, navigate, getReturnUrl, t]);

  const handleLegacyRecoveryOpenToggle = () => {
    const shouldOpen = !isLegacyRecoveryOpen;
    setIsLegacyRecoveryOpen(shouldOpen);
    setOpenAccountsAfterLogin(shouldOpen);
    if (shouldOpen) {
      requestLegacyAuthRecovery();
    } else {
      clearLegacyAuthRecovery();
    }
  };

  const handleLegacyRecoveryToggle = (checked: boolean) => {
    setOpenAccountsAfterLogin(checked);
    if (checked) {
      requestLegacyAuthRecovery();
    } else {
      clearLegacyAuthRecovery();
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация email
    if (!email.trim() || !isValidEmail(email.trim())) {
      setError(t('auth.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    if (authMode === 'register') {
      // Валидация для регистрации
      if (password !== confirmPassword) {
        setError(t('auth.passwordMismatch', 'Passwords do not match'));
        return;
      }
      if (password.length < 8) {
        setError(t('auth.passwordTooShort', 'Password must be at least 8 characters'));
        return;
      }
      if (!agreePersonalData) {
        setError(
          t('auth.mustAgreePersonalData', 'You must agree to the processing of personal data'),
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      if (authMode === 'login') {
        isManualLoginRedirectRef.current = true;
        await loginWithEmail(email, password);
        const returnUrl = getReturnUrl();
        if (returnUrl !== LEGACY_AUTH_RECOVERY_RETURN_URL) {
          requestAccountLinkingSuggestion();
        }
        navigate(returnUrl, { replace: true });
      } else {
        const result = await registerWithEmail(
          email,
          password,
          firstName || undefined,
          referralCode || undefined,
        );
        if (!hasLegacyAuthRecoveryRequest()) {
          requestAccountLinkingSuggestion();
        }
        // Show "check your email" screen
        setRegisteredEmail(result.email);
      }
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      if (status === 400 && detail?.includes('already registered')) {
        setError(t('auth.emailAlreadyRegistered', 'This email is already registered'));
      } else if (status === 401 || status === 403) {
        if (detail?.includes('verify your email')) {
          setError(t('auth.emailNotVerified', 'Please verify your email first'));
        } else {
          setError(t('auth.invalidCredentials', 'Invalid email or password'));
        }
      } else if (status === 429) {
        setError(t('auth.tooManyAttempts', 'Too many attempts. Please try again later'));
      } else {
        setError(detail || t('common.error'));
      }
    } finally {
      isManualLoginRedirectRef.current = false;
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError('');

    if (!forgotPasswordEmail.trim() || !isValidEmail(forgotPasswordEmail.trim())) {
      setForgotPasswordError(t('auth.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await authApi.forgotPassword(forgotPasswordEmail.trim());
      setForgotPasswordSent(true);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      const detail = error.response?.data?.detail;
      setForgotPasswordError(detail || t('common.error'));
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordSent(false);
    setForgotPasswordError('');
  };

  // Идёт автовход по initData — форму входа не показываем.
  if (telegramAuthPending) {
    return (
      <div className="min-h-viewport flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
        <div className="relative text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          <h2 className="text-lg font-semibold text-dark-50">{appName}</h2>
          <p className="mt-2 text-sm text-dark-400">{t('auth.authenticating')}</p>
        </div>
      </div>
    );
  }

  // Брендовые кнопки входа: фирменные цвета Яндекс ID и VK ID, остальные — обводкой.
  const providerButtonClass = (name: string) =>
    name === 'yandex'
      ? 'bg-black text-white'
      : name === 'vk'
        ? 'bg-[#0077ff] text-white'
        : 'border-2 border-dark-100 text-dark-100';
  const providerLabel = (name: string, displayName: string) =>
    name === 'yandex'
      ? t('auth.napkin.withYandex')
      : name === 'vk'
        ? t('auth.napkin.withVk')
        : t('auth.napkin.withProvider', { provider: displayName });

  // Вход по почте — по одному полю: сначала почта, потом пароль. Регистрация — вся форма сразу.
  const handleMailForm = (e: React.FormEvent) => {
    if (authMode === 'login' && emailStep === 'email') {
      e.preventDefault();
      if (!isValidEmail(email)) {
        setError(t('auth.invalidEmail', 'Please enter a valid email address'));
        return;
      }
      setError('');
      setEmailStep('password');
      return;
    }
    void handleEmailSubmit(e);
  };

  const legalLinks = (
    <nav className="flex flex-wrap gap-x-4 gap-y-1">
      <Link to="/support" className="transition-colors hover:text-dark-200">
        {t('nav.support')}
      </Link>
      <Link to="/info?tab=rules" className="transition-colors hover:text-dark-200">
        {t('info.rules')}
      </Link>
      <Link to="/info?tab=privacy" className="transition-colors hover:text-dark-200">
        {t('info.privacy')}
      </Link>
      <Link to="/info?tab=offer" className="transition-colors hover:text-dark-200">
        {t('info.offer')}
      </Link>
      <Link to="/info?tab=personal-data" className="transition-colors hover:text-dark-200">
        {t('info.personalData')}
      </Link>
    </nav>
  );

  return (
    <div
      className="min-h-[100dvh] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]"
      style={{
        paddingTop:
          safeTop > 0 ? `${safeTop + 16}px` : 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom:
          safeBottom > 0
            ? `${safeBottom + 16}px`
            : 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="relative mx-auto w-full max-w-[920px]">
        {/* Logo & branding */}
        <div className="flex items-center gap-2.5 py-1.5">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
            <span
              className={`absolute font-display text-base font-extrabold text-accent-500 transition-opacity duration-200 ${branding?.has_custom_logo && logoLoaded ? 'opacity-0' : 'opacity-100'}`}
            >
              {appLogo}
            </span>
            {branding?.has_custom_logo && logoUrl && (
              <img
                src={logoUrl}
                alt=""
                className={`absolute h-full w-full object-contain transition-opacity duration-200 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLogoLoaded(true)}
              />
            )}
          </span>
          {appName && (
            <span className="font-display text-base font-extrabold tracking-wide text-dark-100">
              {appName}
            </span>
          )}
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        <h1 className="mb-5 mt-7 text-4xl font-extrabold text-dark-50">
          {registeredEmail
            ? t('auth.checkEmail', 'Check your email')
            : authMode === 'register'
              ? t('auth.register', 'Register')
              : t('auth.napkin.title')}
        </h1>

        {/* Referral Banner */}
        {referralCode && isEmailAuthEnabled && !registeredEmail && (
          <p className="hand -mt-2 mb-5 text-2xl">{t('auth.referralInvite')}</p>
        )}

        {registeredEmail ? (
          /* Check Email Screen */
          <div className="napkin napkin-tilt max-w-md">
            <p className="text-base text-dark-400">
              {t('auth.verificationSent', 'We sent a verification link to:')}
            </p>
            <p className="mt-1 text-lg font-semibold text-accent-500">{registeredEmail}</p>
            <p className="mb-5 mt-3 text-base text-dark-400">
              {t(
                'auth.clickLinkToVerify',
                'Click the link in the email to verify your account and log in.',
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setRegisteredEmail(null);
                setAuthMode('login');
                setEmailStep('email');
              }}
              className="napkin-btn-line"
            >
              {t('auth.backToLogin', 'Back to login')}
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-12">
            {/* OAuth providers */}
            {oauthProviders.length > 0 && (
              <div className="grid gap-3.5">
                {oauthProviders.map((provider) => (
                  <button
                    key={provider.name}
                    type="button"
                    onClick={() => handleOAuthLogin(provider.name)}
                    disabled={oauthLoading !== null}
                    className={`flex min-h-[60px] w-full items-center justify-center gap-3 rounded-[14px] px-5 text-lg font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${providerButtonClass(provider.name)}`}
                  >
                    {oauthLoading === provider.name ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : provider.name === 'vk' ? (
                      <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
                        <path
                          d="M0 23.04C0 12.18 0 6.75 3.37 3.37 6.75 0 12.18 0 23.04 0h1.92C35.82 0 41.25 0 44.63 3.37 48 6.75 48 12.18 48 23.04v1.92c0 10.86 0 16.29-3.37 19.67C41.25 48 35.82 48 24.96 48h-1.92c-10.86 0-16.29 0-19.67-3.37C0 41.25 0 35.82 0 24.96v-1.92Z"
                          fill="#fff"
                        />
                        <path
                          d="M25.54 34.58C14.6 34.58 8.36 27.08 8.1 14.6h5.48c.18 9.16 4.22 13.04 7.42 13.84V14.6h5.16v7.9c3.16-.34 6.48-3.94 7.6-7.9h5.16c-.86 4.88-4.46 8.48-7.02 9.96 2.56 1.2 6.66 4.34 8.22 10.02h-5.68c-1.22-3.8-4.26-6.74-8.28-7.14v7.14h-.62Z"
                          fill="#0077FF"
                        />
                      </svg>
                    ) : (
                      <OAuthProviderIcon provider={provider.name} className="h-7 w-7" />
                    )}
                    <span>{providerLabel(provider.name, provider.display_name)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Email auth section */}
            {isEmailAuthEnabled && (
              <div>
                {oauthProviders.length > 0 && (
                  <div className="mb-3.5 flex items-center gap-3 text-base text-dark-400 lg:hidden">
                    <span className="flex-1 border-t-[1.5px] border-dashed border-dark-700" />
                    {t('auth.napkin.orEmail')}
                    <span className="flex-1 border-t-[1.5px] border-dashed border-dark-700" />
                  </div>
                )}
                {oauthProviders.length > 0 && (
                  <p className="mb-3.5 hidden text-base text-dark-400 lg:block">
                    {t('auth.napkin.orEmail')}
                  </p>
                )}

                {error && (
                  <div className="mb-4 rounded-xl border-2 border-error-600 px-4 py-2.5 text-base text-error-700">
                    {error}
                  </div>
                )}

                {showForgotPassword ? (
                  forgotPasswordSent ? (
                    <div className="napkin napkin-tilt">
                      <p className="text-lg font-semibold text-dark-100">
                        {t('auth.checkEmail', 'Check your email')}
                      </p>
                      <p className="mb-5 mt-2 text-base text-dark-400">
                        {t(
                          'auth.passwordResetSent',
                          'If an account exists with this email, we sent password reset instructions.',
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={closeForgotPasswordModal}
                        className="napkin-btn-line"
                      >
                        {t('common.back', 'Back')}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="napkin napkin-tilt grid gap-4">
                      <p className="text-base text-dark-400">
                        {t(
                          'auth.forgotPasswordHint',
                          'Enter your email and we will send you instructions to reset your password.',
                        )}
                      </p>
                      <div>
                        <label htmlFor="forgotEmail" className="label">
                          {t('auth.napkin.emailLabel')}
                        </label>
                        <input
                          id="forgotEmail"
                          type="email"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          placeholder="ivan@mail.ru"
                          className="input"
                          autoFocus
                        />
                      </div>
                      {forgotPasswordError && (
                        <p className="text-base text-error-700">{forgotPasswordError}</p>
                      )}
                      <button type="submit" disabled={forgotPasswordLoading} className="napkin-btn">
                        {forgotPasswordLoading
                          ? t('common.loading')
                          : t('auth.sendResetLink', 'Send reset link')}
                      </button>
                      <button
                        type="button"
                        onClick={closeForgotPasswordModal}
                        className="justify-self-center text-base text-accent-500 underline underline-offset-4"
                      >
                        {t('common.back', 'Back')}
                      </button>
                    </form>
                  )
                ) : (
                  <>
                    <form
                      className="napkin napkin-tilt grid gap-4"
                      onSubmit={handleMailForm}
                      noValidate
                    >
                      {authMode === 'login' && emailStep === 'password' ? (
                        <button
                          type="button"
                          onClick={() => setEmailStep('email')}
                          className="justify-self-start rounded-full border-[1.5px] border-dashed border-dark-700 px-3.5 py-2 text-base text-dark-100"
                        >
                          {email}{' '}
                          <u className="ml-1.5 text-accent-500 underline-offset-4">
                            {t('auth.napkin.changeEmail')}
                          </u>
                        </button>
                      ) : (
                        <div>
                          <label htmlFor="email" className="label">
                            {t('auth.napkin.emailLabel')}
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            required
                            className="input"
                            placeholder="ivan@mail.ru"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      )}

                      {authMode === 'register' && (
                        <div>
                          <label htmlFor="firstName" className="label">
                            {t('auth.firstName', 'First Name')}
                          </label>
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            autoComplete="given-name"
                            className="input"
                            placeholder={t('auth.firstNamePlaceholder', 'Your name (optional)')}
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                        </div>
                      )}

                      {(authMode === 'register' || emailStep === 'password') && (
                        <div>
                          <label htmlFor="password" className="label">
                            {authMode === 'register'
                              ? t('auth.napkin.newPassword')
                              : t('auth.password')}
                          </label>
                          <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete={
                              authMode === 'login' ? 'current-password' : 'new-password'
                            }
                            required
                            autoFocus={authMode === 'login'}
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          {authMode === 'register' &&
                            password.length > 0 &&
                            password.length < 8 && (
                              <p className="mt-1.5 text-sm text-error-700">
                                {t(
                                  'auth.passwordTooShort',
                                  'Password must be at least 8 characters',
                                )}
                              </p>
                            )}
                        </div>
                      )}

                      {authMode === 'register' && (
                        <div>
                          <label htmlFor="confirmPassword" className="label">
                            {t('auth.confirmPassword', 'Confirm Password')}
                          </label>
                          <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            className="input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      )}

                      {authMode === 'register' && (
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreePersonalData}
                            onChange={(e) => setAgreePersonalData(e.target.checked)}
                            className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer accent-accent-500"
                          />
                          <span className="text-base text-dark-400">
                            {t('auth.napkin.agree')}{' '}
                            <Link
                              to="/info?tab=personal-data"
                              target="_blank"
                              className="text-accent-500 underline underline-offset-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t('auth.napkin.personalDataLink')}
                            </Link>
                          </span>
                        </label>
                      )}

                      <button type="submit" disabled={isLoading} className="napkin-btn">
                        {isLoading
                          ? t('common.loading')
                          : authMode === 'register'
                            ? t('auth.napkin.createAccount')
                            : emailStep === 'email'
                              ? t('auth.napkin.continue')
                              : t('auth.login')}
                      </button>

                      {authMode === 'register' && (
                        <p className="text-sm text-dark-400">
                          {t(
                            'auth.verificationEmailNotice',
                            'After registration, a verification email will be sent to your address',
                          )}
                        </p>
                      )}

                      {authMode === 'login' && emailStep === 'password' && (
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="justify-self-center text-base text-accent-500 underline underline-offset-4"
                        >
                          {t('auth.forgotPassword', 'Forgot password?')}
                        </button>
                      )}
                    </form>

                    <p className="mt-5 text-center text-base text-dark-400">
                      {authMode === 'login'
                        ? t('auth.napkin.firstTime')
                        : t('auth.napkin.haveAccount')}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setEmailStep('email');
                          setAuthMode(authMode === 'login' ? 'register' : 'login');
                        }}
                        className="font-semibold text-accent-500 underline underline-offset-4"
                      >
                        {authMode === 'login' ? t('auth.napkin.createAccount') : t('auth.login')}
                      </button>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Legacy provider recovery */}
        {!registeredEmail && (
          <div className="mt-8 border-t-[1.5px] border-dashed border-dark-700 pt-4">
            <button
              type="button"
              onClick={handleLegacyRecoveryOpenToggle}
              className="flex w-full items-center gap-2 text-left text-base font-medium text-dark-100"
              aria-expanded={isLegacyRecoveryOpen}
            >
              <span>{t('auth.legacyLoginQuestion', 'Входили через Google или Telegram?')}</span>
              <span className="font-hand text-xl text-accent-500" aria-hidden="true">
                {isLegacyRecoveryOpen ? '↑' : '↓'}
              </span>
            </button>
            {isLegacyRecoveryOpen && (
              <div className="mt-2 max-w-[46ch] space-y-3 text-base text-dark-400">
                <p>{t('auth.napkin.legacyShort')}</p>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={openAccountsAfterLogin}
                    onChange={(event) => handleLegacyRecoveryToggle(event.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-accent-500"
                  />
                  <span>{t('auth.openAccountsAfterLogin')}</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Legal links footer */}
        <div className="mt-8 grid gap-1.5 border-t-[1.5px] border-dashed border-dark-700 pt-4 text-sm text-dark-400">
          {import.meta.env.VITE_LEGAL_INFO && <span>{import.meta.env.VITE_LEGAL_INFO}</span>}
          {legalLinks}
        </div>
      </div>
    </div>
  );
}
