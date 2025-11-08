import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "../lib/theme-context"
import { useI18n } from "../lib/i18n"

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const [isAnimating, setIsAnimating] = React.useState(false)

  const toggleTheme = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 500)

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
      className="btn-secondary h-10 w-10 flex items-center justify-center rounded-lg transition-all hover:scale-110"
      aria-label={t("theme.toggle")}
      type="button"
    >
      <span
        className={`inline-flex transition-all duration-300 ${
          isAnimating ? "rotate-180 scale-90" : "rotate-0 scale-100"
        }`}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  )
}

export default ThemeToggle
