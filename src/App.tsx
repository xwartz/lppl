import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import CryptoLPPLPage from "./pages/CryptoLPPLPage"
import StockLPPLPage from "./pages/StockLPPLPage"
import CommodityLPPLPage from "./pages/CommodityLPPLPage"
import ThemeToggle from "./components/ThemeToggle"
import LanguageToggle from "./components/LanguageToggle"
import { Bitcoin, TrendingUp } from "lucide-react"
import { CommodityIcon } from "./components/icons/CommodityIcon"
import { useI18n } from "./lib/i18n"

function App() {
  const { t } = useI18n()

  return (
    <BrowserRouter>
      <div className="min-h-screen app-root">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border-var bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-6">
                <h1 className="text-lg font-semibold tracking-tight text-text">
                  {t("app.title")}
                </h1>

                {/* Navigation Tabs - Minimalist Style */}
                <nav className="hidden sm:flex items-center gap-1 border border-border-var rounded-lg p-1 bg-panel">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        isActive
                          ? "bg-card shadow-sm text-text"
                          : "text-muted hover:text-text"
                      }`
                    }
                  >
                    <Bitcoin size={14} />
                    <span>{t("nav.crypto")}</span>
                  </NavLink>
                  <NavLink
                    to="/stocks"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        isActive
                          ? "bg-card shadow-sm text-text"
                          : "text-muted hover:text-text"
                      }`
                    }
                  >
                    <TrendingUp size={14} />
                    <span>{t("nav.stocks")}</span>
                  </NavLink>
                  <NavLink
                    to="/commodities"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        isActive
                          ? "bg-card shadow-sm text-text"
                          : "text-muted hover:text-text"
                      }`
                    }
                  >
                    <CommodityIcon size={14} />
                    <span>{t("nav.commodities")}</span>
                  </NavLink>
                </nav>
              </div>

              {/* Mobile Navigation & Controls */}
              <div className="flex items-center gap-2">
                {/* Mobile Navigation */}
                <nav className="flex sm:hidden items-center gap-1 border border-border-var rounded-lg p-1 bg-panel">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `flex items-center justify-center w-9 h-9 rounded-md transition-all ${
                        isActive
                          ? "bg-card shadow-sm text-text"
                          : "text-muted hover:text-text"
                      }`
                    }
                  >
                    <Bitcoin size={16} />
                  </NavLink>
                  <NavLink
                    to="/stocks"
                    className={({ isActive }) =>
                      `flex items-center justify-center w-9 h-9 rounded-md transition-all ${
                        isActive
                          ? "bg-card shadow-sm text-text"
                          : "text-muted hover:text-text"
                      }`
                    }
                  >
                    <TrendingUp size={16} />
                  </NavLink>
                  <NavLink
                    to="/commodities"
                    className={({ isActive }) =>
                      `flex items-center justify-center w-9 h-9 rounded-md transition-all ${
                        isActive
                          ? "bg-card shadow-sm text-text"
                          : "text-muted hover:text-text"
                      }`
                    }
                  >
                    <CommodityIcon size={16} />
                  </NavLink>
                </nav>

                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="bg-app-bg">
          <Routes>
            <Route path="/" element={<CryptoLPPLPage />} />
            <Route path="/stocks" element={<StockLPPLPage />} />
            <Route path="/commodities" element={<CommodityLPPLPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
