import { useCallback, useEffect, useState } from 'react';
import { LANDING_COPY, type LandingCopy, type LandingLang } from './copy';

const STORAGE_KEY = 'landing_lang';

function readStored(): LandingLang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'ru' || value === 'en' ? value : null;
  } catch {
    return null;
  }
}

function detect(): LandingLang {
  const stored = readStored();
  if (stored) return stored;
  const langs = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
  return langs.some((l) => l?.toLowerCase().startsWith('ru')) ? 'ru' : 'en';
}

/**
 * Landing-only language switch. The cabinet i18n is Russian-only, so the
 * landing keeps its own tiny dictionary and remembers the choice per browser.
 */
export function useLandingLang(): {
  lang: LandingLang;
  copy: LandingCopy;
  setLang: (lang: LandingLang) => void;
} {
  const [lang, setLangState] = useState<LandingLang>(detect);

  const setLang = useCallback((next: LandingLang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — keep in memory only */
    }
  }, []);

  useEffect(() => {
    // `lang` on the root drives hyphenation/quotes for the whole document while
    // the landing is open; the cabinet resets it to ru on its own routes.
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);

  return { lang, copy: LANDING_COPY[lang], setLang };
}
