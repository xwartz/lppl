import type React from 'react'
import LPPLTracker from '../components/LPPLTracker'
import SEOHead from '../components/SEOHead'

const CryptoLPPLPage: React.FC = () => {
  return (
    <>
      <SEOHead path="/" />
      <LPPLTracker />
    </>
  )
}

export default CryptoLPPLPage
