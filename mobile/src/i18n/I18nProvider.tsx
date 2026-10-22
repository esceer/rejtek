import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { en, type Messages } from './en';
import { hu } from './hu';

export type Language = 'en' | 'hu';

const MESSAGES: Record<Language, Messages> = { en, hu };
const STORAGE_KEY = 'language';

interface I18n {
  language: Language;
  t: Messages;
  setLanguage: (language: Language) => void;
}

const I18nContext = createContext<I18n | null>(null);

/** The language chosen in Settings, else the phone's language if supported, else English. */
function initialLanguage(): Language {
  const stored = Storage.getItemSync(STORAGE_KEY);
  if (stored === 'en' || stored === 'hu') {
    return stored;
  }
  return getLocales()[0].languageCode === 'hu' ? 'hu' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(initialLanguage);
  const setLanguage = (next: Language) => {
    Storage.setItemSync(STORAGE_KEY, next);
    setLanguageState(next);
  };
  return (
    <I18nContext value={{ language, t: MESSAGES[language], setLanguage }}>{children}</I18nContext>
  );
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return i18n;
}
