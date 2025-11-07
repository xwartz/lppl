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
} from "recharts"
import { useTheme } from "../lib/theme-context"
import type { ThemePref } from "../lib/theme-context"

interface Point {
  date: string
  actual: number
  fitted?: number | null
}

interface Props {
  data: Point[]
  priceFormatter: (v: number) => string
}

const PriceChart: React.FC<Props> = ({ data, priceFormatter }) => {
  const { theme } = useTheme()
  const [chartHeight, setChartHeight] = useState<number>(400)

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

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
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
          tickFormatter={(v) => priceFormatter(Number(v))}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{
            fontSize: "12px",
            marginBottom: "8px",
            fontWeight: 600,
          }}
          itemStyle={{ fontSize: "12px" }}
          formatter={(value: number | string) =>
            typeof value === "number" ? priceFormatter(value) : value
          }
        />
        <Legend
          wrapperStyle={{ fontSize: "14px", paddingTop: "16px" }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={actualLineColor}
          strokeWidth={2}
          name="实际价格"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="fitted"
          stroke={fittedLineColor}
          strokeWidth={2}
          strokeDasharray="8 4"
          name="LPPL 拟合"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default PriceChart
