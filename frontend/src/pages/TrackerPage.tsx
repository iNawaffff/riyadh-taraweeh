import { useState, useCallback, useRef, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Check, Share2, Flame, LogIn, Trophy, Star, X, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { LoginDialog } from '@/components/auth'
import { useAuth } from '@/hooks/use-auth'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useMosques } from '@/hooks/use-mosques'
import { useFavorites } from '@/hooks/use-favorites'
import { fetchTracker, toggleNight, removeNight } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { toArabicNum, formatArabicCount, arabicNouns, getRamadanInfo } from '@/lib/arabic-utils'
import type { TrackerData, TrackerNight, Mosque } from '@/types'

const RAKAAT_OPTIONS = [2, 4, 6, 8, 10, 11] as const

// --- Arabic grammar helpers ---

function streakLabel(n: number): string {
  if (n === 0) return ''
  if (n === 1) return 'ليلة واحدة'
  if (n === 2) return 'ليلتين'
  if (n >= 3 && n <= 10) return `${toArabicNum(n)} ليالٍ`
  return `${toArabicNum(n)} ليلة` // 11+
}

function rakaatLabel(n: number): string {
  if (n === 1) return 'ركعة'
  if (n === 2) return 'ركعتين'
  if (n >= 3 && n <= 10) return 'ركعات'
  return 'ركعة' // 11+ singular tamyiz
}

function getNightHijri(night: number) {
  return `${toArabicNum(night)} رمضان`
}

// --- SVG Progress Ring ---

function ProgressRing({ attended, total = 30 }: { attended: number; total?: number }) {
  const size = 120
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(attended / total, 1)
  const offset = circumference * (1 - progress)

  return (
    <div className="relative mx-auto sm:mx-0 shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            '--ring-circumference': circumference,
            '--ring-offset': offset,
            animation: 'ringFill 0.8s ease-out forwards',
          } as React.CSSProperties}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-primary">
          {toArabicNum(attended)}
        </span>
        <span className="text-xs text-muted-foreground">من {toArabicNum(total)}</span>
      </div>
    </div>
  )
}

// --- Mosque Picker (Command combobox inside Drawer/Dialog) ---

function MosquePicker({
  open,
  onOpenChange,
  onSelect,
  mosques,
  favoriteMosqueIds,
  isDesktop,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (mosque: Mosque) => void
  mosques: Mosque[]
  favoriteMosqueIds: number[]
  isDesktop: boolean
}) {
  const favMosques = useMemo(
    () => mosques.filter(m => favoriteMosqueIds.includes(m.id)),
    [mosques, favoriteMosqueIds],
  )

  const handleSelect = (mosque: Mosque) => {
    onSelect(mosque)
    onOpenChange(false)
  }

  const content = (
    <Command className="rounded-lg" dir="rtl">
      <CommandInput placeholder="ابحث عن مسجد..." />
      <CommandList className="max-h-[50vh]">
        <CommandEmpty>لا توجد نتائج</CommandEmpty>
        {favMosques.length > 0 && (
          <>
            <CommandGroup heading="المفضلة">
              {favMosques.map(m => (
                <CommandItem
                  key={`fav-${m.id}`}
                  value={`${m.name} ${m.location}`}
                  onSelect={() => handleSelect(m)}
                  className="gap-2 py-2.5"
                >
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.name}</div>
                    <div className="truncate text-xs text-muted-foreground">حي {m.location}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="جميع المساجد">
          {mosques.map(m => (
            <CommandItem
              key={m.id}
              value={`${m.name} ${m.location}`}
              onSelect={() => handleSelect(m)}
              className="gap-2 py-2.5"
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="truncate text-xs text-muted-foreground">حي {m.location}</div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>اختر مسجد</DialogTitle>
            <DialogDescription>ابحث واختر المسجد الذي صليت فيه</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>اختر مسجد</DrawerTitle>
          <DrawerDescription>ابحث واختر المسجد الذي صليت فيه</DrawerDescription>
        </DrawerHeader>
        {content}
        <div className="h-2" />
      </DrawerContent>
    </Drawer>
  )
}

// --- Night Detail View (for viewing attended night info) ---

function NightDetail({
  nightData,
  mosque,
  onEdit,
  onRemove,
}: {
  nightData: TrackerNight
  mosque: Mosque | null
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {/* Info rows */}
      <div className="space-y-2">
        {/* Mosque */}
        {mosque ? (
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-foreground">{mosque.name}</div>
              <div className="truncate text-xs text-muted-foreground">حي {mosque.location}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
            <MapPin className="h-5 w-5 text-muted-foreground/50 shrink-0" />
            <span className="text-sm text-muted-foreground">لم يُحدد مسجد</span>
          </div>
        )}

        {/* Rakaat */}
        {nightData.rakaat ? (
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3">
            <Star className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">
              {toArabicNum(nightData.rakaat)} {rakaatLabel(nightData.rakaat)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
            <Star className="h-5 w-5 text-muted-foreground/50 shrink-0" />
            <span className="text-sm text-muted-foreground">لم يُحدد عدد الركعات</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="h-12 w-full gap-2 rounded-xl text-base font-semibold"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
          تعديل الحضور
        </Button>
        <button
          onClick={onRemove}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          حذف الحضور
        </button>
      </div>
    </div>
  )
}

// --- Rakaat picker content (shared between Dialog and Drawer) ---

function RakaatPicker({
  onSelect,
  onSkip,
  selectedMosque,
  onChangeMosque,
  onClearMosque,
  currentRakaat,
}: {
  onSelect: (rakaat: number) => void
  onSkip: () => void
  selectedMosque: Mosque | null
  onChangeMosque: () => void
  onClearMosque: () => void
  currentRakaat?: number | null
}) {
  return (
    <>
      {/* Sticky mosque chip */}
      {selectedMosque ? (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {selectedMosque.name}
          </span>
          <button
            onClick={onClearMosque}
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onChangeMosque}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            تغيير
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 px-4 pt-2 pb-1">
        {RAKAAT_OPTIONS.map((r) => {
          const isCurrent = currentRakaat === r
          return (
            <button
              key={r}
              onClick={() => onSelect(r)}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 py-3 transition-all duration-150',
                isCurrent
                  ? 'border-primary bg-primary/15 ring-2 ring-primary/20'
                  : 'border-border/60 bg-white hover:border-primary hover:bg-primary/10',
                'active:scale-95',
              )}
            >
              <span className="text-2xl font-bold text-primary tabular-nums">{toArabicNum(r)}</span>
              <span className="text-xs text-muted-foreground">{rakaatLabel(r)}</span>
            </button>
          )
        })}
      </div>

      {/* Add mosque link (only when no mosque selected) */}
      {!selectedMosque && (
        <button
          onClick={onChangeMosque}
          className="mx-auto mt-1 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <MapPin className="h-3.5 w-3.5" />
          أضف مسجد (اختياري)
        </button>
      )}

      <button
        onClick={onSkip}
        className="mt-1 mb-3 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {currentRakaat != null ? 'بدون تغيير الركعات' : 'تخطي'}
      </button>
    </>
  )
}

// --- Skeleton ---

function TrackerSkeleton() {
  return (
    <div className="container py-6">
      {/* Stats skeleton */}
      <div className="mb-6 rounded-xl bg-white p-5 shadow-card">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Skeleton className="h-[120px] w-[120px] rounded-full shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:gap-3">
        {Array.from({ length: 30 }, (_, i) => (
          <Skeleton key={i} className="min-h-[64px] rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// --- Main Page ---

export function TrackerPage() {
  const { isAuthenticated, isLoading: authLoading, token, user } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [pendingNight, setPendingNight] = useState<number | null>(null)
  const pendingNightRef = useRef<number | null>(null)
  const [poppedCell, setPoppedCell] = useState<number | null>(null)
  const [mosquePickerOpen, setMosquePickerOpen] = useState(false)
  const [selectedMosqueId, setSelectedMosqueId] = useState<number | null>(null)
  const [hasInitializedMosque, setHasInitializedMosque] = useState(false)
  const [viewingNight, setViewingNight] = useState<number | null>(null)
  // Track the rakaat value of the night being edited (null when adding new)
  const editingRakaatRef = useRef<number | null>(null)
  const queryClient = useQueryClient()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const { data: tracker, isLoading } = useQuery<TrackerData>({
    queryKey: ['tracker'],
    queryFn: () => fetchTracker(token!),
    enabled: isAuthenticated && !!token,
  })

  // Fetch all mosques for the picker
  const { data: allMosques = [] } = useMosques()
  const { favorites: favoriteMosqueIds } = useFavorites()

  // Derive last-used mosque from tracker nights (most recent night with mosque_id)
  const lastMosqueId = useMemo(() => {
    if (!tracker?.nights.length) return null
    const sorted = [...tracker.nights]
      .filter(n => n.mosque_id !== null)
      .sort((a, b) => new Date(b.attended_at).getTime() - new Date(a.attended_at).getTime())
    return sorted[0]?.mosque_id ?? null
  }, [tracker?.nights])

  // Initialize selectedMosqueId from last-used (once)
  if (!hasInitializedMosque && tracker) {
    setHasInitializedMosque(true)
    if (lastMosqueId !== null) {
      setSelectedMosqueId(lastMosqueId)
    }
  }

  // Look up the selected mosque object
  const selectedMosque = useMemo(
    () => (selectedMosqueId ? allMosques.find(m => m.id === selectedMosqueId) ?? null : null),
    [selectedMosqueId, allMosques],
  )

  const attendedNights = new Set(tracker?.nights.map(n => n.night) ?? [])
  const nightDataMap = new Map(tracker?.nights.map(n => [n.night, n]) ?? [])

  // Viewing night data
  const viewingNightData = viewingNight !== null ? nightDataMap.get(viewingNight) ?? null : null
  const viewingNightMosque = viewingNightData?.mosque_id
    ? allMosques.find(m => m.id === viewingNightData.mosque_id) ?? null
    : null

  // Determine tonight's number
  const todayNight = useMemo(() => {
    const info = getRamadanInfo()
    if (info.type === 'during') return info.nightNum ?? null
    return null
  }, [])

  const markMutation = useMutation({
    mutationFn: ({ night, rakaat, mosqueId }: { night: number; rakaat?: number; mosqueId?: number | null }) =>
      toggleNight(token!, night, mosqueId ?? undefined, rakaat),
    onMutate: async ({ night, rakaat, mosqueId }) => {
      await queryClient.cancelQueries({ queryKey: ['tracker'] })
      const previous = queryClient.getQueryData<TrackerData>(['tracker'])
      if (previous) {
        const existingIdx = previous.nights.findIndex(n => n.night === night)
        const newNight = { night, mosque_id: mosqueId ?? null, rakaat: rakaat ?? null, attended_at: new Date().toISOString() }
        const updatedNights = existingIdx >= 0
          ? previous.nights.map((n, i) => i === existingIdx ? newNight : n)
          : [...previous.nights, newNight]
        queryClient.setQueryData<TrackerData>(['tracker'], {
          ...previous,
          nights: updatedNights,
          stats: existingIdx >= 0
            ? previous.stats
            : { ...previous.stats, attended: previous.stats.attended + 1 },
        })
      }
      // Trigger cell pop animation
      setPoppedCell(night)
      setTimeout(() => setPoppedCell(null), 350)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tracker'], context.previous)
      toast.error('حدث خطأ، حاول مرة أخرى')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tracker'] }),
  })

  const unmarkMutation = useMutation({
    mutationFn: (night: number) => removeNight(token!, night),
    onMutate: async (night) => {
      await queryClient.cancelQueries({ queryKey: ['tracker'] })
      const previous = queryClient.getQueryData<TrackerData>(['tracker'])
      if (previous) {
        queryClient.setQueryData<TrackerData>(['tracker'], {
          ...previous,
          nights: previous.nights.filter(n => n.night !== night),
          stats: { ...previous.stats, attended: Math.max(0, previous.stats.attended - 1) },
        })
      }
      return { previous }
    },
    onError: (_err, _night, context) => {
      if (context?.previous) queryClient.setQueryData(['tracker'], context.previous)
      toast.error('حدث خطأ، حاول مرة أخرى')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tracker'] }),
  })

  const handleCellClick = useCallback((night: number) => {
    // Don't allow clicking future nights
    if (todayNight !== null && night > todayNight) return

    if (attendedNights.has(night)) {
      setViewingNight(night)
    } else {
      editingRakaatRef.current = null
      pendingNightRef.current = night
      setPendingNight(night)
    }
  }, [attendedNights, todayNight])

  const handleEditNight = () => {
    if (viewingNight === null) return
    const nightData = nightDataMap.get(viewingNight)
    // Pre-select the night's mosque for the edit session
    if (nightData?.mosque_id) {
      setSelectedMosqueId(nightData.mosque_id)
    }
    // Store current rakaat for highlight
    editingRakaatRef.current = nightData?.rakaat ?? null
    setViewingNight(null)
    pendingNightRef.current = viewingNight
    setPendingNight(viewingNight)
  }

  const handleRemoveNight = () => {
    if (viewingNight === null) return
    const night = viewingNight
    setViewingNight(null)
    unmarkMutation.mutate(night)
  }

  const handleRakaatSelect = (rakaat: number) => {
    const night = pendingNightRef.current
    if (night === null) return
    markMutation.mutate({ night, rakaat, mosqueId: selectedMosqueId })
    editingRakaatRef.current = null
    pendingNightRef.current = null
    setPendingNight(null)
  }

  const handleRakaatSkip = () => {
    const night = pendingNightRef.current
    if (night === null) return
    // When editing and skipping rakaat, keep the existing rakaat value
    const existingRakaat = editingRakaatRef.current
    if (existingRakaat != null) {
      // Editing mode: save with current mosque + existing rakaat
      markMutation.mutate({ night, rakaat: existingRakaat, mosqueId: selectedMosqueId })
    } else {
      // New mode: mark without rakaat
      markMutation.mutate({ night, mosqueId: selectedMosqueId })
    }
    editingRakaatRef.current = null
    pendingNightRef.current = null
    setPendingNight(null)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      editingRakaatRef.current = null
      pendingNightRef.current = null
      setPendingNight(null)
    }
  }

  const handleViewingClose = (open: boolean) => {
    if (!open) setViewingNight(null)
  }

  const handleMosqueSelect = (mosque: Mosque) => {
    setSelectedMosqueId(mosque.id)
  }

  const handleClearMosque = () => {
    setSelectedMosqueId(null)
  }

  const handleShare = () => {
    if (!user || !tracker) return
    const attended = tracker.stats.attended
    const streak = tracker.stats.current_streak
    let text = `أكملت ${formatArabicCount(attended, arabicNouns.night)} تراويح`
    if (streak > 1) text += ` — ${streakLabel(streak)}`
    text += `\ntaraweeh.org/u/${user.username}`
    navigator.clipboard.writeText(text)
    toast.success('تم نسخ الإنجاز')
  }

  if (authLoading) return <TrackerSkeleton />

  if (!isAuthenticated) {
    return (
      <>
        <Helmet><title>متابعة التراويح - أئمة التراويح</title></Helmet>
        <div className="container flex flex-col items-center gap-4 py-20 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium">سجل دخولك لمتابعة حضورك</p>
          <Button onClick={() => setLoginOpen(true)} className="h-12 px-8 text-base">
            <LogIn className="me-2 h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    )
  }

  if (isLoading) return <TrackerSkeleton />

  const stats = tracker?.stats ?? { attended: 0, total: 30, current_streak: 0, best_streak: 0 }
  const progress = Math.round((stats.attended / 30) * 100)
  const totalRakaat = tracker?.nights.reduce((sum, n) => sum + (n.rakaat ?? 0), 0) ?? 0

  // Whether the rakaat picker is in edit mode
  const isEditingNight = editingRakaatRef.current !== null || (pendingNight !== null && attendedNights.has(pendingNight))

  return (
    <>
      <Helmet><title>متابعة التراويح - أئمة التراويح</title></Helmet>
      <div className="container py-6">
        {/* Intro */}
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0" />
          <p>تابع حضورك لصلاة التراويح خلال شهر رمضان ١٤٤٧ هـ. اضغط على الليلة لتسجيل حضورك.</p>
        </div>

        {/* Hero Stats Card */}
        <div className="mb-6 rounded-xl bg-white p-5 shadow-card">
          {/* Top: Ring + Progress */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <ProgressRing attended={stats.attended} />

            <div className="flex-1 text-center sm:text-start w-full">
              <div className="mb-1 flex items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-lg font-bold">متابعة التراويح</h2>
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
                  <Share2 className="h-3.5 w-3.5" />
                  مشاركة
                </Button>
              </div>

              <p className="mb-2 text-sm text-muted-foreground">
                {stats.attended === 0
                  ? `لم تحضر أي ليلة بعد`
                  : <>أكملت {formatArabicCount(stats.attended, arabicNouns.night, { showOne: true })} من {toArabicNum(30)} ليلة</>}
              </p>

              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {toArabicNum(progress)}٪
                </span>
              </div>
            </div>
          </div>

          {/* Stats badges */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {/* Current streak */}
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2.5">
              <Flame className={cn(
                'h-5 w-5 text-orange-500 shrink-0',
                stats.current_streak > 0 && 'flame-flicker'
              )} />
              <div className="min-w-0">
                <div className="text-[11px] text-orange-600">السلسلة الحالية</div>
                <div className="text-sm font-bold text-orange-700 tabular-nums truncate">
                  {stats.current_streak > 0 ? streakLabel(stats.current_streak) : 'لا يوجد'}
                </div>
              </div>
            </div>

            {/* Best streak */}
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
              <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] text-amber-600">أفضل سلسلة</div>
                <div className="text-sm font-bold text-amber-700 tabular-nums truncate">
                  {stats.best_streak > 0
                    ? formatArabicCount(stats.best_streak, arabicNouns.night)
                    : 'لا يوجد'}
                </div>
              </div>
            </div>

            {/* Total rakaat */}
            <div className="col-span-2 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5 sm:col-span-1">
              <Star className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] text-primary/70">إجمالي الركعات</div>
                <div className="text-sm font-bold text-primary tabular-nums truncate">
                  {totalRakaat > 0
                    ? `${toArabicNum(totalRakaat)} ${rakaatLabel(totalRakaat)}`
                    : 'لا يوجد'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 30-cell grid */}
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:gap-3">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(night => {
            const attended = attendedNights.has(night)
            const nightData = nightDataMap.get(night)
            const hijri = getNightHijri(night)
            const isToday = todayNight === night
            const isFuture = todayNight !== null && night > todayNight
            const isPopped = poppedCell === night
            const nightMosque = nightData?.mosque_id ? allMosques.find(m => m.id === nightData.mosque_id) : null

            return (
              <button
                key={night}
                onClick={() => handleCellClick(night)}
                disabled={isFuture}
                title={nightMosque ? nightMosque.name : undefined}
                className={cn(
                  'relative flex min-h-[64px] flex-col items-center justify-center rounded-xl border-2 transition-all duration-200',
                  attended
                    ? 'border-primary bg-primary/15 text-primary shadow-sm'
                    : isFuture
                      ? 'pointer-events-none border-border/30 bg-white/60 text-muted-foreground/40'
                      : 'border-border/60 bg-white text-muted-foreground hover:border-primary/30 hover:bg-primary/5 active:scale-95',
                  isToday && !attended && 'ring-2 ring-primary/30 ring-offset-1 animate-pulse-subtle',
                  isToday && attended && 'ring-2 ring-primary/40 ring-offset-1',
                  isPopped && 'cell-pop',
                )}
              >
                {attended && (
                  <Check className="absolute top-1 end-1 h-3.5 w-3.5 text-primary" />
                )}
                {attended && nightMosque && (
                  <MapPin className="absolute top-1 start-1 h-3 w-3 text-primary/50" />
                )}
                <span className="text-xl font-bold tabular-nums">{toArabicNum(night)}</span>
                <span className="text-[10px] opacity-60">{hijri}</span>
                {attended && nightData?.rakaat && (
                  <span className="mt-0.5 inline-flex rounded-full bg-primary/20 px-1.5 py-px text-[9px] font-bold text-primary tabular-nums">
                    {toArabicNum(nightData.rakaat)} {rakaatLabel(nightData.rakaat)}
                  </span>
                )}
                {isToday && !attended && (
                  <span className="mt-0.5 text-[9px] font-medium text-primary">الليلة</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Night detail view — Drawer on mobile, Dialog on desktop */}
      {isDesktop ? (
        <Dialog open={viewingNight !== null} onOpenChange={handleViewingClose}>
          <DialogContent className="max-w-xs sm:max-w-sm">
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">
                ليلة {viewingNight !== null ? toArabicNum(viewingNight) : ''} رمضان
              </DialogTitle>
              <DialogDescription className="sr-only">تفاصيل الحضور</DialogDescription>
            </DialogHeader>
            {viewingNightData && (
              <NightDetail
                nightData={viewingNightData}
                mosque={viewingNightMosque}
                onEdit={handleEditNight}
                onRemove={handleRemoveNight}
              />
            )}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={viewingNight !== null} onOpenChange={handleViewingClose}>
          <DrawerContent>
            <DrawerHeader className="text-center">
              <DrawerTitle className="text-xl">
                ليلة {viewingNight !== null ? toArabicNum(viewingNight) : ''} رمضان
              </DrawerTitle>
              <DrawerDescription className="sr-only">تفاصيل الحضور</DrawerDescription>
            </DrawerHeader>
            {viewingNightData && (
              <NightDetail
                nightData={viewingNightData}
                mosque={viewingNightMosque}
                onEdit={handleEditNight}
                onRemove={handleRemoveNight}
              />
            )}
          </DrawerContent>
        </Drawer>
      )}

      {/* Rakaat selection — Drawer on mobile, Dialog on desktop */}
      {isDesktop ? (
        <Dialog open={pendingNight !== null} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-xs sm:max-w-sm">
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">
                {isEditingNight ? 'تعديل الحضور' : 'كم عدد الركعات؟'}
              </DialogTitle>
              <DialogDescription>
                ليلة {pendingNight !== null ? toArabicNum(pendingNight) : ''} رمضان
              </DialogDescription>
            </DialogHeader>
            <RakaatPicker
              onSelect={handleRakaatSelect}
              onSkip={handleRakaatSkip}
              selectedMosque={selectedMosque}
              onChangeMosque={() => setMosquePickerOpen(true)}
              onClearMosque={handleClearMosque}
              currentRakaat={editingRakaatRef.current}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={pendingNight !== null} onOpenChange={handleDialogClose}>
          <DrawerContent>
            <DrawerHeader className="text-center">
              <DrawerTitle className="text-xl">
                {isEditingNight ? 'تعديل الحضور' : 'كم عدد الركعات؟'}
              </DrawerTitle>
              <DrawerDescription>
                ليلة {pendingNight !== null ? toArabicNum(pendingNight) : ''} رمضان
              </DrawerDescription>
            </DrawerHeader>
            <RakaatPicker
              onSelect={handleRakaatSelect}
              onSkip={handleRakaatSkip}
              selectedMosque={selectedMosque}
              onChangeMosque={() => setMosquePickerOpen(true)}
              onClearMosque={handleClearMosque}
              currentRakaat={editingRakaatRef.current}
            />
          </DrawerContent>
        </Drawer>
      )}

      {/* Mosque search picker */}
      <MosquePicker
        open={mosquePickerOpen}
        onOpenChange={setMosquePickerOpen}
        onSelect={handleMosqueSelect}
        mosques={allMosques}
        favoriteMosqueIds={favoriteMosqueIds}
        isDesktop={isDesktop}
      />
    </>
  )
}
