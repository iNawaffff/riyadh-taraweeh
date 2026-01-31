import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import {
  auth,
  signInWithGoogle as fbSignInGoogle,
  sendPhoneOtp,
  firebaseSignOut,
} from '@/lib/firebase'
import type { ConfirmationResult } from 'firebase/auth'

export interface PublicUserProfile {
  id: number
  username: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  favorites: number[]
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
  const [user, setUser] = useState<PublicUserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsRegistration, setNeedsRegistration] = useState(false)

  const fetchProfile = useCallback(async (idToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (res.ok) {
        const profile: PublicUserProfile = await res.json()
        setUser(profile)
        setNeedsRegistration(false)
        return profile
      }
      if (res.status === 404) {
        setNeedsRegistration(true)
        setUser(null)
      }
    } catch {
      // silently fail
    }
    return null
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const idToken = await fbUser.getIdToken()
        setToken(idToken)
        await fetchProfile(idToken)
      } else {
        setToken(null)
        setUser(null)
        setNeedsRegistration(false)
      }
      setIsLoading(false)
    })
    return unsubscribe
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
    // Clear state immediately so UI doesn't wait for Firebase callback
    setUser(null)
    setToken(null)
    setNeedsRegistration(false)
    setIsLoading(false)
    try {
      await firebaseSignOut()
    } catch {
      // State is already cleared — safe to ignore
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
      // Refresh profile after registration
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
