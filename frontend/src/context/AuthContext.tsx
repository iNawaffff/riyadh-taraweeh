import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User as FirebaseUser, ConfirmationResult } from 'firebase/auth'
import {
  onAuthStateChanged,
  signInWithGoogle as fbSignInGoogle,
  sendPhoneOtp,
  firebaseSignOut,
} from '@/lib/firebase'

import type { UserRole } from '@/types'

const PROFILE_CACHE_KEY = 'taraweeh_user_profile'

function getCachedProfile(): PublicUserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function setCachedProfile(profile: PublicUserProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY)
    }
  } catch { /* quota exceeded etc */ }
}

export interface PublicUserProfile {
  id: number
  username: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  role: UserRole
  favorites: number[]
  milestones_seen: string[]
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  user: PublicUserProfile | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  needsRegistration: boolean
  signInWithGoogle: () => Promise<void>
  signInWithPhone: (phone: string, recaptchaElementId: string) => Promise<ConfirmationResult>
  confirmOtp: (result: ConfirmationResult, code: string) => Promise<void>
  signOut: () => Promise<void>
  register: (username: string, displayName?: string, importFavorites?: number[]) => Promise<PublicUserProfile>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  // Hydrate from localStorage cache for instant UI
  const [user, setUser] = useState<PublicUserProfile | null>(() => getCachedProfile())
  const [token, setToken] = useState<string | null>(null)
  // If we have a cached profile, skip the loading state entirely
  const [isLoading, setIsLoading] = useState(() => !getCachedProfile())
  const [needsRegistration, setNeedsRegistration] = useState(false)

  const fetchProfile = useCallback(async (idToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (res.ok) {
        const profile: PublicUserProfile = await res.json()
        setUser(profile)
        setCachedProfile(profile)
        setNeedsRegistration(false)
        return profile
      }
      if (res.status === 404) {
        setNeedsRegistration(true)
        setUser(null)
        setCachedProfile(null)
      }
    } catch {
      // silently fail — keep cached profile if available
    }
    return null
  }, [])

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const idToken = await fbUser.getIdToken()
        setToken(idToken)
        await fetchProfile(idToken)
      } else {
        // Firebase says no user — clear everything including cache
        setToken(null)
        setUser(null)
        setCachedProfile(null)
        setNeedsRegistration(false)
      }
      setIsLoading(false)
    }).then(unsub => {
      unsubscribe = unsub
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [fetchProfile])

  // Refresh token periodically (every 50 min)
  useEffect(() => {
    if (!firebaseUser) return
    const interval = setInterval(async () => {
      const newToken = await firebaseUser.getIdToken(true)
      setToken(newToken)
    }, 50 * 60 * 1000)
    return () => clearInterval(interval)
  }, [firebaseUser])

  const signInWithGoogle = useCallback(async () => {
    await fbSignInGoogle()
  }, [])

  const signInWithPhone = useCallback(
    async (phone: string, recaptchaElementId: string) => {
      return sendPhoneOtp(phone, recaptchaElementId)
    },
    []
  )

  const confirmOtp = useCallback(
    async (result: ConfirmationResult, code: string) => {
      await result.confirm(code)
    },
    []
  )

  const signOut = useCallback(async () => {
    setUser(null)
    setToken(null)
    setCachedProfile(null)
    setNeedsRegistration(false)
    setIsLoading(false)
    try {
      await firebaseSignOut()
    } catch {
      // State is already cleared
    }
  }, [])

  const register = useCallback(
    async (username: string, displayName?: string, importFavorites?: number[]) => {
      if (!token) throw new Error('Not authenticated')
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          display_name: displayName,
          import_favorites: importFavorites,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Registration failed')
      }
      const profile = await fetchProfile(token)
      if (!profile) throw new Error('Failed to load profile')
      return profile
    },
    [token, fetchProfile]
  )

  const refreshProfile = useCallback(async () => {
    if (token) await fetchProfile(token)
  }, [token, fetchProfile])

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        needsRegistration,
        signInWithGoogle,
        signInWithPhone,
        confirmOtp,
        signOut,
        register,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
