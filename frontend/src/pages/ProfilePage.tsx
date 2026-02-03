import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Share2, ArrowRight, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MosqueGrid } from '@/components/mosque'
import { PageLoader } from '@/components/PageLoader'
import { fetchPublicProfile, fetchPublicTracker } from '@/lib/api'
import { useUserTransfers, useCancelTransfer, useLeaderboard } from '@/hooks/use-transfers'
import { useAuth } from '@/hooks/use-auth'
import { toArabicNum } from '@/lib/arabic-utils'
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
        toast('🏆 مبارك! أول مساهمة لك تمت الموافقة عليها', {
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

  return (
    <>
      <Helmet>
        <title>مفضلات {profile.display_name || profile.username} - أئمة التراويح</title>
      </Helmet>

      <div className="container py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {(profile.display_name || profile.username)[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
                {isPioneer && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-l from-amber-500 to-yellow-400 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <Sparkles className="h-2.5 w-2.5" />
                    رائد
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.mosques.length} مسجد في المفضلة
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShareProfile} className="gap-1.5">
              <Share2 className="h-4 w-4" />
              مشاركة الملف
            </Button>
          </div>
        </div>

        {/* Tracker progress */}
        {tracker && tracker.stats.attended > 0 && (() => {
          const progress = Math.round((tracker.stats.attended / 30) * 100)
          return (
            <div className="mb-6 rounded-xl bg-white p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">متابعة التراويح</span>
                <span className="text-muted-foreground">{toArabicNum(tracker.stats.attended)} من ٣٠ ليلة ({toArabicNum(progress)}٪)</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )
        })()}

        {/* Contributions section - own profile only */}
        {isOwnProfile && transfers.length > 0 && (
          <div className="mb-6 rounded-xl bg-white p-4 shadow-card">
            <h3 className="mb-3 font-bold text-primary">مساهماتي</h3>
            <div className="space-y-2">
              {transfers.map((tr) => (
                <div key={tr.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{tr.mosque_name}</p>
                    <p className="text-muted-foreground">
                      {tr.current_imam_name && `${tr.current_imam_name} ← `}{tr.new_imam_name}
                    </p>
                    {tr.status === 'rejected' && tr.reject_reason && (
                      <p className="mt-1 text-xs text-destructive">{tr.reject_reason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={tr.status === 'approved' ? 'default' : tr.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {tr.status === 'pending' ? 'قيد المراجعة' : tr.status === 'approved' ? 'مقبول' : 'مرفوض'}
                    </Badge>
                    {tr.status === 'pending' && (
                      <button
                        onClick={() => cancelMutation.mutate(tr.id, { onSuccess: () => toast.success('تم الإلغاء') })}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="إلغاء"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.mosques.length > 0 ? (
          <MosqueGrid mosques={profile.mosques} />
        ) : (
          <p className="py-12 text-center text-muted-foreground">لا توجد مفضلات بعد</p>
        )}
      </div>
    </>
  )
}
