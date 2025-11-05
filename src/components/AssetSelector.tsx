import React from 'react'

interface Props {
  symbol: string
  setSymbol: (s: string) => void
}

const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']

const AssetSelector: React.FC<Props> = ({ symbol, setSymbol }) => {
  return (
    <select value={symbol} onChange={e => setSymbol(e.target.value)} className="bg-white/8 text-black px-3 py-2 rounded-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
      {symbols.map(s => <option key={s} value={s}>{s.replace('USDT','')}</option>)}
    </select>
  )
}

export default AssetSelector
