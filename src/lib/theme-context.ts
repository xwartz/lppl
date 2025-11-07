import { createContext, useContext } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: ThemePref
  setTheme: (t: ThemePref) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)


