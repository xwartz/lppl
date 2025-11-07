import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "../lib/theme-context"

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      className="btn-secondary h-10 w-10 flex items-center justify-center rounded-lg transition-all"
      aria-label="切换主题"
      type="button"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export default ThemeToggle
