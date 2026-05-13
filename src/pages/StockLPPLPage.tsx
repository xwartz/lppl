import type React from 'react'
import SEOHead from '../components/SEOHead'
import StockLPPLTracker from '../components/StockLPPLTracker'

const StockLPPLPage: React.FC = () => {
  return (
    <>
      <SEOHead path="/stocks" />
      <StockLPPLTracker />
    </>
  )
}

export default StockLPPLPage
