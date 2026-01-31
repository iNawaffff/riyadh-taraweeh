import { useQuery } from '@tanstack/react-query'
import { fetchMosques, searchMosques, fetchNearbyMosques, fetchAreas } from '@/lib/api'
import type { SearchParams, NearbyParams, Mosque } from '@/types'

/**
 * Hook to fetch all mosques
 */
export function useMosques() {
  return useQuery({
    queryKey: ['mosques'],
    queryFn: fetchMosques,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to search mosques with query and area filter
 */
export function useSearchMosques(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: ['mosques', 'search', params],
    queryFn: () => searchMosques(params),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch mosques sorted by proximity
 */
export function useNearbyMosques(params: NearbyParams | null) {
  return useQuery({
    queryKey: ['mosques', 'nearby', params],
    queryFn: () => fetchNearbyMosques(params!),
    enabled: params !== null,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch unique areas for filtering
 */
export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: fetchAreas,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to get a single mosque by ID from the cache
 */
export function useMosque(id: number) {
  return useQuery({
    queryKey: ['mosque', id],
    queryFn: async (): Promise<Mosque | undefined> => {
      const mosques = await fetchMosques()
      return mosques.find(m => m.id === id)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
