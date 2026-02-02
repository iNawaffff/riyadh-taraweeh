import { useState, useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { Navigation, ExternalLink, X } from 'lucide-react'
import { AudioButton } from '@/components/audio'
import { Button } from '@/components/ui/button'
import type { Mosque, GeolocationPosition } from '@/types'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const RIYADH_CENTER = { lat: 24.7136, lng: 46.6753 }

interface MosqueMapProps {
  mosques: Mosque[]
  userPosition?: GeolocationPosition | null
  onLocateMe?: () => void
  isLocating?: boolean
}

function MosqueMarkers({ mosques, userPosition }: { mosques: Mosque[]; userPosition?: GeolocationPosition | null }) {
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null)

  return (
    <>
      {/* User location marker */}
      {userPosition && (
        <AdvancedMarker
          position={{ lat: userPosition.latitude, lng: userPosition.longitude }}
          zIndex={1000}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute h-8 w-8 animate-ping rounded-full bg-blue-400/30" />
            <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
          </div>
        </AdvancedMarker>
      )}

      {/* Mosque markers */}
      {mosques.map(mosque => {
        if (!mosque.latitude || !mosque.longitude) return null
        return (
          <AdvancedMarker
            key={mosque.id}
            position={{ lat: mosque.latitude, lng: mosque.longitude }}
            onClick={() => setSelectedMosque(mosque)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 1.74.5 3.37 1.41 4.84.95 1.54 2.2 2.86 3.16 4.4.47.75.81 1.45 1.17 2.26.26.55.47 1.5 1.26 1.5s1-.95 1.26-1.5c.37-.81.7-1.51 1.17-2.26.96-1.53 2.21-2.86 3.16-4.4C18.5 12.37 19 10.74 19 9c0-3.87-3.13-7-7-7zm0 9.75a2.75 2.75 0 110-5.5 2.75 2.75 0 010 5.5z" />
              </svg>
            </div>
          </AdvancedMarker>
        )
      })}

      {/* Info window */}
      {selectedMosque && selectedMosque.latitude && selectedMosque.longitude && (
        <InfoWindow
          position={{ lat: selectedMosque.latitude, lng: selectedMosque.longitude }}
          onCloseClick={() => setSelectedMosque(null)}
          pixelOffset={[0, -45]}
        >
          <div className="min-w-[220px] max-w-[280px] p-1 font-[Tajawal]" dir="rtl">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-tight text-gray-900">{selectedMosque.name}</h3>
              <button
                onClick={() => setSelectedMosque(null)}
                className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {selectedMosque.imam && (
              <p className="mb-1 text-xs text-gray-600">
                <span className="font-medium">الإمام:</span> {selectedMosque.imam}
              </p>
            )}

            <p className="mb-2 text-xs text-gray-500">
              {selectedMosque.location} · {selectedMosque.area}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {selectedMosque.audio_sample && selectedMosque.imam && (
                <AudioButton
                  mosqueId={selectedMosque.id}
                  mosqueName={selectedMosque.name}
                  imamName={selectedMosque.imam}
                  audioSrc={selectedMosque.audio_sample}
                  className="h-7 px-2 text-xs"
                />
              )}

              {selectedMosque.map_link && (
                <a
                  href={selectedMosque.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center gap-1 rounded-full bg-gray-100 px-2.5 text-xs text-gray-700 transition-colors hover:bg-gray-200"
                >
                  <ExternalLink className="h-3 w-3" />
                  قوقل ماب
                </a>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}

function MapController({ userPosition }: { userPosition?: GeolocationPosition | null }) {
  const map = useMap()

  useEffect(() => {
    if (map && userPosition) {
      map.panTo({ lat: userPosition.latitude, lng: userPosition.longitude })
      map.setZoom(13)
    }
  }, [map, userPosition])

  return null
}

export function MosqueMap({ mosques, userPosition, onLocateMe, isLocating }: MosqueMapProps) {
  const center = userPosition
    ? { lat: userPosition.latitude, lng: userPosition.longitude }
    : RIYADH_CENTER

  const zoom = userPosition ? 13 : 11

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="relative h-full w-full">
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId="mosque-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
        >
          <MosqueMarkers mosques={mosques} userPosition={userPosition} />
          <MapController userPosition={userPosition} />
        </Map>
        <Button
          onClick={onLocateMe}
          disabled={isLocating}
          size="sm"
          variant="secondary"
          className="absolute top-4 start-4 z-10 gap-1.5 rounded-full bg-white px-4 shadow-lg hover:bg-gray-50"
        >
          <Navigation className={`h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
          حدد موقعي
        </Button>
      </div>
    </APIProvider>
  )
}
