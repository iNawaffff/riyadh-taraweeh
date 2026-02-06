import { Helmet } from 'react-helmet-async'

interface MetaTagsProps {
  title?: string
  description?: string
  canonicalUrl?: string
  ogTitle?: string
  ogDescription?: string
  ogType?: string
  ogImage?: string
  twitterTitle?: string
  twitterDescription?: string
}

const DEFAULT_TITLE = 'أئمة التراويح - الرياض'
const DEFAULT_DESCRIPTION = 'دليل أئمة التراويح في الرياض ٢٠٢٥ - تصفح المساجد واستمع للتلاوات لاختيار المسجد المناسب لك في رمضان'
const BASE_URL = 'https://taraweeh.org'
const OG_IMAGE = `${BASE_URL}/static/images/og-image-v2.png`

export function MetaTags({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  ogTitle,
  ogDescription,
  ogType = 'website',
  ogImage = OG_IMAGE,
  twitterTitle,
  twitterDescription,
}: MetaTagsProps) {
  const fullTitle = title ? `${title} - أئمة التراويح` : DEFAULT_TITLE
  const fullCanonicalUrl = canonicalUrl ? `${BASE_URL}${canonicalUrl}` : undefined

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Canonical URL */}
      {fullCanonicalUrl && <link rel="canonical" href={fullCanonicalUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {fullCanonicalUrl && <meta property="og:url" content={fullCanonicalUrl} />}
      <meta property="og:locale" content="ar_SA" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twitterTitle || fullTitle} />
      <meta name="twitter:description" content={twitterDescription || description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  )
}
