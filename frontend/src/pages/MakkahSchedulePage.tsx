import { useState, useMemo, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Moon, Star, ChevronLeft, ChevronRight, Play, Pause, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toArabicNum, toArabicOrdinalFeminine, getRamadanInfo } from '@/lib/arabic-utils'
import { useAudioPlayer } from '@/hooks'

// =============================================================================
// TYPES
// =============================================================================

interface NightSchedule {
  night: number
  firstTesleemat: string
  secondTesleemat: string | null
  lastWithWitr: string
}

// =============================================================================
// DATA: Imams with their full titles
// =============================================================================

const IMAMS = [
  { id: 9001, short: 'بدر التركي', full: 'فضيلة الشيخ بدر التركي', audioSrc: 'https://imams-riyadh-audio.s3.eu-north-1.amazonaws.com/Badr+Turki+Recitations+Al-Baqarah+Al-Isra+Aug+15+1447.mp3' },
  { id: 9002, short: 'الوليد الشمسان', full: 'فضيلة الشيخ د. الوليد الشمسان', audioSrc: 'https://imams-riyadh-audio.s3.eu-north-1.amazonaws.com/Historical+Highlights+from+Sheikh+Al-Waleed.mp3' },
  { id: 9003, short: 'عبدالرحمن السديس', full: 'معالي الشيخ أ.د. عبدالرحمن السديس', audioSrc: 'https://imams-riyadh-audio.s3.eu-north-1.amazonaws.com/Sheikh+Sudais+Ramadan+1443.mp3' },
  { id: 9004, short: 'بندر بليلة', full: 'فضيلة الشيخ د. بندر بليلة', audioSrc: 'https://imams-riyadh-audio.s3.eu-north-1.amazonaws.com/Ramadan+Nights+1441+Sheikh+Bandar.mp3' },
  { id: 9005, short: 'عبدالله الجهني', full: 'فضيلة الشيخ أ.د. عبدالله الجهني', audioSrc: 'https://imams-riyadh-audio.s3.eu-north-1.amazonaws.com/Sheikh+Abdullah+Al-Juhani+Recitation+Muharram+1446.mp3' },
  { id: 9006, short: 'ماهر المعيقلي', full: 'فضيلة الشيخ د. ماهر المعيقلي', audioSrc: 'https://imams-riyadh-audio.s3.eu-north-1.amazonaws.com/Surat+Al-Baqarah+Official+Audio.mp3' },
  { id: 9007, short: 'ياسر الدوسري', full: 'فضيلة الشيخ أ.د. ياسر الدوسري', audioSrc: 'https://imams-riyadh-audio.s3.eu-north-1.amazonaws.com/Surah+Yaseen+by+Yasser+Al-Dosari+Ramadan+1442.mp3' },
] as const

// =============================================================================
// DATA: Taraweeh Schedule (30 Nights)
// =============================================================================

const TARAWEEH_SCHEDULE: NightSchedule[] = [
  { night: 1, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 2, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. بندر بليلة' },
  { night: 3, firstTesleemat: 'فضيلة الشيخ أ.د. ياسر الدوسري', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. ماهر المعيقلي' },
  { night: 4, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 5, firstTesleemat: 'فضيلة الشيخ د. بندر بليلة', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. عبدالله الجهني' },
  { night: 6, firstTesleemat: 'فضيلة الشيخ د. ماهر المعيقلي', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. ياسر الدوسري' },
  { night: 7, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 8, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. بندر بليلة' },
  { night: 9, firstTesleemat: 'فضيلة الشيخ أ.د. ياسر الدوسري', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. ماهر المعيقلي' },
  { night: 10, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 11, firstTesleemat: 'فضيلة الشيخ د. بندر بليلة', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. عبدالله الجهني' },
  { night: 12, firstTesleemat: 'فضيلة الشيخ د. ماهر المعيقلي', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. ياسر الدوسري' },
  { night: 13, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 14, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. بندر بليلة' },
  { night: 15, firstTesleemat: 'فضيلة الشيخ أ.د. ياسر الدوسري', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. ماهر المعيقلي' },
  { night: 16, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 17, firstTesleemat: 'فضيلة الشيخ د. بندر بليلة', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. عبدالله الجهني' },
  { night: 18, firstTesleemat: 'فضيلة الشيخ د. ماهر المعيقلي', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. ياسر الدوسري' },
  { night: 19, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 20, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. بندر بليلة' },
  { night: 21, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. ماهر المعيقلي' },
  { night: 22, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. ياسر الدوسري' },
  { night: 23, firstTesleemat: 'فضيلة الشيخ د. بندر بليلة', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. الوليد الشمسان' },
  { night: 24, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. ياسر الدوسري' },
  { night: 25, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. ياسر الدوسري' },
  { night: 26, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. الوليد الشمسان' },
  { night: 27, firstTesleemat: 'فضيلة الشيخ د. بندر بليلة', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. ماهر المعيقلي' },
  { night: 28, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. الوليد الشمسان' },
  { night: 29, firstTesleemat: 'فضيلة الشيخ بدر التركي', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 30, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. ياسر الدوسري' },
]

// =============================================================================
// DATA: Tahajjud Schedule (Last 10 Nights: 21-30)
// =============================================================================

const TAHAJJUD_SCHEDULE: NightSchedule[] = [
  { night: 21, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 22, firstTesleemat: 'فضيلة الشيخ د. بندر بليلة', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. ماهر المعيقلي' },
  { night: 23, firstTesleemat: 'فضيلة الشيخ أ.د. ياسر الدوسري', secondTesleemat: 'فضيلة الشيخ بدر التركي', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 24, firstTesleemat: 'فضيلة الشيخ د. ماهر المعيقلي', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. بندر بليلة' },
  { night: 25, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: 'فضيلة الشيخ د. الوليد الشمسان', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 26, firstTesleemat: 'فضيلة الشيخ د. بندر بليلة', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. ماهر المعيقلي' },
  { night: 27, firstTesleemat: 'فضيلة الشيخ أ.د. ياسر الدوسري', secondTesleemat: 'فضيلة الشيخ بدر التركي', lastWithWitr: 'معالي الشيخ أ.د. عبدالرحمن السديس' },
  { night: 28, firstTesleemat: 'فضيلة الشيخ د. ماهر المعيقلي', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. بندر بليلة' },
  { night: 29, firstTesleemat: 'فضيلة الشيخ أ.د. عبدالله الجهني', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ أ.د. ياسر الدوسري' },
  { night: 30, firstTesleemat: 'فضيلة الشيخ د. بندر بليلة', secondTesleemat: null, lastWithWitr: 'فضيلة الشيخ د. ماهر المعيقلي' },
]

// =============================================================================
// SKELETON LOADING COMPONENT (SOTA with Shimmer)
// =============================================================================

function ScheduleSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 animate-fade-in">
      {/* Header Skeleton */}
      <header className="relative overflow-hidden border-b border-border/40 bg-white/80">
        <div className="container py-6">
          {/* Title skeleton */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 h-12 w-12 rounded-2xl skeleton-shimmer" />
            <div className="mb-2 h-7 w-48 rounded-lg skeleton-shimmer" />
            <div className="h-4 w-32 rounded skeleton-shimmer" />
          </div>

          {/* Tabs skeleton */}
          <div className="flex justify-center">
            <div className="h-11 w-64 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="container py-6">
        {/* View toggle skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div className="h-4 w-36 rounded skeleton-shimmer" />
          <div className="h-8 w-32 rounded-lg skeleton-shimmer" />
        </div>

        {/* Night pills skeleton */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-hidden pb-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-9 shrink-0 rounded-full skeleton-shimmer"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Selected night header skeleton */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-2 h-7 w-40 rounded-full skeleton-shimmer" />
          <div className="h-6 w-28 rounded skeleton-shimmer" />
        </div>

        {/* Cards skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/40 bg-white p-4"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-3 h-3 w-24 rounded skeleton-shimmer" />
              <div className="h-5 w-48 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>

        {/* Imams reference skeleton */}
        <div className="mt-8 rounded-2xl border border-border/40 bg-white p-5">
          <div className="mb-4 h-4 w-32 rounded skeleton-shimmer" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full skeleton-shimmer" />
                <div className="h-4 w-36 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// =============================================================================
// COMPONENTS
// =============================================================================

function NightPill({ night, isActive, isCurrent }: { night: number; isActive: boolean; isCurrent: boolean }) {
  return (
    <div
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
        isCurrent && 'ring-2 ring-accent ring-offset-2',
        isActive
          ? 'bg-primary text-white shadow-sm'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      )}
    >
      {toArabicNum(night)}
      {isCurrent && (
        <span className="absolute -top-1 -end-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
      )}
    </div>
  )
}

function ScheduleCards({
  schedule,
  currentNight,
  selectedNight,
  onSelectNight,
  isTahajjud = false,
}: {
  schedule: NightSchedule[]
  currentNight: number | null
  selectedNight: number
  onSelectNight: (night: number) => void
  isTahajjud?: boolean
}) {
  const selectedData = schedule.find(n => n.night === selectedNight)

  return (
    <div className="space-y-6">
      {/* Night selector - horizontal scroll */}
      <div className="relative">
        <ScrollArea className="w-full pb-3">
          <div className="flex gap-2 px-1 py-1">
            {schedule.map((night) => (
              <button
                key={night.night}
                onClick={() => onSelectNight(night.night)}
                className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
              >
                <NightPill
                  night={night.night}
                  isActive={selectedNight === night.night}
                  isCurrent={currentNight === night.night}
                />
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-2" />
        </ScrollArea>
      </div>

      {/* Selected night details */}
      {selectedData && (
        <div className="animate-fade-in">
          {/* Night header */}
          <div className="mb-6 text-center">
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-sm text-primary">
              {currentNight === selectedNight && <Star className="h-3.5 w-3.5 fill-accent text-accent" />}
              <span className="font-medium">
                الليلة {toArabicOrdinalFeminine(selectedData.night)} من رمضان
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {isTahajjud ? 'صلاة التهجد' : 'صلاة التراويح'}
            </h3>
          </div>

          {/* Imam schedule cards */}
          <div className="space-y-3">
            {/* First Tesleemat */}
            <div className="group rounded-2xl border border-border/60 bg-white p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
              <div className="mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {isTahajjud ? 'التسليمتان الأولى' : 'التسليمات الأولى'}
                </span>
              </div>
              <p className="text-base font-semibold text-foreground">
                {selectedData.firstTesleemat}
              </p>
            </div>

            {/* Second Tesleemat (if exists) */}
            {selectedData.secondTesleemat && (
              <div className="group rounded-2xl border border-border/60 bg-white p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-sm">
                <div className="mb-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    التسليمتان الثانية
                  </span>
                </div>
                <p className="text-base font-semibold text-foreground">
                  {selectedData.secondTesleemat}
                </p>
              </div>
            )}

            {/* Last with Witr */}
            <div className="group rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-sm">
              <div className="mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-primary">
                  التسليمة الأخيرة مع الوتر
                </span>
              </div>
              <p className="text-base font-bold text-primary">
                {selectedData.lastWithWitr}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FullScheduleTable({
  schedule,
  currentNight,
  isTahajjud = false,
}: {
  schedule: NightSchedule[]
  currentNight: number | null
  isTahajjud?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
      <ScrollArea className="w-full">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="sticky right-0 z-10 bg-muted/30 px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                الليلة
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {isTahajjud ? 'التسليمتان الأولى' : 'التسليمات الأولى'}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                التسليمتان الثانية
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                التسليمة الأخيرة مع الوتر
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {schedule.map((night, index) => {
              const isCurrent = currentNight === night.night
              return (
                <tr
                  key={night.night}
                  className={cn(
                    'transition-colors duration-150',
                    isCurrent
                      ? 'bg-accent/5'
                      : index % 2 === 0
                        ? 'bg-white'
                        : 'bg-muted/10',
                    'hover:bg-primary/[0.03]'
                  )}
                >
                  <td className={cn(
                    'sticky right-0 z-10 px-4 py-3',
                    isCurrent ? 'bg-accent/5' : index % 2 === 0 ? 'bg-white' : 'bg-muted/10'
                  )}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                        isCurrent
                          ? 'bg-accent text-white'
                          : 'bg-primary/10 text-primary'
                      )}>
                        {toArabicNum(night.night)}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-medium text-accent">الآن</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">
                      {night.firstTesleemat}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {night.secondTesleemat || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-sm font-medium',
                      isCurrent ? 'text-accent' : 'text-primary'
                    )}>
                      {night.lastWithWitr}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

function ImamCard({ imam }: { imam: typeof IMAMS[number] }) {
  const { currentTrack, isPlaying, isLoading, play } = useAudioPlayer()

  const isCurrentImam = currentTrack?.mosqueId === imam.id
  const isCurrentPlaying = isCurrentImam && isPlaying
  const isCurrentLoading = isCurrentImam && isLoading

  const handlePlay = () => {
    play({
      mosqueId: imam.id,
      mosqueName: 'المسجد الحرام',
      imamName: imam.full,
      audioSrc: imam.audioSrc,
    })
  }

  return (
    <button
      onClick={handlePlay}
      disabled={isCurrentLoading}
      className={cn(
        'group relative flex w-full items-center gap-4 rounded-2xl border p-4 text-start transition-all duration-300',
        'hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
        'active:scale-[0.98]',
        isCurrentPlaying
          ? 'border-accent/50 bg-gradient-to-l from-accent/[0.06] to-white shadow-sm'
          : 'border-border/60 bg-white hover:border-primary/20'
      )}
    >
      {/* Play/Pause circle */}
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300',
          isCurrentPlaying
            ? 'bg-accent text-white shadow-[0_0_16px_rgba(196,160,82,0.3)]'
            : 'bg-primary/[0.07] text-primary group-hover:bg-primary/[0.12]'
        )}
      >
        {isCurrentLoading ? (
          <Loader2 className="h-4.5 w-4.5 animate-spin" />
        ) : isCurrentPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 translate-x-[1px]" />
        )}
      </div>

      {/* Imam info */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm font-bold leading-relaxed transition-colors duration-200',
          isCurrentPlaying ? 'text-primary' : 'text-foreground'
        )}>
          {imam.full}
        </p>
        <p className={cn(
          'mt-0.5 text-xs transition-colors duration-200',
          isCurrentPlaying ? 'text-accent font-medium' : 'text-muted-foreground'
        )}>
          {isCurrentPlaying ? 'جارٍ التشغيل...' : 'استمع للتلاوة'}
        </p>
      </div>

      {/* Soundbars — GPU-composited with transform, no layout reflow */}
      <div className={cn(
        'flex items-end gap-[3px] h-5 w-4 shrink-0 me-1 transition-opacity duration-300',
        isCurrentPlaying ? 'opacity-100' : 'opacity-0'
      )} aria-hidden>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[4px] w-[3px] origin-bottom rounded-full bg-accent will-change-transform"
            style={{
              animation: isCurrentPlaying
                ? `soundbar 0.8s ease-in-out ${i * 0.15}s infinite alternate`
                : 'none',
            }}
          />
        ))}
      </div>
    </button>
  )
}

function ImamsReference() {
  return (
    <section>
      {/* Section header with ornamental divider */}
      <div className="mb-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-l from-border/80 to-transparent" />
        <h3 className="shrink-0 text-sm font-bold tracking-wide text-primary">
          أئمة المسجد الحرام
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent" />
      </div>

      {/* Imam cards grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {IMAMS.map((imam) => (
          <ImamCard key={imam.id} imam={imam} />
        ))}
      </div>
    </section>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function MakkahSchedulePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'taraweeh' | 'tahajjud'>('taraweeh')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Simulate initial load to show skeleton (minimum 300ms to avoid flash)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  // Get current Ramadan night
  const currentNight = useMemo(() => {
    const info = getRamadanInfo()
    if (info.type === 'during' && info.nightNum) {
      return info.nightNum
    }
    return null
  }, [])

  // Selected night for card view
  const [selectedTaraweehNight, setSelectedTaraweehNight] = useState(currentNight || 1)
  const [selectedTahajjudNight, setSelectedTahajjudNight] = useState(
    currentNight && currentNight >= 21 ? currentNight : 21
  )

  const tahajjudCurrentNight = currentNight && currentNight >= 21 ? currentNight : null

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>جدول صلاة التراويح والتهجد بالمسجد الحرام - رمضان ١٤٤٧</title>
        </Helmet>
        <ScheduleSkeleton />
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>جدول صلاة التراويح والتهجد بالمسجد الحرام - رمضان ١٤٤٧</title>
        <meta
          name="description"
          content="جدول الأئمة في صلاة التراويح والتهجد بالمسجد الحرام لشهر رمضان ١٤٤٧ هـ / ٢٠٢٦ م"
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 animate-fade-in">
        {/* Header */}
        <header className="relative overflow-hidden border-b border-border/40 bg-white/80 backdrop-blur-xl">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(13,75,51,0.05),transparent_70%)]" />

          <div className="container relative py-6">
            {/* Title */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Moon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
                جدول أئمة الحرم المكي
              </h1>
              <p className="text-sm text-muted-foreground">
                رمضان ١٤٤٧ هـ / ٢٠٢٦ م
              </p>
            </div>

            {/* Prayer type tabs */}
            <div className="flex justify-center">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'taraweeh' | 'tahajjud')}
              >
                <TabsList className="grid h-11 w-full max-w-xs grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1">
                  <TabsTrigger
                    value="taraweeh"
                    className={cn(
                      'rounded-lg text-sm font-medium transition-all duration-200',
                      'data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm'
                    )}
                  >
                    التراويح
                  </TabsTrigger>
                  <TabsTrigger
                    value="tahajjud"
                    className={cn(
                      'rounded-lg text-sm font-medium transition-all duration-200',
                      'data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm'
                    )}
                  >
                    التهجد
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container py-6">
          {/* View mode toggle */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {activeTab === 'taraweeh'
                ? 'جميع ليالي رمضان الثلاثين'
                : 'العشر الأواخر من رمضان'}
            </p>
            <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  viewMode === 'cards'
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                بطاقات
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  viewMode === 'table'
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                جدول
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Taraweeh content */}
          {activeTab === 'taraweeh' && (
            <div className="space-y-6">
              {viewMode === 'cards' ? (
                <ScheduleCards
                  schedule={TARAWEEH_SCHEDULE}
                  currentNight={currentNight}
                  selectedNight={selectedTaraweehNight}
                  onSelectNight={setSelectedTaraweehNight}
                />
              ) : (
                <FullScheduleTable
                  schedule={TARAWEEH_SCHEDULE}
                  currentNight={currentNight}
                />
              )}
            </div>
          )}

          {/* Tahajjud content */}
          {activeTab === 'tahajjud' && (
            <div className="space-y-6">
              {viewMode === 'cards' ? (
                <ScheduleCards
                  schedule={TAHAJJUD_SCHEDULE}
                  currentNight={tahajjudCurrentNight}
                  selectedNight={selectedTahajjudNight}
                  onSelectNight={setSelectedTahajjudNight}
                  isTahajjud
                />
              ) : (
                <FullScheduleTable
                  schedule={TAHAJJUD_SCHEDULE}
                  currentNight={tahajjudCurrentNight}
                  isTahajjud
                />
              )}
            </div>
          )}

          {/* Imams reference */}
          <div className="mt-8">
            <ImamsReference />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-white/50 py-4">
          <div className="container text-center">
            <p className="text-xs text-muted-foreground">
              الجدول قابل للتغيير حسب ما تقرره شؤون الأئمة والمؤذنين
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
