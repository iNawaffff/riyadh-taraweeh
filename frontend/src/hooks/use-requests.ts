import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import {
  submitRequest,
  fetchMyRequests,
  cancelRequest,
  checkDuplicate,
  fetchAdminRequests,
  fetchAdminRequest,
  approveRequest,
  rejectRequest,
  needsInfoRequest,
  updateTrustLevel,
} from '@/lib/requests-api'

// --- Public hooks ---

export function useSubmitRequest() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => submitRequest(token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-requests'] })
    },
  })
}

export function useMyRequests() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['my-requests'],
    queryFn: () => fetchMyRequests(token!),
    enabled: !!token,
  })
}

export function useCancelRequest() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cancelRequest(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-requests'] })
    },
  })
}

export function useCheckDuplicate(type: 'mosque' | 'imam', query: string) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['check-duplicate', type, query],
    queryFn: () => checkDuplicate(token!, type, query),
    enabled: !!token && query.length >= 3,
    staleTime: 30_000,
  })
}

// --- Admin hooks ---

export function useAdminRequests(params: { page?: number; status?: string; type?: string } = {}) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'requests', params],
    queryFn: () => fetchAdminRequests(token!, params),
    enabled: !!token,
  })
}

export function useAdminRequest(id: number | undefined) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'requests', id],
    queryFn: () => fetchAdminRequest(token!, id!),
    enabled: !!token && !!id,
  })
}

export function useApproveRequest() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, overrides }: { id: number; overrides?: Record<string, unknown> }) =>
      approveRequest(token!, id, overrides),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'requests'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useRejectRequest() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, adminNotes }: { id: number; reason?: string; adminNotes?: string }) =>
      rejectRequest(token!, id, reason, adminNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'requests'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useNeedsInfoRequest() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, adminNotes }: { id: number; adminNotes: string }) =>
      needsInfoRequest(token!, id, adminNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'requests'] })
    },
  })
}

export function useUpdateTrustLevel() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, trustLevel }: { userId: number; trustLevel: string }) =>
      updateTrustLevel(token!, userId, trustLevel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
