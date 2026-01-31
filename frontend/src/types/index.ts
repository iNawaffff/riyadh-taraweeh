// Mosque and Imam types based on the Flask models

export interface Mosque {
  id: number
  name: string
  location: string
  area: string
  map_link: string | null
  latitude: number | null
  longitude: number | null
  imam: string | null
  audio_sample: string | null
  youtube_link: string | null
  distance?: number // Added when sorted by proximity
}

export interface MosqueDetail extends Mosque {
  description?: string
}

// API response types
export interface ApiResponse<T> {
  data?: T
  error?: string
}

// Search params
export interface SearchParams {
  q?: string
  area?: string
}

// Nearby params
export interface NearbyParams {
  lat: number
  lng: number
}

// Error report types
export interface ErrorReport {
  mosque_id: number
  error_type: string[]
  error_details?: string
  reporter_email?: string
}

export interface ErrorReportResponse {
  success: boolean
  message: string
}

// Geolocation types
export interface GeolocationPosition {
  latitude: number
  longitude: number
}

export interface GeolocationError {
  code: number
  message: string
}

// Distance badge types
export type DistanceCategory = 'walking' | 'bicycle' | 'car'

// Auth types
export interface PublicProfile {
  username: string
  display_name: string | null
  avatar_url: string | null
  mosques: Mosque[]
}

// Tracker types
export interface TrackerNight {
  night: number
  mosque_id: number | null
  attended_at: string
}

export interface TrackerStats {
  attended: number
  total: 30
  current_streak: number
  best_streak: number
}

export interface TrackerData {
  nights: TrackerNight[]
  stats: TrackerStats
}

export interface PublicTrackerData extends TrackerData {
  username: string
  display_name: string | null
}

// Audio player state
export interface AudioState {
  isPlaying: boolean
  currentMosqueId: number | null
  isLoading: boolean
  error: string | null
}
