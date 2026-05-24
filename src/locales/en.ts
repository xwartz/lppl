export const en = {
  // App header
  'app.title': 'LPPL Tracker',
  'nav.crypto': 'Crypto',
  'nav.stocks': 'Stocks',
  'nav.commodities': 'Commodities',

  // SEO & Meta
  'meta.title': 'LPPL Tracker | Bubble Risk Signals',
  'meta.description': 'Track bubble risk signals for crypto, stocks, and commodities with LPPL.',
  'meta.keywords':
    'LPPL, Financial Bubble, Cryptocurrency, Stock Market, Market Warning, Bubble Detection',

  // Theme
  'theme.toggle': 'Toggle theme',

  // Asset Selector
  'asset.select': 'Asset',
  'asset.crypto.bitcoin': 'Bitcoin (BTC)',
  'asset.crypto.ethereum': 'Ethereum (ETH)',
  'asset.crypto.custom': 'Custom',
  'asset.stock.sp500': 'S&P 500 (SPY)',
  'asset.stock.nasdaq': 'NASDAQ (QQQ)',
  'asset.stock.custom': 'Custom',
  'asset.commodity.gold': 'Gold',
  'asset.commodity.silver': 'Silver',
  'asset.commodity.crude': 'Crude Oil',
  'asset.suggestions': 'Watchlist',
  'asset.enter.symbol': 'Enter Symbol',
  'asset.timeframe': 'Range',
  'asset.days': 'Days',
  'asset.analyze': 'Analyze',

  // LPPL Analysis
  'lppl.title': 'LPPL Bubble Analysis',
  'lppl.status.analyzing': 'Analyzing...',
  'lppl.status.nodata': 'No Data',
  'lppl.status.bubble': 'Bubble Warning',
  'lppl.status.nobubble': 'Normal',
  'lppl.indicator': 'Bubble Indicator',
  'lppl.confidence': 'Confidence',
  'lppl.critical.time': 'Critical Time',
  'lppl.days.remaining': 'Days Remaining',
  'lppl.interpretation': 'Interpretation',
  'lppl.interpretation.bubble': 'Bubble signals are strong. Stay cautious and manage risk tightly.',
  'lppl.interpretation.moderate':
    'Bubble signals are building. Stay alert and size positions carefully.',
  'lppl.interpretation.normal': 'No strong bubble signal right now.',
  'lppl.interpretation.nodata': 'Not enough data. Try another asset or range.',

  // Price Chart
  'chart.title': 'Price Trend',
  'chart.date': 'Date',
  'chart.price': 'Price',
  'chart.actual': 'Actual Price',
  'chart.fitted': 'LPPL Fit',
  'chart.critical': 'Critical Time',
  'chart.critical.point': 'Critical',
  'chart.loading': 'Loading...',
  'chart.error': 'Load Failed',
  'chart.price.fit': 'Price vs LPPL',
  'chart.warning.far': 'Critical point off-scale',
  'chart.warning.far.desc':
    'Critical price {price} sits well outside the current range. Full range is hidden to keep the chart readable.',
  'chart.show.full': 'Show Full Range',
  'chart.showing.full': 'Full range enabled',
  'chart.focus.history': 'Focus history',
  'chart.interaction.hint': 'Scroll to zoom, drag to pan, hover for values',
  'chart.zoom.in': 'Zoom In',
  'chart.zoom.out': 'Zoom Out',
  'chart.reset': 'Reset View',

  // Parameters
  'params.title': 'LPPL Parameters',
  'params.tc': 'Critical Time (tc)',
  'params.m': 'Power Law Exponent (m)',
  'params.omega': 'Oscillation Frequency (ω)',
  'params.a': 'Linear Coefficient (A)',
  'params.b': 'Power Law Coefficient (B)',
  'params.c': 'Oscillation Amplitude (C)',
  'params.phi': 'Phase (φ)',
  'params.r2': 'Goodness of Fit (R²)',
  'params.model': 'LPPL Model Parameters',
  'params.baseline.log': 'Baseline A (log)',
  'params.baseline.price': 'Baseline A (price)',
  'params.tc.label': 'Critical Time tc',
  'params.m.label': 'Power Exponent m',
  'params.omega.label': 'Angular Freq. ω',
  'params.phi.label': 'Phase φ',
  'params.sse': 'SSE',
  'params.rmse': 'RMSE',
  'params.iterations.label': 'Iterations',
  'params.runtime': 'Runtime',

  // Errors
  'error.fetch': 'Failed to fetch data',
  'error.analysis': 'Analysis failed',
  'error.invalid.symbol': 'Invalid asset symbol',
  'error.stock.fetch': 'Failed to fetch stock data',
  'error.stock.format': 'Invalid stock historical data format',
  'error.unknown': 'Unknown error',
  'error.invalid.input': 'Please enter a valid asset symbol',
  'error.invalid.date.range':
    'Invalid date range: end date must be later than or equal to start date',

  // Advanced Settings
  'advanced.settings': 'Advanced',
  'advanced.model.config': 'Model settings',
  'advanced.apply.hint': 'Enter or blur to apply',
  'advanced.max.iterations': 'Max Iterations',
  'advanced.restarts': 'Restarts',
  'advanced.tolerance': 'Tolerance',

  // Time Range
  'time.custom': 'Custom',
  'time.to': 'to',
  'time.last': 'Last',
  'time.days': 'days',
  'time.refresh': 'Update',
  'time.refreshing': 'Refreshing...',
  'time.invalid.date': 'Invalid custom date range',

  // Risk Level
  'risk.level': 'Risk',
  'risk.high': 'High Risk',
  'risk.medium': 'Medium Risk',
  'risk.low': 'Low Risk',
  'risk.reason.unreliable': 'Fit is unstable',
  'risk.reason.critical.passed': 'Critical date has passed',
  'risk.reason.critical.near': 'Critical date in under 30 days',
  'risk.reason.critical.soon': 'Critical date in 60 days',
  'risk.reason.price.surge': 'Price up more than 10% recently',
  'risk.reason.price.rise': 'Price up more than 5% recently',

  // Critical Point
  'critical.point': 'Critical point',
  'critical.price': 'Critical price',
  'critical.days.after': 'days from now',
  'critical.days.before': 'days ago',
  'critical.today': 'within 24 hours',
  'critical.about': 'About',

  // Model Fit
  'model.fit': 'Fit quality',
  'model.residual': 'Residual',
  'model.status': 'Status',
  'model.converged': 'Converged',
  'model.not.converged': 'Not converged',

  // Placeholders
  'placeholder.crypto.symbol': 'e.g. BTCUSDT',
  'placeholder.stock.symbol': 'e.g. AAPL',
  'placeholder.commodity.symbol': 'e.g. GC=F',
  'aria.crypto': 'Enter trading pair',
  'aria.stock': 'Enter stock symbol',
  'aria.commodity': 'Enter commodity symbol',

  // Footer
  'footer.about': 'About',
  'footer.disclaimer': 'LPPL is a reference signal, not investment advice.',
}
