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
 * Convert a number to Arabic ordinal (feminine form for ليلة)
 * Uses proper Arabic grammar: ordinal adjectives for 1-10, compound ordinals for 11+
 *
 * Examples:
 * 1 → الأولى, 2 → الثانية, 10 → العاشرة
 * 11 → الحادية عشرة, 21 → الحادية والعشرين, 27 → السابعة والعشرين
 */
export function toArabicOrdinalFeminine(n: number): string {
  // Ordinals 1-10 (feminine form, with ال prefix)
  const ordinals1to10 = [
    '', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة',
    'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'
  ]

  // Units ordinals without ال (for compound numbers like 21st, 27th)
  const unitsOrdinal = [
    '', 'الحادية', 'الثانية', 'الثالثة', 'الرابعة',
    'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة'
  ]

  if (n >= 1 && n <= 10) {
    return ordinals1to10[n]
  }

  if (n >= 11 && n <= 19) {
    // 11-19: الحادية عشرة, الثانية عشرة, etc.
    const unit = unitsOrdinal[n - 10]
    return `${unit} عشرة`
  }

  if (n >= 20 && n <= 30) {
    if (n === 20) {
      return 'العشرين'
    }
    // 21-29: الحادية والعشرين, الثانية والعشرين, etc.
    const unit = unitsOrdinal[n - 20]
    return `${unit} والعشرين`
  }

  // Fallback for numbers outside 1-30 range
  return `${toArabicNum(n)}`
}

/**
 * Arabic noun pluralization based on التمييز العددي rules
 *
 * Arabic grammar rules:
 * - 0: plural (صفر ليالٍ)
 * - 1: singular (ليلة واحدة)
 * - 2: dual (ليلتين)
 * - 3-10: plural genitive (ليالٍ)
 * - 11+: singular accusative (ليلة)
 */
interface ArabicNounForms {
  singular: string   // 1, 11+
  dual: string       // 2
  plural: string     // 0, 3-10
}

export function pluralizeArabic(count: number, forms: ArabicNounForms): string {
  if (count === 0) return forms.plural
  if (count === 1) return forms.singular
  if (count === 2) return forms.dual
  if (count >= 3 && count <= 10) return forms.plural
  return forms.singular // 11+
}

// Pre-defined noun forms for common words
// Dual uses accusative/genitive (ين) form — standard for UI contexts
export const arabicNouns = {
  night: { singular: 'ليلة', dual: 'ليلتين', plural: 'ليالٍ' },
  day: { singular: 'يوم', dual: 'يومين', plural: 'أيام' },
  favorite: { singular: 'مفضلة', dual: 'مفضلتين', plural: 'مفضلات' },
  contribution: { singular: 'مساهمة', dual: 'مساهمتين', plural: 'مساهمات' },
  mosque: { singular: 'مسجد', dual: 'مسجدين', plural: 'مساجد' },
  point: { singular: 'نقطة', dual: 'نقطتين', plural: 'نقاط' },
}

/**
 * Format a count with proper Arabic noun form
 * Returns: "٣ ليالٍ" or "ليلة واحدة" etc.
 */
export function formatArabicCount(count: number, forms: ArabicNounForms, options?: { showOne?: boolean }): string {
  const noun = pluralizeArabic(count, forms)

  if (count === 0) return `لا يوجد`
  if (count === 1) return options?.showOne ? `${forms.singular} واحدة` : forms.singular
  if (count === 2) return forms.dual
  return `${toArabicNum(count)} ${noun}`
}

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
