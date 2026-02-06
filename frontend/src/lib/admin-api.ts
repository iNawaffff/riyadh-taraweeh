import { authFetch } from '@/lib/api'
import type {
  AdminMosque,
  AdminImam,
  AdminTransfer,
  AdminUser,
  AdminStats,
  PaginatedResponse,
  AudioExtractResult,
  AudioTrimResult,
  UserRole,
} from '@/types'

const API_BASE = '/api/admin'

async function adminFetch(url: string, token: string, options: RequestInit = {}): Promise<Response> {
  return authFetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

async function adminJson<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await adminFetch(url, token, options)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed: ${response.status}`)
  }
  return response.json()
}

// Stats
export async function fetchAdminStats(token: string): Promise<AdminStats> {
  return adminJson(`${API_BASE}/stats`, token)
}

// Mosques
export async function fetchAdminMosques(
  token: string,
  params: { page?: number; per_page?: number; search?: string; area?: string } = {}
): Promise<PaginatedResponse<AdminMosque>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.per_page) sp.set('per_page', String(params.per_page))
  if (params.search) sp.set('search', params.search)
  if (params.area) sp.set('area', params.area)
  return adminJson(`${API_BASE}/mosques?${sp}`, token)
}

export async function createAdminMosque(token: string, data: Record<string, unknown>): Promise<{ id: number }> {
  return adminJson(`${API_BASE}/mosques`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateAdminMosque(token: string, id: number, data: Record<string, unknown>): Promise<void> {
  await adminJson(`${API_BASE}/mosques/${id}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteAdminMosque(token: string, id: number): Promise<void> {
  await adminJson(`${API_BASE}/mosques/${id}`, token, { method: 'DELETE' })
}

// Imams
export async function fetchAdminImams(
  token: string,
  params: { page?: number; per_page?: number; search?: string } = {}
): Promise<PaginatedResponse<AdminImam>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.per_page) sp.set('per_page', String(params.per_page))
  if (params.search) sp.set('search', params.search)
  return adminJson(`${API_BASE}/imams?${sp}`, token)
}

export async function createAdminImam(token: string, data: Record<string, unknown>): Promise<{ id: number }> {
  return adminJson(`${API_BASE}/imams`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateAdminImam(token: string, id: number, data: Record<string, unknown>): Promise<void> {
  await adminJson(`${API_BASE}/imams/${id}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteAdminImam(token: string, id: number): Promise<void> {
  await adminJson(`${API_BASE}/imams/${id}`, token, { method: 'DELETE' })
}

// Transfers
export async function fetchAdminTransfers(
  token: string,
  params: { page?: number; per_page?: number; status?: string } = {}
): Promise<PaginatedResponse<AdminTransfer>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.per_page) sp.set('per_page', String(params.per_page))
  if (params.status) sp.set('status', params.status)
  return adminJson(`${API_BASE}/transfers?${sp}`, token)
}

export async function approveTransfer(token: string, id: number): Promise<void> {
  await adminJson(`${API_BASE}/transfers/${id}/approve`, token, { method: 'POST' })
}

export async function rejectTransfer(token: string, id: number, reason?: string): Promise<void> {
  await adminJson(`${API_BASE}/transfers/${id}/reject`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
}

// Users
export async function fetchAdminUsers(
  token: string,
  params: { page?: number; per_page?: number; search?: string } = {}
): Promise<PaginatedResponse<AdminUser>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.per_page) sp.set('per_page', String(params.per_page))
  if (params.search) sp.set('search', params.search)
  return adminJson(`${API_BASE}/users?${sp}`, token)
}

export async function updateUserRole(token: string, userId: number, role: UserRole): Promise<void> {
  await adminJson(`${API_BASE}/users/${userId}/role`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
}

// Audio Pipeline
export async function extractAudio(token: string, url: string): Promise<AudioExtractResult> {
  return adminJson(`${API_BASE}/audio/extract`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
}

export function getTempAudioUrl(tempId: string): string {
  return `${API_BASE}/audio/temp/${tempId}`
}

export async function trimAndUploadAudio(
  token: string,
  tempId: string,
  startMs: number,
  endMs: number,
  filename?: string
): Promise<AudioTrimResult> {
  return adminJson(`${API_BASE}/audio/trim-upload`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_id: tempId, start_ms: startMs, end_ms: endMs, filename }),
  })
}
