import { useState, useRef, useCallback, useEffect } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js'
import { Download, Play, Pause, Upload, Loader2, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExtractAudio, useTrimAndUpload } from '@/hooks/use-admin'
import { getTempAudioUrl } from '@/lib/admin-api'
import { cn } from '@/lib/utils'

interface AudioPipelineProps {
  value?: string
  onChange: (url: string) => void
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function AudioPipeline({ value, onChange }: AudioPipelineProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [tempId, setTempId] = useState<string | null>(null)
  const [, setDurationMs] = useState(0)
  const [regionStart, setRegionStart] = useState(0)
  const [regionEnd, setRegionEnd] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [directUrl, setDirectUrl] = useState(value || '')

  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<RegionsPlugin | null>(null)

  const extractAudio = useExtractAudio()
  const trimUpload = useTrimAndUpload()

  // Clean up wavesurfer on unmount
  useEffect(() => {
    return () => {
      wavesurferRef.current?.destroy()
    }
  }, [])

  const handleExtract = useCallback(async () => {
    if (!videoUrl.trim()) return
    try {
      const result = await extractAudio.mutateAsync(videoUrl.trim())
      setTempId(result.temp_id)
      setDurationMs(result.duration_ms)
      setRegionStart(0)
      setRegionEnd(Math.min(result.duration_ms, 40000))

      // Initialize wavesurfer
      if (waveformRef.current) {
        wavesurferRef.current?.destroy()

        const regions = RegionsPlugin.create()
        regionsRef.current = regions

        const ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#0d4b33',
          progressColor: '#c4a052',
          cursorColor: '#c4a052',
          barWidth: 2,
          barRadius: 2,
          barGap: 1.5,
          height: 80,
          normalize: true,
          plugins: [regions],
        })

        const audioUrl = getTempAudioUrl(result.temp_id)
        // Pass auth token via XMLHttpRequest for the temp audio endpoint
        ws.load(audioUrl, undefined, undefined)

        ws.on('ready', () => {
          const dur = ws.getDuration()
          const endSec = Math.min(dur, 40)
          regions.addRegion({
            id: 'trim',
            start: 0,
            end: endSec,
            color: 'rgba(196, 160, 82, 0.15)',
            drag: true,
            resize: true,
          })
        })

        ws.on('play', () => setIsPlaying(true))
        ws.on('pause', () => setIsPlaying(false))

        regions.on('region-updated', (region) => {
          setRegionStart(Math.round(region.start * 1000))
          setRegionEnd(Math.round(region.end * 1000))
        })

        wavesurferRef.current = ws
      }
    } catch {
      // Error handled by mutation state
    }
  }, [videoUrl, extractAudio])

  const handlePlayPause = useCallback(() => {
    const ws = wavesurferRef.current
    if (!ws) return

    const regions = regionsRef.current?.getRegions()
    if (regions?.length) {
      const region = regions[0]
      if (isPlaying) {
        ws.pause()
      } else {
        region.play()
      }
    } else {
      ws.playPause()
    }
  }, [isPlaying])

  const handleTrimUpload = useCallback(async () => {
    if (!tempId) return
    try {
      const result = await trimUpload.mutateAsync({
        tempId,
        startMs: regionStart,
        endMs: regionEnd,
      })
      onChange(result.s3_url)
      setDirectUrl(result.s3_url)
      // Clean up waveform
      wavesurferRef.current?.destroy()
      wavesurferRef.current = null
      setTempId(null)
    } catch {
      // Error handled by mutation state
    }
  }, [tempId, regionStart, regionEnd, trimUpload, onChange])

  const handleDirectUrlChange = useCallback(
    (url: string) => {
      setDirectUrl(url)
      onChange(url)
    },
    [onChange]
  )

  return (
    <div className="space-y-4 rounded-xl border border-[#0d4b33]/[0.06] bg-[#faf9f6] p-4">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-[#c4a052]" />
        <h4 className="font-tajawal text-sm font-semibold text-[#0d4b33]">المقطع الصوتي</h4>
      </div>

      {/* URL extraction */}
      <div className="space-y-2">
        <label className="font-tajawal text-xs text-[#0d4b33]/50">
          رابط الفيديو (يوتيوب أو تويتر)
        </label>
        <div className="flex gap-2">
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 border-[#0d4b33]/10 font-tajawal text-sm placeholder:text-[#0d4b33]/25 focus-visible:ring-[#c4a052]/30"
            dir="ltr"
          />
          <Button
            type="button"
            onClick={handleExtract}
            disabled={extractAudio.isPending || !videoUrl.trim()}
            className="shrink-0 bg-[#0d4b33] font-tajawal text-sm hover:bg-[#0d4b33]/90"
          >
            {extractAudio.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            استخراج
          </Button>
        </div>
        {extractAudio.isError && (
          <p className="font-tajawal text-xs text-red-500">
            {extractAudio.error.message}
          </p>
        )}
      </div>

      {/* Waveform display */}
      {(tempId || extractAudio.isPending) && (
        <div className="space-y-3">
          <div
            ref={waveformRef}
            className={cn(
              'min-h-[80px] overflow-hidden rounded-lg border border-[#0d4b33]/[0.06] bg-white',
              extractAudio.isPending && 'flex items-center justify-center'
            )}
          >
            {extractAudio.isPending && (
              <div className="flex flex-col items-center gap-2 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-[#c4a052]" />
                <span className="font-tajawal text-xs text-[#0d4b33]/40">جاري استخراج الصوت...</span>
              </div>
            )}
          </div>

          {tempId && (
            <>
              {/* Region info */}
              <div className="flex items-center gap-4 font-tajawal text-xs text-[#0d4b33]/60">
                <span>البداية: <strong className="text-[#0d4b33]">{formatTime(regionStart)}</strong></span>
                <span>النهاية: <strong className="text-[#0d4b33]">{formatTime(regionEnd)}</strong></span>
                <span>المدة: <strong className="text-[#c4a052]">{formatTime(regionEnd - regionStart)}</strong></span>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  className="border-[#0d4b33]/10 font-tajawal text-sm"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'إيقاف' : 'معاينة المقطع'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleTrimUpload}
                  disabled={trimUpload.isPending}
                  className="bg-[#c4a052] font-tajawal text-sm text-[#0d4b33] hover:bg-[#c4a052]/90"
                >
                  {trimUpload.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  رفع إلى S3
                </Button>
              </div>

              {trimUpload.isError && (
                <p className="font-tajawal text-xs text-red-500">{trimUpload.error.message}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Direct URL input (fallback / result) */}
      <div className="space-y-2">
        <label className="font-tajawal text-xs text-[#0d4b33]/50">
          أو: رابط مباشر للملف الصوتي
        </label>
        <Input
          value={directUrl}
          onChange={(e) => handleDirectUrlChange(e.target.value)}
          placeholder="https://imams-riyadh-audio.s3..."
          className="border-[#0d4b33]/10 font-tajawal text-sm placeholder:text-[#0d4b33]/25 focus-visible:ring-[#c4a052]/30"
          dir="ltr"
        />
      </div>
    </div>
  )
}
