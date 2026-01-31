import { createContext, useCallback, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { AuthContext } from '@/context/AuthContext'
import { authFetch } from '@/lib/api'
import { toast } from 'sonner'

const EMPTY_FAVORITES: number[] = []

interface FavoritesContextValue {
  favorites: number[]
  isFavorite: (mosqueId: number) => boolean
  toggleFavorite: (mosqueId: number) => void
  addFavorite: (mosqueId: number) => void
  removeFavorite: (mosqueId: number) => void
  favoritesCount: number
  /** True when the user must sign in to use favorites */
  requiresAuth: boolean
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null)

interface FavoritesProviderProps {
  children: ReactNode
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const authCtx = useContext(AuthContext)
  const isAuthenticated = authCtx?.isAuthenticated ?? false
  const token = authCtx?.token ?? null
  const serverFavorites = authCtx?.user?.favorites ?? EMPTY_FAVORITES

  // Local optimistic state — syncs from server
  const [optimistic, setOptimistic] = useState<number[]>(serverFavorites)
  const prevServerRef = useRef(serverFavorites)

  useEffect(() => {
    // Only update if the server array actually changed (by value)
    if (
      serverFavorites.length !== prevServerRef.current.length ||
      serverFavorites.some((id, i) => id !== prevServerRef.current[i])
    ) {
      prevServerRef.current = serverFavorites
      setOptimistic(serverFavorites)
    }
  }, [serverFavorites])

  // Handle pending favorite from pre-login intent
  useEffect(() => {
    if (!isAuthenticated || !token) return
    const pendingId = localStorage.getItem('pendingFavorite')
    if (pendingId) {
      localStorage.removeItem('pendingFavorite')
      const mosqueId = Number(pendingId)
      if (mosqueId && !optimistic.includes(mosqueId)) {
        setOptimistic(f => [...f, mosqueId])
        fetch(`/api/user/favorites/${mosqueId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).then(() => authCtx?.refreshProfile()).catch(() => {})
      }
    }
  }, [isAuthenticated, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const favorites = isAuthenticated ? optimistic : []

  const apiCall = useCallback(
    async (url: string, method: string, rollback: number[]) => {
      if (!token) return
      try {
        const res = await authFetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        authCtx?.refreshProfile()
      } catch {
        setOptimistic(rollback)
        toast.error('حدث خطأ، حاول مرة أخرى')
      }
    },
    [token, authCtx]
  )

  const isFavorite = useCallback(
    (mosqueId: number) => favorites.includes(mosqueId),
    [favorites]
  )

  const addFavorite = useCallback(
    (mosqueId: number) => {
      if (!isAuthenticated) return
      const prev = optimistic
      setOptimistic(f => [...f, mosqueId])
      apiCall(`/api/user/favorites/${mosqueId}`, 'POST', prev)
    },
    [isAuthenticated, optimistic, apiCall]
  )

  const removeFavorite = useCallback(
    (mosqueId: number) => {
      if (!isAuthenticated) return
      const prev = optimistic
      setOptimistic(f => f.filter(id => id !== mosqueId))
      apiCall(`/api/user/favorites/${mosqueId}`, 'DELETE', prev)
    },
    [isAuthenticated, optimistic, apiCall]
  )

  const toggleFavorite = useCallback(
    (mosqueId: number) => {
      if (isFavorite(mosqueId)) {
        removeFavorite(mosqueId)
      } else {
        addFavorite(mosqueId)
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  )

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        favoritesCount: favorites.length,
        requiresAuth: !isAuthenticated,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}
