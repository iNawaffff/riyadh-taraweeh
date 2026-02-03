import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { searchImams, submitTransfer, cancelTransfer, fetchUserTransfers, fetchLeaderboard } from '@/lib/api'
import { useAuth } from './use-auth'

export function useImamSearch(query: string) {
  return useQuery({
    queryKey: ['imams', 'search', query],
    queryFn: () => searchImams(query),
    enabled: query.length >= 1,
    staleTime: 30 * 1000,
  })
}

export function useSubmitTransfer() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { mosque_id: number; new_imam_id?: number; new_imam_name?: string; notes?: string }) =>
      submitTransfer(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'transfers'] })
    },
  })
}

export function useCancelTransfer() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (transferId: number) => cancelTransfer(token!, transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'transfers'] })
    },
  })
}

export function useUserTransfers() {
  const { token, isAuthenticated, user } = useAuth()
  return useQuery({
    // Include user ID in query key so cache is per-user
    queryKey: ['user', 'transfers', user?.id],
    queryFn: () => fetchUserTransfers(token!),
    enabled: isAuthenticated && !!token && !!user,
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    staleTime: 5 * 60 * 1000,
  })
}
