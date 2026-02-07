import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import {
  fetchAdminStats,
  fetchAdminMosque,
  fetchAdminMosques,
  createAdminMosque,
  updateAdminMosque,
  deleteAdminMosque,
  fetchAdminImam,
  fetchAdminImams,
  createAdminImam,
  updateAdminImam,
  deleteAdminImam,
  fetchAdminTransfers,
  approveTransfer,
  rejectTransfer,
  fetchAdminUsers,
  updateUserRole,
  extractAudio,
  uploadAudioFile,
  trimAndUploadAudio,
} from '@/lib/admin-api'
import type { UserRole } from '@/types'

// Stats
export function useAdminStats() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => fetchAdminStats(token!),
    enabled: !!token,
  })
}

// Mosques
export function useAdminMosque(id: number | undefined) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'mosques', id],
    queryFn: () => fetchAdminMosque(token!, id!),
    enabled: !!token && !!id,
  })
}

export function useAdminMosques(params: { page?: number; search?: string; area?: string } = {}) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'mosques', params],
    queryFn: () => fetchAdminMosques(token!, params),
    enabled: !!token,
  })
}

export function useCreateMosque() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createAdminMosque(token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'mosques'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useUpdateMosque() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateAdminMosque(token!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'mosques'] })
    },
  })
}

export function useDeleteMosque() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAdminMosque(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'mosques'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// Imams
export function useAdminImam(id: number | undefined) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'imams', id],
    queryFn: () => fetchAdminImam(token!, id!),
    enabled: !!token && !!id,
  })
}

export function useAdminImams(params: { page?: number; search?: string } = {}) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'imams', params],
    queryFn: () => fetchAdminImams(token!, params),
    enabled: !!token,
  })
}

export function useCreateImam() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createAdminImam(token!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'imams'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useUpdateImam() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateAdminImam(token!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'imams'] })
    },
  })
}

export function useDeleteImam() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAdminImam(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'imams'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// Transfers
export function useAdminTransfers(params: { page?: number; status?: string } = {}) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'transfers', params],
    queryFn: () => fetchAdminTransfers(token!, params),
    enabled: !!token,
  })
}

export function useApproveTransfer() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => approveTransfer(token!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'transfers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useRejectTransfer() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      rejectTransfer(token!, id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'transfers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// Users
export function useAdminUsers(params: { page?: number; search?: string } = {}) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => fetchAdminUsers(token!, params),
    enabled: !!token,
  })
}

export function useUpdateUserRole() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      updateUserRole(token!, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

// Audio
export function useExtractAudio() {
  const { token } = useAuth()
  return useMutation({
    mutationFn: (url: string) => extractAudio(token!, url),
  })
}

export function useUploadAudioFile() {
  const { token } = useAuth()
  return useMutation({
    mutationFn: (file: File) => uploadAudioFile(token!, file),
  })
}

export function useTrimAndUpload() {
  const { token } = useAuth()
  return useMutation({
    mutationFn: ({ tempId, startMs, endMs, filename }: { tempId: string; startMs: number; endMs: number; filename?: string }) =>
      trimAndUploadAudio(token!, tempId, startMs, endMs, filename),
  })
}
