import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import type {
  AppConfig,
  LocalizedText,
  RemnawaveAppClient,
  RemnawavePlatformData,
  RemnawaveButtonClient,
} from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { NapkinStepsBlock, BlockButtons } from './blocks';
import type { RenderBlock } from './blocks';
import TvQuickConnect from './TvQuickConnect';
import { BackIcon, BookOpenIcon } from '@/components/icons';

const platformOrder = ['ios', 'android', 'windows', 'macos', 'linux', 'androidTV', 'appleTV'];

function detectPlatform(): string | null {
  if (typeof window === 'undefined' || !navigator?.userAgent) return null;
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return /tv|television/.test(ua) ? 'androidTV' : 'android';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/windows/.test(ua)) return 'windows';
  if (/linux/.test(ua)) return 'linux';
  return null;
}

/** TV quick-connect is a Happ-only feature (check.happ.su/sendtv) — show it only
 *  for the Happ app, detected by its happ:// deep-link scheme (name as fallback). */
function isHappApp(app: RemnawaveAppClient | null): boolean {
  if (!app) return false;
  if ((app.deepLink ?? '').toLowerCase().startsWith('happ://')) return true;
  return app.name.toLowerCase().includes('happ');
}

const PLATFORM_ICON_PATHS: Record<string, string> = {
  ios: 'M10 4.5h10a2.5 2.5 0 0 1 2.5 2.5v16a2.5 2.5 0 0 1-2.5 2.5H10A2.5 2.5 0 0 1 7.5 23V7A2.5 2.5 0 0 1 10 4.5Zm3 18h4',
  android:
    'M10 4.5h10a2.5 2.5 0 0 1 2.5 2.5v16a2.5 2.5 0 0 1-2.5 2.5H10A2.5 2.5 0 0 1 7.5 23V7A2.5 2.5 0 0 1 10 4.5Zm2 3.5h6',
  windows: 'M5 6h20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm6 20h8m-4-5v5',
  macos: 'M7 7h16a2 2 0 0 1 2 2v10H5V9a2 2 0 0 1 2-2ZM2.5 23h25',
  linux:
    'M5 5h20a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 6 4 3-4 3m6 1h6',
  androidTV: 'M5 5h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 21h12',
  appleTV:
    'M5 5h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 21h12M13 11v5m4-5v5',
};

function PlatformIcon({ platform }: { platform: string }) {
  const d = PLATFORM_ICON_PATHS[platform];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 30 30"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <path d={d} />
    </svg>
  );
}

interface Props {
  appConfig: AppConfig;
  onOpenDeepLink: (url: string) => void;
  isTelegramWebApp: boolean;
  onGoBack: () => void;
  onOpenQR?: () => void;
  username?: string;
}

export default function InstallationGuide({
  appConfig,
  onOpenDeepLink,
  isTelegramWebApp,
  onGoBack,
  onOpenQR,
  username,
}: Props) {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();

  const detectedPlatform = useMemo(() => detectPlatform(), []);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const [activePlatformKey, setActivePlatformKey] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<RemnawaveAppClient | null>(null);
  const [platformsOpen, setPlatformsOpen] = useState(false);

  const getLocalizedText = useCallback(
    (text: LocalizedText | undefined): string => {
      if (!text) return '';
      const lang = i18n.language || 'ru';
      return text[lang] || text['ru'] || Object.values(text)[0] || '';
    },
    [i18n.language],
  );

  const getBaseTranslation = useCallback(
    (key: string, i18nKey: string): string => {
      const bt = appConfig.baseTranslations;
      if (bt && key in bt) {
        const text = getLocalizedText(bt[key as keyof typeof bt] as LocalizedText);
        if (text) return text;
      }
      return t(i18nKey);
    },
    [appConfig.baseTranslations, getLocalizedText, t],
  );

  const getSvgHtml = useCallback(
    (svgKey: string | undefined): string => {
      if (!svgKey || !appConfig.svgLibrary?.[svgKey]) return '';
      const entry = appConfig.svgLibrary[svgKey];
      const raw = typeof entry === 'string' ? entry : entry.svgString;
      if (!raw) return '';
      return DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } });
    },
    [appConfig.svgLibrary],
  );

  const availablePlatforms = useMemo(() => {
    if (!appConfig.platforms) return [];
    const available = platformOrder.filter((key) => {
      const data = appConfig.platforms[key] as RemnawavePlatformData | undefined;
      return data && data.apps && data.apps.length > 0;
    });
    if (detectedPlatform && available.includes(detectedPlatform)) {
      return [detectedPlatform, ...available.filter((p) => p !== detectedPlatform)];
    }
    return available;
  }, [appConfig.platforms, detectedPlatform]);

  useEffect(() => {
    if (selectedApp || !availablePlatforms.length) return;
    const platform = availablePlatforms[0];
    const data = appConfig.platforms[platform] as RemnawavePlatformData | undefined;
    if (!data?.apps?.length) return;
    const app = data.apps.find((a) => a.featured) || data.apps[0];
    if (app) {
      setSelectedApp(app);
      setActivePlatformKey(platform);
    }
  }, [appConfig.platforms, availablePlatforms, selectedApp]);

  const renderBlockButtons = useCallback(
    (buttons: RemnawaveButtonClient[] | undefined, variant: 'light' | 'subtle') => (
      <BlockButtons
        buttons={buttons}
        variant={variant}
        isLight={isLight}
        subscriptionUrl={appConfig.subscriptionUrl}
        hideLink={appConfig.hideLink}
        deepLink={selectedApp?.deepLink}
        username={username}
        getLocalizedText={getLocalizedText}
        getBaseTranslation={getBaseTranslation}
        getSvgHtml={getSvgHtml}
        onOpenDeepLink={onOpenDeepLink}
      />
    ),
    [
      appConfig.subscriptionUrl,
      appConfig.hideLink,
      selectedApp?.deepLink,
      username,
      isLight,
      getLocalizedText,
      getBaseTranslation,
      getSvgHtml,
      onOpenDeepLink,
    ],
  );

  const userIsOnTv = detectedPlatform === 'androidTV' || detectedPlatform === 'appleTV';
  // Happ's TV quick-connect (check.happ.su/sendtv) is ONE API serving BOTH
  // Android TV and Apple TV — show the widget on either.
  const selectedPlatform = activePlatformKey || availablePlatforms[0];
  const isTvLayout =
    (selectedPlatform === 'androidTV' || selectedPlatform === 'appleTV') && !userIsOnTv;

  const currentPlatformKey = activePlatformKey || availablePlatforms[0];
  const currentPlatformData = currentPlatformKey
    ? (appConfig.platforms[currentPlatformKey] as RemnawavePlatformData | undefined)
    : undefined;
  const currentPlatformApps = currentPlatformData?.apps || [];

  // Platform display name
  const getPlatformDisplayName = useCallback(
    (key: string): string => {
      const data = appConfig.platforms[key] as RemnawavePlatformData | undefined;
      if (data?.displayName) {
        const name = getLocalizedText(data.displayName);
        if (name) return name;
      }
      if (appConfig.platformNames?.[key]) {
        return getLocalizedText(appConfig.platformNames[key]);
      }
      const fallback: Record<string, string> = {
        ios: 'iOS',
        android: 'Android',
        windows: 'Windows',
        macos: 'macOS',
        linux: 'Linux',
        androidTV: 'Android TV',
        appleTV: 'Apple TV',
      };
      return fallback[key] || key;
    },
    [appConfig.platforms, appConfig.platformNames, getLocalizedText],
  );

  // Шаги всегда в виде «салфетки», стиль из настроек панели не используется
  const Renderer = NapkinStepsBlock;

  // For the Happ TV app (Android TV / Apple TV), inject the TV connect widget as
  // customNode so it renders THROUGH the active block style (cards/timeline/
  // accordion/minimal) instead of as separate clashing cards that break it.
  const showTvConnect = Boolean(
    selectedApp && isTvLayout && isHappApp(selectedApp) && appConfig.subscriptionUrl,
  );
  let renderBlocks: RenderBlock[] = selectedApp?.blocks ?? [];
  if (selectedApp && showTvConnect && appConfig.subscriptionUrl) {
    // install → add-subscription → connect: attach to the add step (index 1);
    // fall back to the last block for shorter configs.
    const idx = selectedApp.blocks.length >= 3 ? 1 : Math.max(0, selectedApp.blocks.length - 1);
    const widget = <TvQuickConnect subscriptionUrl={appConfig.subscriptionUrl} isLight={isLight} />;
    renderBlocks = selectedApp.blocks.map((b, i) => (i === idx ? { ...b, customNode: widget } : b));
  }

  const platformLabel = currentPlatformKey ? getPlatformDisplayName(currentPlatformKey) : '';

  return (
    <div className="space-y-5 pb-6 pt-2">
      <div className="flex items-start gap-3">
        {!isTelegramWebApp && (
          <button
            onClick={onGoBack}
            aria-label={t('common.back', 'Back')}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-dark-100 transition-colors hover:bg-dark-900"
          >
            <BackIcon className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-3xl font-extrabold leading-tight text-dark-50">
          {getBaseTranslation('installationGuideHeader', 'subscription.connection.title')}
        </h1>
      </div>

      {/* Устройство: определяется само, «сменить» раскрывает плитки */}
      {availablePlatforms.length > 0 && (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-lg">
            <span>
              {t('subscription.connection.deviceLine')}{' '}
              <strong className="font-semibold">{platformLabel}</strong>
            </span>
            {availablePlatforms.length > 1 && (
              <button
                type="button"
                onClick={() => setPlatformsOpen((v) => !v)}
                aria-expanded={platformsOpen}
                className="text-base text-accent-500 underline underline-offset-4"
              >
                {t('subscription.connection.change')}
              </button>
            )}
          </div>
          {platformsOpen && (
            <div
              className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5"
              role="radiogroup"
              aria-label={t('subscription.connection.deviceLine')}
            >
              {availablePlatforms.map((p) => {
                const checked = p === currentPlatformKey;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => {
                      setActivePlatformKey(p);
                      setPlatformsOpen(false);
                      const data = appConfig.platforms[p] as RemnawavePlatformData | undefined;
                      if (data?.apps?.length) {
                        // Keep the user's current app (by name) if it also exists on the
                        // new platform; only fall back to featured/first otherwise.
                        const app =
                          data.apps.find((a) => a.name === selectedApp?.name) ||
                          data.apps.find((a) => a.featured) ||
                          data.apps[0];
                        if (app) setSelectedApp(app);
                      }
                    }}
                    className={`relative grid justify-items-center gap-1.5 rounded-[14px_18px_15px_17px] border-2 px-2 py-3.5 text-base font-semibold transition-colors ${
                      checked
                        ? 'border-accent-500 bg-accent-500 text-on-accent'
                        : 'border-dark-100 text-dark-100 hover:bg-dark-900'
                    }`}
                  >
                    <PlatformIcon platform={p} />
                    {getPlatformDisplayName(p)}
                    {p === detectedPlatform && (
                      <i className="absolute -right-1 -top-3 rotate-6 rounded-sm bg-marker px-1.5 font-hand text-lg not-italic text-accent-500">
                        {t('subscription.connection.yours')}
                      </i>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Приложение: все варианты видны сразу, выбранное залито */}
      {selectedApp && (
        <div>
          {currentPlatformApps.length > 1 ? (
            <>
              <div className="mb-3 text-lg">{t('subscription.connection.appPick')}</div>
              <div
                className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5"
                role="radiogroup"
                aria-label={t('subscription.connection.appPick')}
              >
                {currentPlatformApps.map((app, idx) => {
                  const isSelected = selectedApp?.name === app.name;
                  return (
                    <button
                      key={app.name + idx}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedApp(app)}
                      className={`relative min-h-[56px] rounded-[14px_18px_15px_17px] border-2 px-3 py-3 text-base font-semibold transition-colors ${
                        isSelected
                          ? 'border-accent-500 bg-accent-500 text-on-accent'
                          : 'border-dark-100 text-dark-100 hover:bg-dark-900'
                      }`}
                    >
                      {app.name}
                      {app.featured && (
                        <i className="absolute -right-1 -top-3 rotate-6 rounded-sm bg-marker px-1.5 font-hand text-lg not-italic text-accent-500">
                          {t('subscription.connection.recommended')}
                        </i>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-lg">
              {t('subscription.connection.appLine')}{' '}
              <strong className="font-semibold">{selectedApp.name}</strong>
            </div>
          )}
        </div>
      )}

      {/* Tutorial button */}
      {appConfig.baseSettings?.isShowTutorialButton && appConfig.baseSettings?.tutorialUrl && (
        <a
          href={appConfig.baseSettings.tutorialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary w-full justify-center"
        >
          <BookOpenIcon className="h-5 w-5" />
          {getBaseTranslation('tutorial', 'subscription.connection.tutorial')}
        </a>
      )}

      {/* QR-код — подключить другое устройство, например телевизор */}
      {appConfig.subscriptionUrl && onOpenQR && (
        <button
          type="button"
          onClick={() => onOpenQR()}
          className="text-base text-accent-500 underline underline-offset-4"
        >
          {t('subscription.connection.addAnotherDevice')}
        </button>
      )}

      {/* Blocks rendered in the panel's active style. For the Happ Android TV
          app the TV connect widget is injected into a step (customNode), so it
          adapts to that style instead of breaking it. */}
      {selectedApp && (
        <Renderer
          blocks={renderBlocks}
          isMobile={isMobile}
          isLight={isLight}
          getLocalizedText={getLocalizedText}
          getSvgHtml={getSvgHtml}
          renderBlockButtons={renderBlockButtons}
        />
      )}
    </div>
  );
}
