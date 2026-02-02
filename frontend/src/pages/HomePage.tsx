import { useState, useCallback, useEffect, useMemo } from 'react'
import { HeroBanner, SearchBar, AreaFilter, ProximityButton, LocationPermissionModal, FavoritesFilterButton } from '@/components/search'
import { MosqueGrid } from '@/components/mosque'
import { useDebounce, useSearchMosques, useAreas, useLocations, useNearbyMosques, useGeolocation, useFavorites } from '@/hooks'
import { formatArabicDate } from '@/lib/arabic-utils'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Info, Heart, AlertTriangle, MapPin, Map } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function HomePage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState('الكل')
  const [selectedLocation, setSelectedLocation] = useState('الكل')
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [isProximitySorted, setIsProximitySorted] = useState(false)
  const [proximitySuccess, setProximitySuccess] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const navigate = useNavigate()

  // Debounced search query
  const debouncedQuery = useDebounce(searchQuery, 500)

  // Geolocation
  const {
    position,
    error: geoError,
    isLoading: isGeoLoading,
    isSupported: isGeoSupported,
    hasPermissionRequested,
    requestPosition,
    clearPosition,
  } = useGeolocation()

  // Favorites
  const { favoritesCount, isFavorite } = useFavorites()

  // Data fetching
  const { data: areas = [], isLoading: isAreasLoading } = useAreas()
  const { data: locations = [] } = useLocations(selectedArea !== 'الكل' ? selectedArea : undefined)

  const searchParams = useMemo(() => ({
    q: debouncedQuery,
    area: selectedArea,
    location: selectedLocation,
  }), [debouncedQuery, selectedArea, selectedLocation])

  const nearbyParams = useMemo(() =>
    position ? { lat: position.latitude, lng: position.longitude } : null
  , [position])

  const {
    data: searchResults,
    isLoading: isSearchLoading,
    isError: isSearchError,
  } = useSearchMosques(searchParams, !isProximitySorted)

  const {
    data: nearbyResults,
    isLoading: isNearbyLoading,
    isError: isNearbyError,
  } = useNearbyMosques(nearbyParams)

  // Determine which results to show
  const baseMosques = isProximitySorted && nearbyResults ? nearbyResults : searchResults ?? []
  // Filter by favorites if enabled
  const mosques = showFavoritesOnly
    ? baseMosques.filter((mosque) => isFavorite(mosque.id))
    : baseMosques
  const isLoading = isProximitySorted ? isNearbyLoading || isGeoLoading : isSearchLoading
  const isError = isProximitySorted ? isNearbyError : isSearchError

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setIsProximitySorted(false)
    clearPosition()
    setProximitySuccess(false)
    setShowFavoritesOnly(false)
  }, [clearPosition])

  const handleAreaChange = useCallback((value: string) => {
    setSelectedArea(value)
    setSelectedLocation('الكل')
    setIsProximitySorted(false)
    clearPosition()
    setProximitySuccess(false)
    setShowFavoritesOnly(false)
  }, [clearPosition])

  const handleLocationChange = useCallback((value: string) => {
    setSelectedLocation(value)
    setIsProximitySorted(false)
    clearPosition()
    setProximitySuccess(false)
    setShowFavoritesOnly(false)
  }, [clearPosition])

  const handleReset = useCallback(() => {
    setSearchQuery('')
    setSelectedArea('الكل')
    setSelectedLocation('الكل')
    setIsProximitySorted(false)
    clearPosition()
    setProximitySuccess(false)
    setShowFavoritesOnly(false)
  }, [clearPosition])

  const handleFavoritesToggle = useCallback(() => {
    setShowFavoritesOnly((prev) => !prev)
  }, [])

  const handleProximityClick = useCallback(() => {
    if (!isGeoSupported) return

    if (!hasPermissionRequested) {
      setShowPermissionModal(true)
      return
    }

    requestPosition()
    setIsProximitySorted(true)
  }, [isGeoSupported, hasPermissionRequested, requestPosition])

  const handlePermissionAllow = useCallback(() => {
    setShowPermissionModal(false)
    requestPosition()
    setIsProximitySorted(true)
  }, [requestPosition])

  const handlePermissionDeny = useCallback(() => {
    setShowPermissionModal(false)
  }, [])

  // Reset proximity state when geolocation fails
  useEffect(() => {
    if (geoError) {
      setIsProximitySorted(false)
      setProximitySuccess(false)
    }
  }, [geoError])

  // Show success state briefly when proximity results arrive
  useEffect(() => {
    if (nearbyResults && nearbyResults.length > 0 && isProximitySorted) {
      setProximitySuccess(true)
      const timer = setTimeout(() => setProximitySuccess(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [nearbyResults, isProximitySorted])

  // Calculate results count
  const resultsCount = mosques.length
  const hasActiveFilters = searchQuery || selectedArea !== 'الكل' || selectedLocation !== 'الكل' || showFavoritesOnly

  return (
    <>
      <HeroBanner />

      <div className="container relative z-10 -mt-5 mb-8">
        {/* Search Section */}
        <section className="rounded-2xl bg-white p-5 shadow-card md:p-6">
          {/* Search + Area Filter */}
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                isSearching={isSearchLoading}
              />
            </div>
            <div className="md:w-56">
              <AreaFilter
                value={selectedArea}
                onChange={handleAreaChange}
                areas={areas}
                isLoading={isAreasLoading}
              />
            </div>
            <div className="md:w-56">
              <Select value={selectedLocation} onValueChange={handleLocationChange}>
                <SelectTrigger className="h-11 w-full gap-1.5 bg-white text-sm">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="الأحياء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الكل">الأحياء</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Separator */}
          <div className="my-4 border-t border-border/30" />

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <ProximityButton
              onClick={handleProximityClick}
              isLoading={isGeoLoading}
              isActive={isProximitySorted}
              isSuccess={proximitySuccess}
              disabled={!isGeoSupported}
            />
            <FavoritesFilterButton
              onClick={handleFavoritesToggle}
              isActive={showFavoritesOnly}
              count={favoritesCount}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/map')}
              className="h-10 gap-1.5 rounded-full border-border/60 px-4 text-sm font-medium"
            >
              <Map className="h-4 w-4" />
              خريطة
            </Button>
          </div>
        </section>

        {/* Search Results Info */}
        {(hasActiveFilters || isProximitySorted) && !isLoading && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>تم العثور على {resultsCount} مسجد</p>

            {(hasActiveFilters || isProximitySorted) && (
              <button
                onClick={handleReset}
                className="rounded-full px-3 py-1 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary-light active:scale-95"
              >
                مسح البحث ✕
              </button>
            )}
          </div>
        )}

        {/* Proximity Sorting Info */}
        {isProximitySorted && !isLoading && mosques.length > 0 && (
          <div className={cn(
            'mt-2 flex items-center gap-2 text-sm text-muted-foreground',
            'rounded-lg bg-primary-light/50 px-3 py-2'
          )}>
            <Info className="h-4 w-4 text-primary" />
            <span>تم ترتيب المساجد حسب الأقرب إليك</span>
          </div>
        )}

        {/* Favorites Filter Info */}
        {showFavoritesOnly && !isLoading && (
          <div className={cn(
            'mt-2 flex items-center gap-2 text-sm text-muted-foreground',
            'rounded-lg bg-accent-light/50 px-3 py-2'
          )}>
            <Heart className="h-4 w-4 fill-accent text-accent" />
            <span>عرض المساجد المفضلة فقط ({mosques.length})</span>
          </div>
        )}

        {/* Geolocation Error */}
        {geoError && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {geoError.message}
            <button
              onClick={handleProximityClick}
              className="me-2 underline hover:no-underline"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>

      {/* Mosques Grid */}
      <div className="container mb-12">
        <MosqueGrid
          mosques={mosques}
          isLoading={isLoading}
          isError={isError}
          isEmpty={mosques.length === 0 && !isLoading}
          onReset={handleReset}
          isProximitySorted={isProximitySorted}
        />

        {/* Last Update Info */}
        {!isLoading && mosques.length > 0 && (
          <div className="mt-8 border-t border-dashed border-border pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              آخر تحديث: <span id="mainPageLastUpdate">{formatArabicDate()}</span>
            </p>
          </div>
        )}

        {/* Disclaimer */}
        {!isLoading && mosques.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              هذا الموقع جهد شخصي غير رسمي، وفي حال وجود أي تحديثات أو ملاحظات نسعد بتواصلكم معنا{' '}
              <Link to="/contact" className="font-medium underline hover:no-underline">تواصل معنا</Link>
            </span>
          </div>
        )}
      </div>

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showPermissionModal}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />
    </>
  )
}
