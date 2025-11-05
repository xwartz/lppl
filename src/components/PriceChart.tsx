import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Point { date: string; actual: number; fitted?: number | null }

interface Props {
  data: Point[]
  priceFormatter: (v: number) => string
}

const PriceChart: React.FC<Props> = ({ data, priceFormatter }) => {
  const xInterval = data.length > 10 ? Math.floor(data.length / 10) : 0
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} interval={xInterval} />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} domain={["dataMin", "dataMax"]} tickFormatter={(v) => priceFormatter(Number(v))} />
        <Tooltip
          contentStyle={{ backgroundColor: 'rgba(255,255,255,0.96)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8 }}
          formatter={(value: number | string) => (typeof value === 'number' ? priceFormatter(value) : value)}
        />
        <Legend />
        <Line type="monotone" dataKey="actual" stroke="#f59e0b" strokeWidth={2} name="实际价格" dot={false} />
        <Line type="monotone" dataKey="fitted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="LPPL 拟合" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default PriceChart
