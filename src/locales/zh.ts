export const zh = {
  // App header
  'app.title': 'LPPL 追踪器',
  'nav.crypto': '加密',
  'nav.stocks': '股票',
  'nav.commodities': '大宗商品',

  // SEO & Meta
  'meta.title': 'LPPL 追踪器 | 泡沫风险信号',
  'meta.description': '用 LPPL 信号追踪加密、股票和大宗商品的泡沫风险。',
  'meta.keywords': 'LPPL, 金融泡沫, 数字货币, 股票市场, 市场预警, 泡沫检测',

  // Theme
  'theme.toggle': '切换主题',

  // Asset Selector
  'asset.select': '资产',
  'asset.crypto.bitcoin': '比特币 (BTC)',
  'asset.crypto.ethereum': '以太坊 (ETH)',
  'asset.crypto.custom': '自定义',
  'asset.stock.sp500': '标普500 (SPY)',
  'asset.stock.nasdaq': '纳斯达克 (QQQ)',
  'asset.stock.custom': '自定义',
  'asset.commodity.gold': '黄金',
  'asset.commodity.silver': '白银',
  'asset.commodity.crude': '原油',
  'asset.suggestions': '常用标的',
  'asset.enter.symbol': '输入代码',
  'asset.timeframe': '区间',
  'asset.days': '天',
  'asset.analyze': '分析',

  // LPPL Analysis
  'lppl.title': 'LPPL 泡沫分析',
  'lppl.status.analyzing': '分析中...',
  'lppl.status.nodata': '无数据',
  'lppl.status.bubble': '泡沫警告',
  'lppl.status.nobubble': '正常',
  'lppl.indicator': '泡沫指标',
  'lppl.confidence': '置信度',
  'lppl.critical.time': '临界时间',
  'lppl.days.remaining': '剩余天数',
  'lppl.interpretation': '结果解读',
  'lppl.interpretation.bubble': '泡沫信号较强，请控制风险。',
  'lppl.interpretation.moderate': '泡沫信号正在增强，建议保持谨慎。',
  'lppl.interpretation.normal': '当前没有明显泡沫信号。',
  'lppl.interpretation.nodata': '数据不足，请更换标的或区间。',

  // Price Chart
  'chart.title': '价格走势',
  'chart.date': '日期',
  'chart.price': '价格',
  'chart.actual': '实际价格',
  'chart.fitted': 'LPPL 拟合',
  'chart.critical': '临界时间',
  'chart.critical.point': '临界点',
  'chart.loading': '加载中...',
  'chart.error': '加载失败',
  'chart.price.fit': '价格与 LPPL',
  'chart.warning.far': '临界点超出当前尺度',
  'chart.warning.far.desc':
    '预测临界价格 {price} 明显超出当前范围。为保证可读性，默认隐藏完整范围。',
  'chart.show.full': '显示完整范围',
  'chart.showing.full': '已显示完整范围',
  'chart.focus.history': '聚焦历史',
  'chart.interaction.hint': '滚轮缩放，拖拽平移，悬停看数值',
  'chart.zoom.in': '放大',
  'chart.zoom.out': '缩小',
  'chart.reset': '重置视图',

  // Parameters
  'params.title': 'LPPL 参数',
  'params.tc': '临界时间 (tc)',
  'params.m': '幂律指数 (m)',
  'params.omega': '振荡频率 (ω)',
  'params.a': '线性系数 (A)',
  'params.b': '幂律系数 (B)',
  'params.c': '振荡幅度 (C)',
  'params.phi': '相位 (φ)',
  'params.r2': '拟合优度 (R²)',
  'params.model': 'LPPL 模型参数',
  'params.baseline.log': '基线 A (log)',
  'params.baseline.price': '基线 A (price)',
  'params.tc.label': '临界时间 tc',
  'params.m.label': '幂律指数 m',
  'params.omega.label': '角频率 ω',
  'params.phi.label': '相位 φ',
  'params.sse': 'SSE',
  'params.rmse': 'RMSE',
  'params.iterations.label': '迭代次数',
  'params.runtime': '计算耗时',

  // Errors
  'error.fetch': '获取数据失败',
  'error.analysis': '分析失败',
  'error.invalid.symbol': '无效的资产代码',
  'error.stock.fetch': '获取股票数据失败',
  'error.stock.format': '股票历史数据格式异常',
  'error.unknown': '未知错误',
  'error.invalid.input': '请输入有效标的代码',
  'error.invalid.date.range': '自定义日期无效：结束时间必须晚于或等于起始时间',

  // Advanced Settings
  'advanced.settings': '高级',
  'advanced.model.config': '模型设置',
  'advanced.apply.hint': '回车或失焦后应用',
  'advanced.max.iterations': '最大迭代次数',
  'advanced.restarts': '重启次数',
  'advanced.tolerance': '收敛容限',

  // Time Range
  'time.custom': '自定义',
  'time.to': '至',
  'time.last': '最近',
  'time.days': '天',
  'time.refresh': '更新',
  'time.refreshing': '更新中...',
  'time.invalid.date': '自定义日期无效',

  // Risk Level
  'risk.level': '风险',
  'risk.high': '高风险',
  'risk.medium': '中等风险',
  'risk.low': '低风险',
  'risk.reason.unreliable': '拟合不稳定',
  'risk.reason.critical.passed': '预测临界日已过',
  'risk.reason.critical.near': '临界日少于 30 天',
  'risk.reason.critical.soon': '临界日在 60 天内',
  'risk.reason.price.surge': '近期开涨幅 >10%',
  'risk.reason.price.rise': '近期开涨幅 >5%',

  // Critical Point
  'critical.point': '临界点',
  'critical.price': '临界价格',
  'critical.days.after': '天后',
  'critical.days.before': '天前',
  'critical.today': '24 小时内',
  'critical.about': '约',

  // Model Fit
  'model.fit': '拟合质量',
  'model.residual': '残差',
  'model.status': '状态',
  'model.converged': '已收敛',
  'model.not.converged': '未收敛',

  // Placeholders
  'placeholder.crypto.symbol': '例如 BTCUSDT',
  'placeholder.stock.symbol': '例如 AAPL',
  'placeholder.commodity.symbol': '例如 GC=F',
  'aria.crypto': '手动输入交易对',
  'aria.stock': '手动输入股票代码',
  'aria.commodity': '输入商品代码',

  // Footer
  'footer.about': '关于',
  'footer.disclaimer': 'LPPL 仅供参考，不构成投资建议。',
}
