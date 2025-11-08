import React from "react"
import StockLPPLTracker from "../components/StockLPPLTracker"
import SEOHead from "../components/SEOHead"

const StockLPPLPage: React.FC = () => {
  return (
    <>
      <SEOHead path="/stocks" />
      <StockLPPLTracker />
    </>
  )
}

export default StockLPPLPage


