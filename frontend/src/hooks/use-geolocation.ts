import { useState, useCallback } from 'react'
import type { GeolocationPosition, GeolocationError } from '@/types'

interface UseGeolocationReturn {
  position: GeolocationPosition | null
  error: GeolocationError | null
  isLoading: boolean
  isSupported: boolean
  hasPermissionRequested: boolean
  requestPosition: () => void
  clearPosition: () => void
}

const PERMISSION_STORAGE_KEY = 'proximityPermissionRequested'

/**
 * Hook for handling geolocation with permission management
 */
export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<GeolocationError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const hasPermissionRequested = typeof localStorage !== 'undefined' &&
    localStorage.getItem(PERMISSION_STORAGE_KEY) === 'true'

  const requestPosition = useCallback(() => {
    if (!isSupported) {
      setError({
        code: 0,
        message: 'خدمة تحديد الموقع غير متوفرة في متصفحك',
      })
      return
    }

    setIsLoading(true)
    setError(null)

    // Mark that permission has been requested
    localStorage.setItem(PERMISSION_STORAGE_KEY, 'true')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        setIsLoading(false)
      },
      (err) => {
        let message = 'تعذر تحديد موقعك. '

        switch (err.code) {
          case err.PERMISSION_DENIED:
            message += 'يرجى السماح للموقع باستخدام موقعك.'
            break
          case err.POSITION_UNAVAILABLE:
            message += 'معلومات الموقع غير متوفرة.'
            break
          case err.TIMEOUT:
            message += 'انتهت مهلة طلب الموقع.'
            break
          default:
            message += 'حدث خطأ غير معروف.'
        }

        setError({
          code: err.code,
          message,
        })
        setIsLoading(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000,
      }
    )
  }, [isSupported])

  const clearPosition = useCallback(() => {
    setPosition(null)
    setError(null)
  }, [])

  return {
    position,
    error,
    isLoading,
    isSupported,
    hasPermissionRequested,
    requestPosition,
    clearPosition,
  }
}
