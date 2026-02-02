/**
 * Normalize Arabic text for improved search matching.
 * Handles different forms of letters, removes diacritics, and standardizes spacing.
 */
export function normalizeArabic(text: string): string {
  if (!text) return ''

  // Convert to string if not already
  let normalized = String(text)

  // Replace various forms of Alif (أ إ آ ا)
  normalized = normalized.replace(/[إأآا]/g, 'ا')

  // Replace various forms of Yaa (ي ى)
  normalized = normalized.replace(/[يى]/g, 'ي')

  // Replace Taa Marbuta with Ha (ة → ه)
  normalized = normalized.replace(/ة/g, 'ه')

  // Remove Tashkeel (Arabic diacritics)
  // Unicode range U+064B to U+0652
  normalized = normalized.replace(/[\u064B-\u0652]/g, '')

  // Remove Tatweel (Arabic elongation character)
  normalized = normalized.replace(/\u0640/g, '')

  // Standardize spacing (collapse multiple spaces)
  normalized = normalized.split(/\s+/).join(' ').trim()

  // Convert to lowercase for case-insensitive matching
  return normalized.toLowerCase()
}

/**
 * Format a date in Arabic (Hijri) format
 */
export function formatArabicDate(date: Date = new Date()): string {
  try {
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    // Fallback for browsers that don't support Arabic locale
    return date.toLocaleDateString()
  }
}

/**
 * Format distance in Arabic
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    // Less than 1 km, show in meters
    const meters = Math.round(distanceKm * 1000)
    return `${meters} م`
  }

  // More than 1 km
  return `${distanceKm.toFixed(1)} كم`
}

/**
 * Get distance category based on distance in kilometers
 */
export function getDistanceCategory(distanceKm: number): 'walking' | 'bicycle' | 'car' {
  if (distanceKm < 1) {
    return 'walking'
  } else if (distanceKm < 5) {
    return 'bicycle'
  }
  return 'car'
}

/**
 * Convert a number to Arabic numerals
 */
export const toArabicNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])

/**
 * Ramadan 1447 info (approx Feb 18 – Mar 19, 2026)
 */
export interface RamadanInfo {
  type: 'before' | 'during' | 'after'
  daysUntil?: number
  nightNum?: number
  daysLeft?: number
}

export function getRamadanInfo(): RamadanInfo {
  const ramadanStart = new Date(2026, 1, 18)
  const ramadanEnd = new Date(2026, 2, 19)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (now < ramadanStart) {
    const diff = Math.ceil((ramadanStart.getTime() - now.getTime()) / 86400000)
    return { type: 'before', daysUntil: diff }
  }
  if (now > ramadanEnd) {
    return { type: 'after' }
  }
  const nightNum = Math.ceil((now.getTime() - ramadanStart.getTime()) / 86400000) + 1
  const daysLeft = Math.ceil((ramadanEnd.getTime() - now.getTime()) / 86400000)
  return { type: 'during', nightNum: Math.min(nightNum, 30), daysLeft }
}
