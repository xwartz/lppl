export const en = {
  // App header
  "app.title": "LPPL Bubble Tracker",
  "nav.crypto": "Cryptocurrency",
  "nav.stocks": "Stock Market",

  // SEO & Meta
  "meta.title": "LPPL Bubble Tracker - Financial Bubble Warning System",
  "meta.description":
    "LPPL model-based financial bubble tracking tool that monitors bubble risks in cryptocurrency and stock markets in real-time, providing professional market warning analysis.",
  "meta.keywords": "LPPL, Financial Bubble, Cryptocurrency, Stock Market, Market Warning, Bubble Detection",

  // Theme
  "theme.toggle": "Toggle theme",

  // Asset Selector
  "asset.select": "Select Asset",
  "asset.crypto.bitcoin": "Bitcoin (BTC)",
  "asset.crypto.ethereum": "Ethereum (ETH)",
  "asset.crypto.custom": "Custom",
  "asset.stock.sp500": "S&P 500 (SPY)",
  "asset.stock.nasdaq": "NASDAQ (QQQ)",
  "asset.stock.custom": "Custom",
  "asset.enter.symbol": "Enter Symbol",
  "asset.timeframe": "Timeframe",
  "asset.days": "Days",
  "asset.analyze": "Analyze",

  // LPPL Analysis
  "lppl.title": "LPPL Bubble Analysis",
  "lppl.status.analyzing": "Analyzing...",
  "lppl.status.nodata": "No Data",
  "lppl.status.bubble": "Bubble Warning",
  "lppl.status.nobubble": "Normal",
  "lppl.indicator": "Bubble Indicator",
  "lppl.confidence": "Confidence",
  "lppl.critical.time": "Critical Time",
  "lppl.days.remaining": "Days Remaining",
  "lppl.interpretation": "Interpretation",
  "lppl.interpretation.bubble":
    "The market shows significant bubble characteristics, and prices may be approaching a critical point. It is recommended to closely monitor market dynamics and carefully control risks.",
  "lppl.interpretation.moderate":
    "The market shows some bubble characteristics, but has not reached extreme levels. It is recommended to remain vigilant and moderately control positions.",
  "lppl.interpretation.normal":
    "The market is in a relatively healthy state, with no obvious bubble risks detected. You can maintain a normal investment strategy.",
  "lppl.interpretation.nodata":
    "Insufficient data for analysis. Please select another asset or adjust the timeframe.",

  // Price Chart
  "chart.title": "Price Trend",
  "chart.date": "Date",
  "chart.price": "Price",
  "chart.actual": "Actual Price",
  "chart.fitted": "LPPL Fit",
  "chart.critical": "Critical Time",
  "chart.critical.point": "⚠ Critical Point",
  "chart.loading": "Loading...",
  "chart.error": "Load Failed",
  "chart.price.fit": "Price & LPPL Fit Curve",
  "chart.warning.far": "⚠️ Critical Point Deviation",
  "chart.warning.far.desc": "Predicted critical price {price} deviates significantly from current price range (about {percent}%). Full range hidden for readability.",
  "chart.show.full": "Show Full Range",
  "chart.showing.full": "Showing Full Price Range",
  "chart.focus.history": "Focus on Historical Data",

  // Parameters
  "params.title": "LPPL Parameters",
  "params.tc": "Critical Time (tc)",
  "params.m": "Power Law Exponent (m)",
  "params.omega": "Oscillation Frequency (ω)",
  "params.a": "Linear Coefficient (A)",
  "params.b": "Power Law Coefficient (B)",
  "params.c": "Oscillation Amplitude (C)",
  "params.phi": "Phase (φ)",
  "params.r2": "Goodness of Fit (R²)",
  "params.model": "LPPL Model Parameters",
  "params.baseline.log": "Baseline A (log)",
  "params.baseline.price": "Baseline A (price)",
  "params.tc.label": "Critical Time tc",
  "params.m.label": "Power Exponent m",
  "params.omega.label": "Angular Freq. ω",
  "params.phi.label": "Phase φ",
  "params.sse": "SSE",
  "params.rmse": "RMSE",
  "params.iterations.label": "Iterations",
  "params.runtime": "Runtime",

  // Errors
  "error.fetch": "Failed to fetch data",
  "error.analysis": "Analysis failed",
  "error.invalid.symbol": "Invalid asset symbol",
  "error.stock.fetch": "Failed to fetch stock data",
  "error.stock.format": "Invalid stock historical data format",
  "error.unknown": "Unknown error",
  "error.invalid.input": "Please enter a valid asset symbol",
  "error.invalid.date.range": "Invalid date range: end date must be later than or equal to start date",

  // Advanced Settings
  "advanced.settings": "Advanced",
  "advanced.model.config": "Model Configuration",
  "advanced.apply.hint": "Press Enter or blur to apply",
  "advanced.max.iterations": "Max Iterations",
  "advanced.restarts": "Restarts",
  "advanced.tolerance": "Tolerance",

  // Time Range
  "time.custom": "Custom Range",
  "time.to": "to",
  "time.last": "Last",
  "time.days": "days",
  "time.refresh": "Refresh",
  "time.refreshing": "Refreshing...",
  "time.invalid.date": "Invalid custom date range",

  // Risk Level
  "risk.level": "Risk Level",
  "risk.high": "High Risk",
  "risk.medium": "Medium Risk",
  "risk.low": "Low Risk",
  "risk.reason.unreliable": "Unreliable fit (residual too large or numerical anomaly)",
  "risk.reason.critical.passed": "Predicted critical date has passed",
  "risk.reason.critical.near": "Critical date approaching (<30 days)",
  "risk.reason.critical.soon": "Critical date within 60 days",
  "risk.reason.price.surge": "Recent rapid price increase (>10%)",
  "risk.reason.price.rise": "Recent price increase (>5%)",

  // Critical Point
  "critical.point": "Predicted Critical Point",
  "critical.price": "Predicted Critical Price",
  "critical.days.after": "days from now",
  "critical.days.before": "days ago",
  "critical.today": "today",
  "critical.about": "About",

  // Model Fit
  "model.fit": "Model Fit Quality",
  "model.residual": "Residual (lower is better)",
  "model.status": "Fit Status",
  "model.converged": "✓ Converged",
  "model.not.converged": "⚠ Not Fully Converged",

  // Placeholders
  "placeholder.crypto.symbol": "e.g. BTCUSDT",
  "placeholder.stock.symbol": "e.g. AAPL",
  "aria.crypto": "Enter trading pair",
  "aria.stock": "Enter stock symbol",

  // Footer
  "footer.about": "About LPPL",
  "footer.disclaimer": "⚠️ Disclaimer: LPPL model is for reference only and does not constitute investment advice.",
}
