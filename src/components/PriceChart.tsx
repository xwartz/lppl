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
import { useTheme } from "../lib/theme"
import type { ThemePref } from "../lib/theme"

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

  // set responsive chart height based on viewport width
  useEffect(() => {
    const calc = () => {
      if (typeof window === "undefined") return
      const w = window.innerWidth
      // Tailwind 'sm' breakpoint is 640px; choose a compact height for small screens
      setChartHeight(w < 640 ? 260 : 400)
    }
    calc()
    window.addEventListener("resize", calc)
    return () => window.removeEventListener("resize", calc)
  }, [])
  // detect system dark when pref === 'system'
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark =
    theme === ("dark" as ThemePref) ||
    (theme === ("system" as ThemePref) && systemDark)

  const gridStroke = isDark ? "rgba(255,255,255,0.04)" : "#e0e0e0"
  const axisStroke = isDark ? "#9ca3af" : "#374151"
  const tooltipStyle = isDark
    ? {
        backgroundColor: "rgba(17,24,39,0.92)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        color: "#e5e7eb",
      }
    : {
        backgroundColor: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 8,
      }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="date" stroke={axisStroke} tick={{ fontSize: 12 }} />
        <YAxis
          stroke={axisStroke}
          tick={{ fontSize: 12 }}
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v) => priceFormatter(Number(v))}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number | string) =>
            typeof value === "number" ? priceFormatter(value) : value
          }
        />
        <Legend />
        {
          // read semantic colors from CSS variables so chart matches theme tokens
        }
        <Line
          type="monotone"
          dataKey="actual"
          stroke={
            getComputedStyle(document.documentElement).getPropertyValue(
              "--warning"
            ) || "#f59e0b"
          }
          strokeWidth={2}
          name="实际价格"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="fitted"
          stroke={
            getComputedStyle(document.documentElement).getPropertyValue(
              "--accent"
            ) || "#8b5cf6"
          }
          strokeWidth={2}
          strokeDasharray="5 5"
          name="LPPL 拟合"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default PriceChart
