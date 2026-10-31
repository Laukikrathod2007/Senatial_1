/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { type Language, type Translations, translations } from "./translations";
import { Globe } from "lucide-react";

export type TranslationFunction = ((key: keyof Translations, fallback?: string) => string) & Translations;

function createTranslator(language: Language): TranslationFunction {
  const baseFn = (key: keyof Translations, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && key in langDict) {
      return langDict[key];
    }
    const enDict = translations.en;
    if (enDict && key in enDict) {
      return enDict[key];
    }
    return fallback ?? String(key);
  };

  return new Proxy(baseFn, {
    get(target, prop: string | symbol) {
      if (typeof prop === "string" && prop in translations.en) {
        return baseFn(prop as keyof Translations);
      }
      return (target as unknown as Record<string, unknown>)[prop as string];
    },
  }) as TranslationFunction;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationFunction;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: createTranslator("en"),
});

const STORAGE_KEY = "sentinel_language_preference";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "mr" || saved === "hi") {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Handle storage write failure gracefully
    }
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => createTranslator(language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * Clean, accessible Language Selector component that integrates seamlessly
 * into the existing header and mobile navigation.
 */
export function LanguageSelector({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <Globe className="w-3.5 h-3.5 text-brand-gold shrink-0 opacity-80" aria-hidden="true" />
      <label htmlFor="sentinel-language-select" className="sr-only">
        {t("lang_select_label", "Language")}
      </label>
      <select
        id="sentinel-language-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="bg-white/90 border border-rule hover:border-brand-gold/60 focus:border-brand-gold rounded-lg px-2 py-1 text-xs font-semibold text-ink transition-colors cursor-pointer outline-none shadow-2xs"
        aria-label={t("lang_select_label", "Language")}
      >
        <option value="en">English (EN)</option>
        <option value="mr">मराठी (MR)</option>
        <option value="hi">हिंदी (HI)</option>
      </select>
    </div>
  );
}
