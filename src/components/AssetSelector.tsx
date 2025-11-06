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
      className="select-input"
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
