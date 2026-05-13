import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { ThemePref } from './theme-context'
import { ThemeContext } from './theme-context'

const THEME_KEY = 'lppl:theme'

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemePref>(() => {
    try {
      const s = localStorage.getItem(THEME_KEY) as ThemePref | null
      return s ?? 'system'
    } catch {
      return 'system'
    }
  })

  const applyTheme = useCallback((pref: ThemePref) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const mql =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null
    const systemDark = Boolean(mql && mql.matches)

    const useDark = pref === 'dark' ? true : pref === 'light' ? false : systemDark

    if (useDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [])

  // keep localStorage and class in sync
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
    applyTheme(theme)
  }, [theme, applyTheme])

  // listen to system changes when in 'system' mode
  useEffect(() => {
    const mql =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null
    const onChange = () => {
      const cur = (localStorage.getItem(THEME_KEY) as ThemePref) ?? 'system'
      if (cur === 'system') applyTheme('system')
    }
    if (mql && typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange)
    return () => {
      if (mql && typeof mql.removeEventListener === 'function')
        mql.removeEventListener('change', onChange)
    }
  }, [applyTheme])

  const setTheme = (t: ThemePref) => setThemeState(t)

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
