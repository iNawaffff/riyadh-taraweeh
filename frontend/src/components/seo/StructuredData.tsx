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
    '@type': 'PlaceOfWorship',
    name: mosque.name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'الرياض',
      addressRegion: mosque.area,
    },
    description: `مسجد ${mosque.name} هو أحد المساجد المميزة في منطقة ${mosque.area} بمدينة الرياض، ويُعرف بموقعه المتميز وسهولة الوصول إليه.`,
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
        jobTitle: 'إمام',
      },
    }),
    url: `${BASE_URL}/mosque/${mosque.id}`,
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(mosqueSchema)}
      </script>
    </Helmet>
  )
}
