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
  location?: string
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
  created_at: string | null
  contribution_points: number
  mosques: Mosque[]
}

// Tracker types
export interface TrackerNight {
  night: number
  mosque_id: number | null
  rakaat: number | null
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

// Transfer types
export interface ImamSearchResult {
  id: number
  name: string
  mosque_name: string | null
  mosque_id: number | null
}

export interface TransferRequest {
  id: number
  mosque_id: number
  mosque_name: string | null
  current_imam_name: string | null
  new_imam_name: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  created_at: string
  reviewed_at: string | null
}

export interface LeaderboardEntry {
  username: string
  display_name: string | null
  avatar_url: string | null
  points: number
  is_pioneer?: boolean
}

// Audio player state
export interface AudioState {
  isPlaying: boolean
  currentMosqueId: number | null
  isLoading: boolean
  error: string | null
}

// Admin types
export type UserRole = 'user' | 'moderator' | 'admin'

export interface AdminMosque {
  id: number
  name: string
  location: string
  area: string
  map_link: string | null
  latitude: number | null
  longitude: number | null
  imam_id: number | null
  imam_name: string | null
  audio_sample: string | null
  youtube_link: string | null
}

export interface AdminImam {
  id: number
  name: string
  mosque_id: number | null
  mosque_name: string | null
  audio_sample: string | null
  youtube_link: string | null
}

export interface AdminTransfer {
  id: number
  submitter_name: string | null
  mosque_id: number
  mosque_name: string | null
  current_imam_name: string | null
  new_imam_name: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  created_at: string
  reviewed_at: string | null
}

export interface AdminUser {
  id: number
  username: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  role: UserRole
  contribution_points: number
  trust_level: TrustLevel
  created_at: string | null
}

export interface AdminStats {
  mosque_count: number
  imam_count: number
  user_count: number
  pending_requests: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

// Community Request types
export type RequestType = 'new_mosque' | 'new_imam' | 'imam_transfer'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'needs_info'
export type TrustLevel = 'default' | 'trusted' | 'not_trusted'

export interface CommunityRequest {
  id: number
  request_type: RequestType
  status: RequestStatus
  notes: string | null
  reject_reason: string | null
  admin_notes?: string | null
  created_at: string | null
  reviewed_at: string | null
  // Mosque fields (new_mosque)
  mosque_name?: string | null
  mosque_area?: string | null
  mosque_location?: string | null
  mosque_map_link?: string | null
  // Imam fields
  imam_name?: string | null
  imam_source?: 'existing' | 'new' | null
  imam_youtube_link?: string | null
  imam_audio_url?: string | null
  existing_imam_id?: number | null
  // Transfer fields
  target_mosque_id?: number | null
  target_mosque_name?: string | null
}

export interface AdminCommunityRequest extends CommunityRequest {
  submitter_name: string | null
  submitter_id: number
  submitter_trust_level: TrustLevel
  admin_notes: string | null
  duplicate_of: number | null
  // Extra fields from GET detail
  existing_imam_name?: string | null
  // Impact warning fields
  current_mosque_imam?: string | null
  imam_current_mosque_name?: string | null
}

export interface DuplicateMatch {
  id: number
  name: string
  area?: string
  location?: string
  mosque_id?: number | null
  mosque_name?: string | null
}

export interface AudioExtractResult {
  temp_id: string
  duration_ms: number
}

export interface AudioTrimResult {
  s3_url: string
}
