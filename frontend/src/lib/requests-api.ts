import { authFetch } from '@/lib/api'
import type {
  CommunityRequest,
  AdminCommunityRequest,
  PaginatedResponse,
  DuplicateMatch,
} from '@/types'

const API_BASE = '/api'

async function jsonFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(url, options)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `Request failed: ${response.status}`)
  }
  return response.json()
}

// --- Public ---

export async function submitRequest(
  token: string,
  data: Record<string, unknown>
): Promise<{ id: number; status: string }> {
  return jsonFetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
}

export async function fetchMyRequests(token: string): Promise<CommunityRequest[]> {
  return jsonFetch(`${API_BASE}/requests/my`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function cancelRequest(token: string, id: number): Promise<void> {
  await jsonFetch(`${API_BASE}/requests/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function checkDuplicate(
  token: string,
  type: 'mosque' | 'imam',
  query: string
): Promise<{ matches: DuplicateMatch[] }> {
  const sp = new URLSearchParams({ type, q: query })
  return jsonFetch(`${API_BASE}/requests/check-duplicate?${sp}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// --- Admin ---

export async function fetchAdminRequests(
  token: string,
  params: { page?: number; per_page?: number; status?: string; type?: string } = {}
): Promise<PaginatedResponse<AdminCommunityRequest>> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.per_page) sp.set('per_page', String(params.per_page))
  if (params.status) sp.set('status', params.status)
  if (params.type) sp.set('type', params.type)
  return jsonFetch(`${API_BASE}/admin/requests?${sp}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function fetchAdminRequest(
  token: string,
  id: number
): Promise<AdminCommunityRequest> {
  return jsonFetch(`${API_BASE}/admin/requests/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function approveRequest(
  token: string,
  id: number,
  overrides?: Record<string, unknown>
): Promise<void> {
  await jsonFetch(`${API_BASE}/admin/requests/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(overrides || {}),
  })
}

export async function rejectRequest(
  token: string,
  id: number,
  reason?: string,
  adminNotes?: string
): Promise<void> {
  await jsonFetch(`${API_BASE}/admin/requests/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason, admin_notes: adminNotes }),
  })
}

export async function needsInfoRequest(
  token: string,
  id: number,
  adminNotes: string
): Promise<void> {
  await jsonFetch(`${API_BASE}/admin/requests/${id}/needs-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ admin_notes: adminNotes }),
  })
}

export async function updateTrustLevel(
  token: string,
  userId: number,
  trustLevel: string
): Promise<void> {
  await jsonFetch(`${API_BASE}/admin/users/${userId}/trust-level`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trust_level: trustLevel }),
  })
}
