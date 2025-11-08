import React from "react"
import { Languages } from "lucide-react"
import { useI18n, type Language } from "../lib/i18n"

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useI18n()
  const [isAnimating, setIsAnimating] = React.useState(false)

  const toggleLanguage = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 500)

    const newLang: Language = language === "zh" ? "en" : "zh"
    setLanguage(newLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="btn-secondary h-10 w-10 flex items-center justify-center rounded-lg transition-all hover:scale-110"
      aria-label={`${language === "zh" ? "中文" : "English"}`}
      type="button"
    >
      <span
        className={`inline-flex transition-all duration-300 ${
          isAnimating ? "rotate-180 scale-90" : "rotate-0 scale-100"
        }`}
      >
        <Languages size={16} />
      </span>
    </button>
  )
}

export default LanguageToggle

