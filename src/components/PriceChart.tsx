import React, { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { useTheme } from "../lib/theme-context"
import type { ThemePref } from "../lib/theme-context"
import { useI18n } from "../lib/i18n"

interface Point {
  date: string
  actual: number | null
  fitted?: number | null
  isCriticalPoint?: boolean
}

interface Props {
  data: Point[]
  priceFormatter: (v: number) => string
  criticalDate?: Date | null
  predictedPrice?: number | null
}

const PriceChart: React.FC<Props> = ({
  data,
  priceFormatter,
  criticalDate,
  predictedPrice,
}) => {
  const { theme } = useTheme()
  const { t } = useI18n()
  const [chartHeight, setChartHeight] = useState<number>(400)
  const [showFullRange, setShowFullRange] = useState<boolean>(false)

  // Calculate price range from historical data
  const priceRange = React.useMemo(() => {
    const prices = data
      .flatMap((d) => [d.actual, d.fitted])
      .filter(
        (p): p is number => p !== null && p !== undefined && Number.isFinite(p)
      )

    if (prices.length === 0) return { min: 0, max: 0, range: 0 }

    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min

    return { min, max, range }
  }, [data])

  // Check if critical point is far from historical range
  const criticalPointAnalysis = React.useMemo(() => {
    if (
      !predictedPrice ||
      !Number.isFinite(predictedPrice) ||
      priceRange.range === 0
    ) {
      return {
        isFar: false,
        deviation: 0,
        deviationRatio: 0,
        shouldExtend: false,
      }
    }

    const deviation = Math.abs(predictedPrice - priceRange.max)
    const deviationRatio = deviation / priceRange.range

    // Consider "far" if deviation is more than 30% of historical range
    const isFar = deviationRatio > 0.3

    return {
      isFar,
      deviation,
      deviationRatio,
      shouldExtend: !isFar || showFullRange,
    }
  }, [predictedPrice, priceRange, showFullRange])

  // Extend chart data conditionally
  const extendedData = React.useMemo<Point[]>(() => {
    if (!criticalDate || !predictedPrice || !Number.isFinite(predictedPrice)) {
      return data
    }

    // Don't extend if critical point is too far and user hasn't toggled full range
    if (!criticalPointAnalysis.shouldExtend) {
      return data
    }

    const criticalDateStr = criticalDate.toLocaleDateString()
    const lastDataPoint = data[data.length - 1]

    // Check if critical point already exists in data
    const criticalExists = data.some((d) => d.date === criticalDateStr)

    if (criticalExists) {
      return data
    }

    // If critical date is after the last data point, append it
    if (lastDataPoint) {
      const lastDate = new Date(lastDataPoint.date)
      const criticalTime = criticalDate.getTime()
      const lastTime = lastDate.getTime()

      if (criticalTime > lastTime) {
        // Add critical point at the end
        return [
          ...data,
          {
            date: criticalDateStr,
            actual: null,
            fitted: predictedPrice,
            isCriticalPoint: true,
          },
        ]
      }
    }

    return data
  }, [data, criticalDate, predictedPrice, criticalPointAnalysis.shouldExtend])

  // Find critical date position in chart
  const criticalDateStr = criticalDate?.toLocaleDateString()
  const criticalPointCoord =
    criticalDate && predictedPrice && Number.isFinite(predictedPrice)
      ? {
          date: criticalDateStr,
          price: predictedPrice,
        }
      : null

  // Responsive chart height
  useEffect(() => {
    const calc = () => {
      if (typeof window === "undefined") return
      const w = window.innerWidth
      setChartHeight(w < 640 ? 280 : 400)
    }
    calc()
    window.addEventListener("resize", calc)
    return () => window.removeEventListener("resize", calc)
  }, [])

  // Detect system dark mode when theme is 'system'
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark =
    theme === ("dark" as ThemePref) ||
    (theme === ("system" as ThemePref) && systemDark)

  // Chart colors based on theme
  const gridStroke = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
  const axisColor = isDark ? "#737373" : "#737373"
  const actualLineColor = isDark ? "#06b6d4" : "#0284c7"
  const fittedLineColor = isDark ? "#fafafa" : "#171717"
  const criticalColor = isDark ? "#f59e0b" : "#d97706"

  const tooltipStyle = isDark
    ? {
        backgroundColor: "#171717",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px",
        color: "#ffffff",
        padding: "12px",
      }
    : {
        backgroundColor: "#ffffff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "8px",
        color: "#000000",
        padding: "12px",
      }

  // Custom label for critical point
  const CriticalLabel = ({
    viewBox,
  }: {
    viewBox?: { x?: number; y?: number }
  }) => {
    const x = viewBox?.x ?? 0
    const y = viewBox?.y ?? 0

    return (
      <g>
        <text
          x={x}
          y={y - 12}
          fill={criticalColor}
          fontSize={12}
          fontWeight={600}
          textAnchor="middle"
        >
          {t("chart.critical.point")}
        </text>
        <text
          x={x}
          y={y + 24}
          fill={axisColor}
          fontSize={10}
          textAnchor="middle"
        >
          {criticalDateStr ?? ""}
        </text>
        <text
          x={x}
          y={y + 38}
          fill={axisColor}
          fontSize={10}
          textAnchor="middle"
        >
          {predictedPrice && Number.isFinite(predictedPrice)
            ? priceFormatter(predictedPrice)
            : ""}
        </text>
      </g>
    )
  }

  // Custom dot renderer to highlight critical point
  const renderCriticalDot = (props: {
    cx?: number
    cy?: number
    payload?: Point
  }): React.ReactElement => {
    const { cx, cy, payload } = props

    if (!payload?.isCriticalPoint || cx === undefined || cy === undefined) {
      return <g />
    }

    return (
      <g>
        {/* Outer pulse ring */}
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill={criticalColor}
          fillOpacity={0.2}
          className="animate-ping"
          style={{ animationDuration: "2s" }}
        />
        {/* Main dot */}
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={criticalColor}
          stroke={isDark ? "#000" : "#fff"}
          strokeWidth={2}
        />
      </g>
    )
  }

  return (
    <div className="relative">
      {/* Warning banner when critical point is far */}
      {criticalPointAnalysis.isFar && !showFullRange && criticalPointCoord && (
        <div className="mb-3 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-warning font-medium mb-1">
              {t("chart.warning.far")}
            </p>
            <p className="text-xs text-muted">
              {t("chart.warning.far.desc", {
                price: priceFormatter(criticalPointCoord.price),
                percent: (criticalPointAnalysis.deviationRatio * 100).toFixed(
                  0
                ),
              })}
            </p>
          </div>
          <button
            onClick={() => setShowFullRange(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-warning/20 hover:bg-warning/30 text-warning transition-colors whitespace-nowrap"
          >
            {t("chart.show.full")}
          </button>
        </div>
      )}

      {/* Toggle back to focused view */}
      {showFullRange && criticalPointAnalysis.isFar && (
        <div className="mb-3 p-3 bg-info/10 border border-info/20 rounded-lg flex items-center justify-between">
          <p className="text-sm text-info">{t("chart.showing.full")}</p>
          <button
            onClick={() => setShowFullRange(false)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-info/20 hover:bg-info/30 text-info transition-colors"
          >
            {t("chart.focus.history")}
          </button>
        </div>
      )}

      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart
          data={extendedData}
          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} />
          <XAxis
            dataKey="date"
            stroke={axisColor}
            tick={{ fontSize: 12, fill: axisColor }}
            tickLine={{ stroke: gridStroke }}
          />
          <YAxis
            stroke={axisColor}
            tick={{ fontSize: 12, fill: axisColor }}
            tickLine={{ stroke: gridStroke }}
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => priceFormatter(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{
              fontSize: "12px",
              marginBottom: "8px",
              fontWeight: 600,
            }}
            itemStyle={{ fontSize: "12px" }}
            formatter={(value: number | string | (string | number)[]) => {
              if (value === null || value === undefined) return "—"
              if (Array.isArray(value)) return value.join(", ")
              return typeof value === "number" ? priceFormatter(value) : value
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "14px", paddingTop: "16px" }}
            iconType="line"
          />

          {/* Critical Date Vertical Line - only show if in view */}
          {criticalDateStr && criticalPointAnalysis.shouldExtend && (
            <ReferenceLine
              x={criticalDateStr}
              stroke={criticalColor}
              strokeWidth={2}
              strokeDasharray="4 4"
              label={<CriticalLabel />}
            />
          )}

          {/* Critical Price Horizontal Line - only show if in view */}
          {criticalPointCoord && criticalPointAnalysis.shouldExtend && (
            <ReferenceLine
              y={criticalPointCoord.price}
              stroke={criticalColor}
              strokeWidth={1}
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />
          )}

          <Line
            type="monotone"
            dataKey="actual"
            stroke={actualLineColor}
            strokeWidth={2}
            name={t("chart.actual")}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="fitted"
            stroke={fittedLineColor}
            strokeWidth={2}
            strokeDasharray="8 4"
            name={t("chart.fitted")}
            dot={renderCriticalDot}
            activeDot={{ r: 4 }}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PriceChart
