import { Helmet } from 'react-helmet-async'
import type { Mosque } from '@/types'

const BASE_URL = 'https://taraweeh.org'

// Organization structured data (for site-wide use)
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'أئمة التراويح - الرياض',
  url: BASE_URL,
  logo: `${BASE_URL}/static/images/logo.png`,
  image: `${BASE_URL}/static/images/og-image.png`,
  description: 'دليل أئمة التراويح في الرياض - تصفح المساجد واستمع للتلاوات لاختيار المسجد المناسب لك في رمضان',
}

// Website with search action
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'أئمة التراويح - الرياض',
  url: `${BASE_URL}/`,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${BASE_URL}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

// Base structured data for all pages
export function BaseStructuredData() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  )
}

// Mosque list structured data
interface MosqueListStructuredDataProps {
  mosques: Mosque[]
}

export function MosqueListStructuredData({ mosques }: MosqueListStructuredDataProps) {
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: mosques.map((mosque, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'PlaceOfWorship',
        name: mosque.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'الرياض',
          addressRegion: mosque.area || 'الرياض',
        },
        description: `مسجد ${mosque.name} - إمام التراويح: ${mosque.imam || 'غير محدد'}`,
        ...(mosque.latitude && mosque.longitude && {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: mosque.latitude,
            longitude: mosque.longitude,
          },
        }),
      },
    })),
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(itemListSchema)}
      </script>
    </Helmet>
  )
}

// Single mosque structured data
interface MosqueStructuredDataProps {
  mosque: Mosque
}

export function MosqueStructuredData({ mosque }: MosqueStructuredDataProps) {
  const mosqueSchema = {
    '@context': 'https://schema.org',
    '@type': 'Mosque',  // More specific than PlaceOfWorship
    name: mosque.name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: mosque.location || 'الرياض',
      addressRegion: mosque.area ? `${mosque.area} الرياض` : 'الرياض',
      addressCountry: 'SA',
    },
    description: mosque.imam
      ? `${mosque.name} - إمام التراويح: ${mosque.imam} - حي ${mosque.location}`
      : `${mosque.name} - حي ${mosque.location}`,
    ...(mosque.map_link && { hasMap: mosque.map_link }),
    ...(mosque.latitude && mosque.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: mosque.latitude,
        longitude: mosque.longitude,
      },
    }),
    ...(mosque.imam && {
      employee: {
        '@type': 'Person',
        name: mosque.imam,
        jobTitle: 'إمام التراويح',
      },
    }),
    url: `${BASE_URL}/mosque/${mosque.id}`,
    isAccessibleForFree: true,
    publicAccess: true,
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(mosqueSchema)}
      </script>
    </Helmet>
  )
}

// Breadcrumb structured data for navigation
interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbStructuredDataProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbStructuredData({ items }: BreadcrumbStructuredDataProps) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
    </Helmet>
  )
}
