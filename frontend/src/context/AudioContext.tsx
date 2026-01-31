import { createContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

interface TrackInfo {
  mosqueId: number
  mosqueName: string
  imamName: string
  audioSrc: string
}

interface AudioContextValue {
  currentTrack: TrackInfo | null
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  progress: number // 0-100
  duration: number // seconds
  currentTime: number // seconds
  play: (track: TrackInfo) => void
  pause: () => void
  resume: () => void
  stop: () => void
  seek: (percent: number) => void
}

export const AudioContext = createContext<AudioContextValue | null>(null)

interface AudioProviderProps {
  children: ReactNode
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)

  // Update progress during playback
  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime
      const total = audioRef.current.duration || 0
      setCurrentTime(current)
      setDuration(total)
      setProgress(total > 0 ? (current / total) * 100 : 0)
    }
    animationRef.current = requestAnimationFrame(updateProgress)
  }, [])

  const stopProgressTracking = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    stopProgressTracking()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setCurrentTrack(null)
    setIsPlaying(false)
    setIsLoading(false)
    setError(null)
    setProgress(0)
    setDuration(0)
    setCurrentTime(0)
  }, [stopProgressTracking])

  const pause = useCallback(() => {
    stopProgressTracking()
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
  }, [stopProgressTracking])

  const resume = useCallback(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true)
          animationRef.current = requestAnimationFrame(updateProgress)
        })
        .catch((err) => {
          console.error('Error resuming audio:', err)
          setError('خطأ في تشغيل الملف الصوتي')
        })
    }
  }, [currentTrack, updateProgress])

  const seek = useCallback((percent: number) => {
    if (audioRef.current && duration > 0) {
      const newTime = (percent / 100) * duration
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
      setProgress(percent)
    }
  }, [duration])

  const play = useCallback((track: TrackInfo) => {
    // If clicking the same mosque that's playing, toggle pause/play
    if (currentTrack?.mosqueId === track.mosqueId && audioRef.current) {
      if (isPlaying) {
        pause()
      } else {
        resume()
      }
      return
    }

    // Stop any currently playing audio
    stop()

    // Fix audio path if needed (handle S3 URLs vs local paths)
    let audioPath = track.audioSrc
    if (!audioPath.startsWith('/static/') && !audioPath.startsWith('http')) {
      audioPath = `/static/audio/${audioPath.split('/').pop()}`
    }

    // Create new audio element
    const audio = new Audio(audioPath)
    audioRef.current = audio

    setCurrentTrack({ ...track, audioSrc: audioPath })
    setIsLoading(true)
    setError(null)

    // Set up metadata loaded handler
    audio.onloadedmetadata = () => {
      setDuration(audio.duration)
    }

    // Play the audio
    audio.play()
      .then(() => {
        setIsLoading(false)
        setIsPlaying(true)
        animationRef.current = requestAnimationFrame(updateProgress)
      })
      .catch((err) => {
        console.error('Error playing audio:', err)
        setError('خطأ في تشغيل الملف الصوتي')
        setIsLoading(false)
        setCurrentTrack(null)
      })

    // Handle audio end
    audio.onended = () => {
      stopProgressTracking()
      setIsPlaying(false)
      setProgress(100)
    }

    // Handle audio error
    audio.onerror = () => {
      stopProgressTracking()
      setError('خطأ في تحميل الملف الصوتي')
      setIsPlaying(false)
      setIsLoading(false)
      setCurrentTrack(null)
    }
  }, [currentTrack, isPlaying, pause, resume, stop, updateProgress, stopProgressTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [stopProgressTracking])

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        error,
        progress,
        duration,
        currentTime,
        play,
        pause,
        resume,
        stop,
        seek,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}
