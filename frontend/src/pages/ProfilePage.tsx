import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Share2, ArrowRight, X, Sparkles, Calendar, Heart, Moon, Award, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/PageLoader'
import { fetchPublicProfile, fetchPublicTracker } from '@/lib/api'
import { useUserTransfers, useCancelTransfer, useLeaderboard } from '@/hooks/use-transfers'
import { useAuth } from '@/hooks/use-auth'
import { toArabicNum, formatArabicDate, pluralizeArabic, arabicNouns } from '@/lib/arabic-utils'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'
import type { PublicProfile, PublicTrackerData } from '@/types'

function spawnConfetti() {
  const colors = ['#c4a052', '#0d4b33', '#f2ecd7', '#fbbf24', '#34d399']
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div')
    el.className = 'confetti-piece'
    el.style.left = `${Math.random() * 100}vw`
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    el.style.animationDelay = `${Math.random() * 0.8}s`
    el.style.animationDuration = `${1.8 + Math.random() * 1.5}s`
    el.style.width = `${6 + Math.random() * 8}px`
    el.style.height = `${6 + Math.random() * 8}px`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 4000)
  }
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { data: profile, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ['profile', username],
    queryFn: () => fetchPublicProfile(username!),
    enabled: !!username,
  })

  const { data: tracker } = useQuery<PublicTrackerData>({
    queryKey: ['publicTracker', username],
    queryFn: () => fetchPublicTracker(username!),
    enabled: !!username,
  })

  const { user: currentUser } = useAuth()
  const isOwnProfile = currentUser?.username === username
  const { data: transfers = [] } = useUserTransfers()
  const cancelMutation = useCancelTransfer()
  const { data: leaderboard = [] } = useLeaderboard()
  const isPioneer = leaderboard.some(e => e.username === username && e.is_pioneer)

  // First contribution celebration
  const celebratedRef = useRef(false)
  useEffect(() => {
    if (!isOwnProfile || celebratedRef.current) return
    const approvedCount = transfers.filter(t => t.status === 'approved').length
    if (approvedCount >= 1 && !localStorage.getItem('celebrated_first_contribution')) {
      celebratedRef.current = true
      localStorage.setItem('celebrated_first_contribution', '1')
      setTimeout(() => {
        spawnConfetti()
        toast('مبارك! أول مساهمة لك تمت الموافقة عليها', {
          description: 'شكراً لمساهمتك في تحديث بيانات الأئمة',
          duration: 6000,
        })
      }, 500)
    }
  }, [isOwnProfile, transfers])

  const handleShareProfile = () => {
    const url = `${window.location.origin}/u/${username}`
    navigator.clipboard.writeText(url)
    toast.success('تم نسخ رابط الملف الشخصي')
  }

  if (isLoading) return <PageLoader />
  if (error || !profile) {
    return (
      <div className="container py-12 text-center">
        <p className="text-lg text-muted-foreground">المستخدم غير موجود</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowRight className="h-4 w-4" />
          العودة للرئيسية
        </Link>
      </div>
    )
  }

  const approvedTransfers = transfers.filter(t => t.status === 'approved').length
  const nightsAttended = tracker?.stats.attended ?? 0
  const progress = Math.round((nightsAttended / 30) * 100)

  return (
    <>
      <Helmet>
        <title>{profile.display_name || profile.username} - أئمة التراويح</title>
      </Helmet>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark pb-20 pt-10 text-white">
        <div className="islamic-pattern-large absolute inset-0" />
        <div className="absolute -start-20 -top-20 h-60 w-60 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-10 -end-10 h-40 w-40 rounded-full bg-white/[0.03]" />

        <div className="container relative">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="hero-fade-in h-24 w-24 rounded-full border-4 border-white/20 object-cover shadow-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="hero-fade-in flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-3xl font-bold shadow-lg">
                {(profile.display_name || profile.username)[0]}
              </div>
            )}

            {/* Name + Badge */}
            <div className="hero-fade-in animation-delay-150 mt-4 flex items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
              {isPioneer && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-l from-amber-500 to-yellow-400 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  <Sparkles className="h-2.5 w-2.5" />
                  رائد
                </span>
              )}
            </div>

            {/* Username */}
            <p className="hero-fade-in animation-delay-150 mt-1 text-sm text-white/60">
              <span dir="ltr" className="inline-block">@{profile.username}</span>
            </p>

            {/* Member since */}
            {profile.created_at && (
              <p className="hero-fade-in animation-delay-150 mt-2 flex items-center gap-1.5 text-xs text-white/50">
                <Calendar className="h-3 w-3" />
                عضو منذ {formatArabicDate(new Date(profile.created_at))}
              </p>
            )}

            {/* Share button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareProfile}
              className="hero-fade-in animation-delay-150 mt-4 gap-1.5 rounded-full border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Share2 className="h-3.5 w-3.5" />
              مشاركة الملف
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Floating */}
      <div className="container -mt-12">
        <div className="grid grid-cols-3 gap-3">
          <Link
            to={isOwnProfile ? '/tracker' : '#'}
            className="slide-in-right rounded-2xl bg-white p-4 text-center shadow-card transition-shadow hover:shadow-card-hover"
            style={{ animationDelay: '0ms' }}
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Moon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{toArabicNum(nightsAttended)}</p>
            <p className="text-xs text-muted-foreground">{pluralizeArabic(nightsAttended, arabicNouns.night)}</p>
          </Link>

          <Link
            to={isOwnProfile ? '/favorites' : '#'}
            className="slide-in-right rounded-2xl bg-white p-4 text-center shadow-card transition-shadow hover:shadow-card-hover"
            style={{ animationDelay: '60ms' }}
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Heart className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-primary">{toArabicNum(profile.mosques.length)}</p>
            <p className="text-xs text-muted-foreground">{pluralizeArabic(profile.mosques.length, arabicNouns.favorite)}</p>
          </Link>

          <Link
            to="/leaderboard"
            className="slide-in-right rounded-2xl bg-white p-4 text-center shadow-card transition-shadow hover:shadow-card-hover"
            style={{ animationDelay: '120ms' }}
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
              <Award className="h-5 w-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-primary">{toArabicNum(approvedTransfers)}</p>
            <p className="text-xs text-muted-foreground">{pluralizeArabic(approvedTransfers, arabicNouns.contribution)}</p>
          </Link>
        </div>
      </div>

      <div className="container py-6">
        {/* Tracker Progress */}
        {nightsAttended > 0 && (
          <div className="slide-in-right mb-6 rounded-2xl bg-white p-5 shadow-card" style={{ animationDelay: '180ms' }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-primary">
                <Moon className="h-4 w-4" />
                متابعة التراويح
              </h2>
              <span className="text-sm text-muted-foreground">
                {toArabicNum(nightsAttended)} من ٣٠ ({toArabicNum(progress)}٪)
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-l from-primary to-primary-dark transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            {isOwnProfile && (
              <Link
                to="/tracker"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                عرض التفاصيل
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}

        {/* Contributions - own profile only */}
        {isOwnProfile && transfers.length > 0 && (
          <div className="slide-in-right rounded-2xl bg-white p-5 shadow-card" style={{ animationDelay: '240ms' }}>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-primary">
              <Award className="h-4 w-4" />
              مساهماتي
            </h2>
            <div className="space-y-3">
              {transfers.map((tr, index) => (
                <div
                  key={tr.id}
                  className="slide-in-right flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-background p-4"
                  style={{ animationDelay: `${300 + index * 60}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{tr.mosque_name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {tr.current_imam_name && (
                        <span className="text-destructive/70">{tr.current_imam_name}</span>
                      )}
                      {tr.current_imam_name && ' ← '}
                      <span className="text-primary">{tr.new_imam_name}</span>
                    </p>
                    {tr.status === 'rejected' && tr.reject_reason && (
                      <p className="mt-2 rounded-lg bg-destructive/5 p-2 text-xs text-destructive">
                        {tr.reject_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge
                      className={
                        tr.status === 'approved'
                          ? 'bg-primary/10 text-primary hover:bg-primary/10'
                          : tr.status === 'rejected'
                            ? 'bg-destructive/10 text-destructive hover:bg-destructive/10'
                            : 'bg-accent/20 text-accent-foreground hover:bg-accent/20'
                      }
                    >
                      {tr.status === 'pending' ? 'قيد المراجعة' : tr.status === 'approved' ? 'مقبول' : 'مرفوض'}
                    </Badge>
                    {tr.status === 'pending' && (
                      <button
                        onClick={() => cancelMutation.mutate(tr.id, { onSuccess: () => toast.success('تم الإلغاء') })}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                        إلغاء
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for own profile with no activity */}
        {isOwnProfile && transfers.length === 0 && nightsAttended === 0 && (
          <div className="slide-in-right rounded-2xl bg-white p-8 text-center shadow-card" style={{ animationDelay: '180ms' }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Moon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 font-bold">ابدأ رحلتك في رمضان</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              تابع حضورك للتراويح وساهم في تحديث بيانات الأئمة
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild size="sm" className="gap-1.5 rounded-full">
                <Link to="/tracker">
                  <Moon className="h-4 w-4" />
                  متابعة التراويح
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-full">
                <Link to="/">
                  تصفح المساجد
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
