import { createContext, useContext } from 'react'
import type { Language } from '../locales'
import { translations } from '../locales'

export type { Language }

export interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined)

export const STORAGE_KEY = 'lppl-language'

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export const translate = (
  language: Language,
  key: string,
  vars?: Record<string, string | number>,
): string => {
  let text = translations[language][key] || key

  // Simple variable substitution
  if (vars) {
    Object.entries(vars).forEach(([varKey, value]) => {
      text = text.replace(`{${varKey}}`, String(value))
    })
  }

  return text
}
