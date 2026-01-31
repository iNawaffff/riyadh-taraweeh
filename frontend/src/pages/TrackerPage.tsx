import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Check, Share2, Flame, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoginDialog } from '@/components/auth'
import { useAuth } from '@/hooks/use-auth'
import { fetchTracker, toggleNight, removeNight } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { toArabicNum } from '@/lib/arabic-utils'
import type { TrackerData } from '@/types'

const RAMADAN_START = new Date(2026, 1, 18) // Feb 18, 2026

const GREGORIAN_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function getNightDates(night: number) {
  const date = new Date(RAMADAN_START)
  date.setDate(date.getDate() + night - 1)
  const hijri = `${toArabicNum(night)} رمضان`
  const gregorian = `${toArabicNum(date.getDate())} ${GREGORIAN_MONTHS[date.getMonth()]}`
  return { hijri, gregorian }
}

function TrackerSkeleton() {
  return (
    <div className="container py-6">
      {/* Stats skeleton */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <Skeleton className="mb-1 h-4 w-48" />
        <Skeleton className="mb-3 h-3 w-full rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 md:gap-3">
        {Array.from({ length: 30 }, (_, i) => (
          <Skeleton key={i} className="min-h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function TrackerPage() {
  const { isAuthenticated, isLoading: authLoading, token, user } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: tracker, isLoading } = useQuery<TrackerData>({
    queryKey: ['tracker'],
    queryFn: () => fetchTracker(token!),
    enabled: isAuthenticated && !!token,
  })

  const attendedNights = new Set(tracker?.nights.map(n => n.night) ?? [])

  const markMutation = useMutation({
    mutationFn: (night: number) => toggleNight(token!, night),
    onMutate: async (night) => {
      await queryClient.cancelQueries({ queryKey: ['tracker'] })
      const previous = queryClient.getQueryData<TrackerData>(['tracker'])
      if (previous) {
        queryClient.setQueryData<TrackerData>(['tracker'], {
          ...previous,
          nights: [...previous.nights, { night, mosque_id: null, attended_at: new Date().toISOString() }],
          stats: { ...previous.stats, attended: previous.stats.attended + 1 },
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

  const handleCellClick = (night: number) => {
    if (attendedNights.has(night)) {
      unmarkMutation.mutate(night)
    } else {
      markMutation.mutate(night)
    }
  }

  const handleShare = () => {
    if (!user || !tracker) return
    const attended = tracker.stats.attended
    const streak = tracker.stats.current_streak
    let text = `أكملت ${toArabicNum(attended)} ليلة تراويح`
    if (streak > 1) text += ` (${toArabicNum(streak)} متتالية)`
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

  return (
    <>
      <Helmet><title>متابعة التراويح - أئمة التراويح</title></Helmet>
      <div className="container py-6">
        {/* Intro */}
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0" />
          <p>تابع حضورك لصلاة التراويح خلال شهر رمضان ١٤٤٧ هـ. اضغط على الليلة لتسجيل حضورك.</p>
        </div>

        {/* Stats bar */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">متابعة التراويح</h2>
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
              <Share2 className="h-4 w-4" />
              مشاركة
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-sm">
              <span>أكملت {toArabicNum(stats.attended)} من ٣٠ ليلة</span>
              <span className="text-muted-foreground">{toArabicNum(progress)}٪</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Streak badges */}
          <div className="flex gap-3">
            {stats.current_streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-700">
                <Flame className="h-4 w-4" />
                {toArabicNum(stats.current_streak)} متتالية
              </div>
            )}
            {stats.best_streak > 1 && stats.best_streak !== stats.current_streak && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700">
                <Flame className="h-4 w-4" />
                أفضل: {toArabicNum(stats.best_streak)}
              </div>
            )}
          </div>
        </div>

        {/* 30-cell grid */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 md:gap-3">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(night => {
            const attended = attendedNights.has(night)
            const { hijri, gregorian } = getNightDates(night)
            return (
              <button
                key={night}
                onClick={() => handleCellClick(night)}
                className={cn(
                  'relative flex min-h-[76px] flex-col items-center justify-center rounded-xl border-2 transition-all duration-200',
                  'active:scale-95',
                  attended
                    ? 'border-primary bg-primary/15 text-primary shadow-sm'
                    : 'border-border/60 bg-white text-muted-foreground hover:border-primary/30 hover:bg-primary/5'
                )}
              >
                {attended && (
                  <Check className="absolute top-1 end-1 h-3.5 w-3.5 text-primary" />
                )}
                <span className="text-xl font-bold">{toArabicNum(night)}</span>
                <span className="text-[10px] opacity-60">{hijri}</span>
                <span className="text-[10px] opacity-50">{gregorian}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
