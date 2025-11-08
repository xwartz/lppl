import React, { useState, useCallback, useEffect } from "react"
import { I18nContext, STORAGE_KEY, translate } from "./i18n"
import type { Language } from "./i18n"

interface I18nProviderProps {
  children: React.ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "zh" || stored === "en") {
      return stored
    }

    // Detect browser language
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith("zh")) {
      return "zh"
    }

    return "en"
  })

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
    // Update HTML lang attribute for SEO
    document.documentElement.lang = lang
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      return translate(language, key, vars)
    },
    [language]
  )

  useEffect(() => {
    // Set initial HTML lang attribute
    document.documentElement.lang = language
  }, [language])

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
}

