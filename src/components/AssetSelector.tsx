import React from 'react'

interface Props {
  symbol: string
  setSymbol: (s: string) => void
}

const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ZECUSDT"]

const AssetSelector: React.FC<Props> = ({ symbol, setSymbol }) => {
  return (
    <select
      value={symbol}
      onChange={(e) => setSymbol(e.target.value)}
      className="h-10 px-3 text-sm rounded-lg focus:ring-2 focus:ring-accent transition-all"
    >
      {symbols.map((s) => (
        <option key={s} value={s}>
          {s.replace("USDT", "")}
        </option>
      ))}
    </select>
  )
}

export default AssetSelector
