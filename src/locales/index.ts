import { en } from './en'
import { zh } from './zh'

export type Language = 'zh' | 'en'

export const translations: Record<Language, Record<string, string>> = {
  zh,
  en,
}
