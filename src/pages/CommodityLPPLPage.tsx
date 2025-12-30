import React from "react"
import CommodityLPPLTracker from "../components/CommodityLPPLTracker"
import SEOHead from "../components/SEOHead"

const CommodityLPPLPage: React.FC = () => {
  return (
    <>
      <SEOHead path="/commodities" />
      <CommodityLPPLTracker />
    </>
  )
}

export default CommodityLPPLPage
