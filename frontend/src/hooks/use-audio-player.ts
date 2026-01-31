import { useContext } from 'react'
import { AudioContext } from '@/context/AudioContext'

/**
 * Hook to access the audio player context
 */
export function useAudioPlayer() {
  const context = useContext(AudioContext)

  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioProvider')
  }

  return context
}
