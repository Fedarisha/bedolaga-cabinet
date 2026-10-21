import i18n, { type ResourceLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';

const FALLBACK_LNG = 'ru';
const SUPPORTED_LANGS = [FALLBACK_LNG];

i18n.use(initReactI18next).init({
  lng: FALLBACK_LNG,
  fallbackLng: FALLBACK_LNG,
  supportedLngs: SUPPORTED_LANGS,
  resources: {
    [FALLBACK_LNG]: { translation: ru as ResourceLanguage },
  },

  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },
});

document.documentElement.lang = FALLBACK_LNG;
document.documentElement.dir = 'ltr';

export const i18nReady: Promise<void> = Promise.resolve();

export default i18n;
