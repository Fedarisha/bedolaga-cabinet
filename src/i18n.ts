import i18n, { type ResourceLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';

const LANGUAGE = 'ru';

export const i18nReady: Promise<void> = i18n
  .use(initReactI18next)
  .init({
    lng: LANGUAGE,
    fallbackLng: LANGUAGE,
    supportedLngs: [LANGUAGE],
    resources: {
      [LANGUAGE]: { translation: ru as ResourceLanguage },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    showSupportNotice: false,
  })
  .then(() => undefined);

if (typeof document !== 'undefined') {
  document.documentElement.lang = LANGUAGE;
  document.documentElement.dir = 'ltr';
}

// The fork intentionally ships a single locale. Keep the startup hook so the
// Telegram/bootstrap flow stays compatible with upstream without switching to
// a language whose bundle is not present.
export function applyTelegramLanguage(): void {}

export default i18n;
