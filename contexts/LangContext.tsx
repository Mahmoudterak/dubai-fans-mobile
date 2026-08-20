import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ar, type LangKeys } from '@/constants/i18n/ar';
import { en } from '@/constants/i18n/en';

type Lang = 'ar' | 'en';

interface LangContextValue {
  lang: Lang;
  t: (key: LangKeys) => string;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);
const LANG_KEY = 'portal_lang';

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(v => { if (v === 'en' || v === 'ar') setLangState(v); });
  }, []);

  const setLang = async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem(LANG_KEY, l);
  };

  const t = (key: LangKeys): string => {
    const map = lang === 'ar' ? ar : en;
    return (map as Record<string, string>)[key] ?? ar[key] ?? key;
  };

  return <LangContext.Provider value={{ lang, t, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be within LangProvider');
  return ctx;
}
