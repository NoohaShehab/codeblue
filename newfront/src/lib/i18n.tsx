import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from '@/locales/en.json';
import ar from '@/locales/ar.json';

export type Language = 'en' | 'ar';
type TranslationValues = Record<string, string | number>;
type Locale = Record<string, string>;

const dictionaries: Record<Language, Locale> = { en, ar };
const STORAGE_KEY = 'northstar-language';

type I18nContextValue = {
  language: Language;
  direction: 'ltr' | 'rtl';
  setLanguage: (language: Language) => void;
  t: (key: string, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(value: string, values?: TranslationValues) {
  if (!values) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ''));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' ? 'ar' : 'en';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = dictionaries[language];
    return {
      language,
      direction: language === 'ar' ? 'rtl' : 'ltr',
      setLanguage: (nextLanguage) => setLanguage(nextLanguage),
      t: (key, values) => interpolate(dictionary[key] ?? dictionaries.en[key] ?? key, values),
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

export function T({ id, values }: { id: string; values?: TranslationValues }) {
  const { t } = useI18n();
  return <>{t(id, values)}</>;
}