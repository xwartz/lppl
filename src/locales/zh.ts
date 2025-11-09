export const zh = {
  // App header
  "app.title": "LPPL 泡沫追踪器",
  "nav.crypto": "数字货币",
  "nav.stocks": "股票市场",

  // SEO & Meta
  "meta.title": "LPPL 泡沫追踪器 - 金融泡沫预警系统",
  "meta.description":
    "基于 LPPL 模型的金融泡沫追踪工具，实时监测数字货币和股票市场的泡沫风险，提供专业的市场预警分析。",
  "meta.keywords": "LPPL, 金融泡沫, 数字货币, 股票市场, 市场预警, 泡沫检测",

  // Theme
  "theme.toggle": "切换主题",

  // Asset Selector
  "asset.select": "选择资产",
  "asset.crypto.bitcoin": "比特币 (BTC)",
  "asset.crypto.ethereum": "以太坊 (ETH)",
  "asset.crypto.custom": "自定义",
  "asset.stock.sp500": "标普500 (SPY)",
  "asset.stock.nasdaq": "纳斯达克 (QQQ)",
  "asset.stock.custom": "自定义",
  "asset.enter.symbol": "输入代码",
  "asset.timeframe": "时间范围",
  "asset.days": "天",
  "asset.analyze": "分析",

  // LPPL Analysis
  "lppl.title": "LPPL 泡沫分析",
  "lppl.status.analyzing": "分析中...",
  "lppl.status.nodata": "无数据",
  "lppl.status.bubble": "泡沫警告",
  "lppl.status.nobubble": "正常",
  "lppl.indicator": "泡沫指标",
  "lppl.confidence": "置信度",
  "lppl.critical.time": "临界时间",
  "lppl.days.remaining": "剩余天数",
  "lppl.interpretation": "结果解读",
  "lppl.interpretation.bubble":
    "当前市场显示明显的泡沫特征，价格可能接近临界点。建议密切关注市场动态，谨慎控制风险。",
  "lppl.interpretation.moderate":
    "市场呈现一定的泡沫特征，但尚未达到极端水平。建议保持警惕，适度控制仓位。",
  "lppl.interpretation.normal":
    "市场处于相对健康状态，未检测到明显的泡沫风险。可以保持正常的投资策略。",
  "lppl.interpretation.nodata":
    "暂无足够数据进行分析，请选择其他资产或调整时间范围。",

  // Price Chart
  "chart.title": "价格走势",
  "chart.date": "日期",
  "chart.price": "价格",
  "chart.actual": "实际价格",
  "chart.fitted": "LPPL 拟合",
  "chart.critical": "临界时间",
  "chart.critical.point": "⚠ 临界点",
  "chart.loading": "加载中...",
  "chart.error": "加载失败",
  "chart.price.fit": "价格与 LPPL 拟合曲线",
  "chart.warning.far": "⚠️ 临界点偏离较远",
  "chart.warning.far.desc":
    "预测临界价格 {price} 与当前价格范围相差较大。为保持图表可读性，已隐藏完整范围。",
  "chart.show.full": "显示完整范围",
  "chart.showing.full": "当前显示完整价格范围",
  "chart.focus.history": "聚焦历史数据",
  "chart.interaction.hint": "使用滚轮缩放，拖拽平移，悬停查看详情",
  "chart.zoom.in": "放大",
  "chart.zoom.out": "缩小",
  "chart.reset": "重置视图",

  // Parameters
  "params.title": "LPPL 参数",
  "params.tc": "临界时间 (tc)",
  "params.m": "幂律指数 (m)",
  "params.omega": "振荡频率 (ω)",
  "params.a": "线性系数 (A)",
  "params.b": "幂律系数 (B)",
  "params.c": "振荡幅度 (C)",
  "params.phi": "相位 (φ)",
  "params.r2": "拟合优度 (R²)",
  "params.model": "LPPL 模型参数",
  "params.baseline.log": "基线 A (log)",
  "params.baseline.price": "基线 A (price)",
  "params.tc.label": "临界时间 tc",
  "params.m.label": "幂律指数 m",
  "params.omega.label": "角频率 ω",
  "params.phi.label": "相位 φ",
  "params.sse": "SSE",
  "params.rmse": "RMSE",
  "params.iterations.label": "迭代次数",
  "params.runtime": "计算耗时",

  // Errors
  "error.fetch": "获取数据失败",
  "error.analysis": "分析失败",
  "error.invalid.symbol": "无效的资产代码",
  "error.stock.fetch": "获取股票数据失败",
  "error.stock.format": "股票历史数据格式异常",
  "error.unknown": "未知错误",
  "error.invalid.input": "请输入有效标的代码",
  "error.invalid.date.range": "自定义日期无效：结束时间必须晚于或等于起始时间",

  // Advanced Settings
  "advanced.settings": "高级",
  "advanced.model.config": "模型参数配置",
  "advanced.apply.hint": "按回车或失焦后生效",
  "advanced.max.iterations": "最大迭代次数",
  "advanced.restarts": "重启次数",
  "advanced.tolerance": "收敛容限",

  // Time Range
  "time.custom": "自定义时间",
  "time.to": "至",
  "time.last": "最近",
  "time.days": "天",
  "time.refresh": "刷新",
  "time.refreshing": "更新中...",
  "time.invalid.date": "自定义日期无效",

  // Risk Level
  "risk.level": "风险等级",
  "risk.high": "高风险",
  "risk.medium": "中等风险",
  "risk.low": "低风险",
  "risk.reason.unreliable": "拟合不可靠（残差过大或数值异常）",
  "risk.reason.critical.passed": "预测临界日已过",
  "risk.reason.critical.near": "预测临界日临近 (<30 天)",
  "risk.reason.critical.soon": "预测临界日在 60 天内",
  "risk.reason.price.surge": "近期价格快速上涨 (>10%)",
  "risk.reason.price.rise": "近期价格上涨 (>5%)",

  // Critical Point
  "critical.point": "预测临界点",
  "critical.price": "预测临界价格",
  "critical.days.after": "天后",
  "critical.days.before": "天前",
  "critical.today": "24 小时内",
  "critical.about": "约",

  // Model Fit
  "model.fit": "模型拟合度",
  "model.residual": "残差（越小越好）",
  "model.status": "拟合状态",
  "model.converged": "✓ 已收敛",
  "model.not.converged": "⚠ 未完全收敛",

  // Placeholders
  "placeholder.crypto.symbol": "例如 BTCUSDT",
  "placeholder.stock.symbol": "例如 AAPL",
  "aria.crypto": "手动输入交易对",
  "aria.stock": "手动输入股票代码",

  // Footer
  "footer.about": "关于 LPPL",
  "footer.disclaimer": "⚠️ 免责声明：LPPL 模型仅供参考，不构成投资建议。",
}
