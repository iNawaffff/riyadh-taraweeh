import type { Mosque, SearchParams, NearbyParams, ErrorReport, ErrorReportResponse, PublicProfile, TrackerData, PublicTrackerData, ImamSearchResult, TransferRequest, LeaderboardEntry } from '@/types'
import { getAuthSync } from '@/lib/firebase'

const API_BASE = '/api'

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, options)
  const authInstance = getAuthSync()
  if (response.status === 401 && authInstance?.currentUser) {
    const newToken = await authInstance.currentUser.getIdToken(true)
    const retryOptions = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      },
    }
    return fetch(url, retryOptions)
  }
  return response
}

/**
 * Fetch all mosques
 */
export async function fetchMosques(): Promise<Mosque[]> {
  const response = await fetch(`${API_BASE}/mosques`)

  if (!response.ok) {
    throw new Error('Failed to fetch mosques')
  }

  return response.json()
}

/**
 * Search mosques with optional query and area filter
 */
export async function searchMosques(params: SearchParams): Promise<Mosque[]> {
  const searchParams = new URLSearchParams()

  if (params.q) {
    searchParams.set('q', params.q)
  }

  if (params.area && params.area !== 'الكل') {
    searchParams.set('area', params.area)
  }

  if (params.location && params.location !== 'الكل') {
    searchParams.set('location', params.location)
  }

  const response = await fetch(`${API_BASE}/mosques/search?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to search mosques')
  }

  return response.json()
}

/**
 * Get mosques sorted by proximity to user location
 */
export async function fetchNearbyMosques(params: NearbyParams): Promise<Mosque[]> {
  const searchParams = new URLSearchParams({
    lat: params.lat.toString(),
    lng: params.lng.toString(),
  })

  const response = await fetch(`${API_BASE}/mosques/nearby?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch nearby mosques')
  }

  return response.json()
}

/**
 * Get a single mosque by ID
 */
export async function fetchMosqueById(id: number): Promise<Mosque> {
  const response = await fetch(`${API_BASE}/mosques/${id}`)

  if (!response.ok) {
    throw new Error('Mosque not found')
  }

  return response.json()
}

/**
 * Get unique areas for filtering (شمال/شرق/غرب/جنوب)
 */
export async function fetchAreas(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/areas`)
  if (!response.ok) {
    throw new Error('Failed to fetch areas')
  }
  return response.json()
}

/**
 * Fetch unique locations (districts), optionally filtered by area
 */
export async function fetchLocations(area?: string): Promise<string[]> {
  const params = new URLSearchParams()
  if (area && area !== 'الكل') {
    params.set('area', area)
  }
  const response = await fetch(`${API_BASE}/locations?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch locations')
  }
  return response.json()
}

/**
 * Submit an error report for a mosque
 */
export async function submitErrorReport(report: ErrorReport): Promise<ErrorReportResponse> {
  const formData = new FormData()
  formData.append('mosque_id', report.mosque_id.toString())

  report.error_type.forEach(type => {
    formData.append('error_type', type)
  })

  if (report.error_details) {
    formData.append('error_details', report.error_details)
  }

  if (report.reporter_email) {
    formData.append('reporter_email', report.reporter_email)
  }

  const response = await fetch('/report-error', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to submit error report')
  }

  return response.json()
}

/**
 * Fetch a public user profile
 */
export async function fetchPublicProfile(username: string): Promise<PublicProfile> {
  const response = await fetch(`${API_BASE}/u/${username}`)
  if (!response.ok) throw new Error('User not found')
  return response.json()
}

// Tracker API
export async function fetchTracker(token: string): Promise<TrackerData> {
  const response = await authFetch(`${API_BASE}/user/tracker`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch tracker')
  return response.json()
}

export async function toggleNight(token: string, night: number, mosqueId?: number, rakaat?: number): Promise<void> {
  await authFetch(`${API_BASE}/user/tracker/${night}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mosque_id: mosqueId ?? null, rakaat: rakaat ?? null }),
  })
}

export async function removeNight(token: string, night: number): Promise<void> {
  await authFetch(`${API_BASE}/user/tracker/${night}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function fetchPublicTracker(username: string): Promise<PublicTrackerData> {
  const response = await fetch(`${API_BASE}/u/${username}/tracker`)
  if (!response.ok) throw new Error('Tracker not found')
  return response.json()
}

// Transfer API
export async function searchImams(query: string): Promise<ImamSearchResult[]> {
  const response = await fetch(`${API_BASE}/imams/search?q=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error('Failed to search imams')
  return response.json()
}

export async function submitTransfer(token: string, data: { mosque_id: number; new_imam_id?: number; new_imam_name?: string; notes?: string }): Promise<{ id: number; status: string }> {
  const response = await authFetch(`${API_BASE}/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Failed to submit transfer')
  }
  return response.json()
}

export async function cancelTransfer(token: string, transferId: number): Promise<void> {
  const response = await authFetch(`${API_BASE}/transfers/${transferId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Failed to cancel transfer')
  }
}

export async function fetchUserTransfers(token: string): Promise<TransferRequest[]> {
  const response = await authFetch(`${API_BASE}/user/transfers`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch transfers')
  return response.json()
}

export async function markMilestone(token: string, milestone: string): Promise<void> {
  await authFetch(`${API_BASE}/user/milestones/${milestone}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_BASE}/leaderboard`)
  if (!response.ok) throw new Error('Failed to fetch leaderboard')
  return response.json()
}

