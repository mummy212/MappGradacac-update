import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LangCode } from '../i18n/translations';

const LANG_KEY = 'gradacac_language';

interface LanguageContextType {
  language: LangCode;
  setLanguage: (lang: LangCode) => void;
  t: (section: string, key: string) => string;
  tArr: (section: string, key: string) => string[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bs',
  setLanguage: () => {},
  t: (section, key) => key,
  tArr: () => [],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<LangCode>('bs');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(saved => {
      if (saved === 'bs' || saved === 'en') setLang(saved);
    });
  }, []);

  const setLanguage = useCallback((lang: LangCode) => {
    setLang(lang);
    AsyncStorage.setItem(LANG_KEY, lang);
  }, []);

  const t = useCallback((section: string, key: string): string => {
    const dict = translations[language] as any;
    return dict?.[section]?.[key] ?? key;
  }, [language]);

  const tArr = useCallback((section: string, key: string): string[] => {
    const dict = translations[language] as any;
    const val = dict?.[section]?.[key];
    return Array.isArray(val) ? val : [];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tArr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
