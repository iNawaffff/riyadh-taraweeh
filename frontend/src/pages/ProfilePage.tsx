import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Share2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MosqueGrid } from '@/components/mosque'
import { PageLoader } from '@/components/PageLoader'
import { fetchPublicProfile, fetchPublicTracker } from '@/lib/api'
import { toArabicNum } from '@/lib/arabic-utils'
import { toast } from 'sonner'
import type { PublicProfile, PublicTrackerData } from '@/types'

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
              <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
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

        {profile.mosques.length > 0 ? (
          <MosqueGrid mosques={profile.mosques} />
        ) : (
          <p className="py-12 text-center text-muted-foreground">لا توجد مفضلات بعد</p>
        )}
      </div>
    </>
  )
}
