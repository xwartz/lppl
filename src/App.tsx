import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import CryptoLPPLPage from "./pages/CryptoLPPLPage"
import StockLPPLPage from "./pages/StockLPPLPage"
import { Bitcoin, ChartCandlestick } from "lucide-react"

function App() {
  const linkBase =
    "px-3 py-2 rounded-md text-sm border border-border-var bg-panel hover:bg-gray-100"
  const linkActive = "bg-accent text-white border-transparent"
  return (
    <BrowserRouter>
      <div className="min-h-screen app-root">
        <header className="max-w-7xl mx-auto px-6 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold heading">
                LPPL 泡沫追踪器
              </h1>
              <p className="text-muted text-sm mt-1">分市场：数字货币｜股票</p>
            </div>
            <nav className="flex items-center gap-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : ""}`
                }
              >
                <Bitcoin className="text-warning" size={32} />
              </NavLink>
              <NavLink
                to="/stocks"
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : ""}`
                }
              >
                <ChartCandlestick className="text-info" size={32} />
              </NavLink>
            </nav>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<CryptoLPPLPage />} />
            <Route path="/stocks" element={<StockLPPLPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
