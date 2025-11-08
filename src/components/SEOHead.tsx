import React, { useEffect } from "react"
import { useI18n } from "../lib/i18n"

interface SEOHeadProps {
  title?: string
  description?: string
  keywords?: string
  path?: string
  imageUrl?: string
}

const SEOHead: React.FC<SEOHeadProps> = ({ title, description, keywords, path = "", imageUrl }) => {
  const { t } = useI18n()

  const siteUrl = typeof window !== "undefined" ? window.location.origin : ""
  const currentUrl = `${siteUrl}${path}`

  const metaTitle = title || t("meta.title")
  const metaDescription = description || t("meta.description")
  const metaKeywords = keywords || t("meta.keywords")
  const defaultImage = `${siteUrl}/lppl-logo.svg`
  const metaImage = imageUrl || defaultImage

  useEffect(() => {
    // Update document title
    document.title = metaTitle

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? "property" : "name"
      let element = document.querySelector(`meta[${attribute}="${name}"]`)

      if (!element) {
        element = document.createElement("meta")
        element.setAttribute(attribute, name)
        document.head.appendChild(element)
      }

      element.setAttribute("content", content)
    }

    // Basic meta tags
    updateMetaTag("description", metaDescription)
    updateMetaTag("keywords", metaKeywords)

    // Open Graph tags
    updateMetaTag("og:title", metaTitle, true)
    updateMetaTag("og:description", metaDescription, true)
    updateMetaTag("og:url", currentUrl, true)
    updateMetaTag("og:type", "website", true)
    updateMetaTag("og:image", metaImage, true)
    updateMetaTag("og:site_name", "LPPL Bubble Tracker", true)

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image")
    updateMetaTag("twitter:title", metaTitle)
    updateMetaTag("twitter:description", metaDescription)
    updateMetaTag("twitter:image", metaImage)

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement("link")
      canonical.setAttribute("rel", "canonical")
      document.head.appendChild(canonical)
    }
    canonical.setAttribute("href", currentUrl)
  }, [metaTitle, metaDescription, metaKeywords, currentUrl, metaImage])

  return null
}

export default SEOHead

