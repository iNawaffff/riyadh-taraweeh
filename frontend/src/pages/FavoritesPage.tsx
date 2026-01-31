import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Heart, Share2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MosqueGrid } from '@/components/mosque'
import { PageLoader } from '@/components/PageLoader'
import { useAuth } from '@/hooks/use-auth'
import { useFavorites, useMosques } from '@/hooks'
import { toast } from 'sonner'
import { useState } from 'react'
import { LoginDialog } from '@/components/auth'

export function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { favorites } = useFavorites()
  const { data: allMosques, isLoading: mosquesLoading } = useMosques()
  const [loginOpen, setLoginOpen] = useState(false)

  const favMosques = useMemo(() => {
    if (!allMosques) return []
    return allMosques.filter(m => favorites.includes(m.id))
  }, [allMosques, favorites])

  const handleShare = () => {
    if (!user) return
    const url = `${window.location.origin}/u/${user.username}`
    navigator.clipboard.writeText(url)
    toast.success('تم نسخ رابط الملف الشخصي')
  }

  if (authLoading) return <PageLoader />

  if (!isAuthenticated) {
    return (
      <>
        <Helmet><title>المفضلة - أئمة التراويح</title></Helmet>
        <div className="container flex flex-col items-center gap-4 py-20 text-center">
          <Heart className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium">سجل دخولك لحفظ مفضلاتك</p>
          <Button onClick={() => setLoginOpen(true)} className="h-12 px-8 text-base">
            تسجيل الدخول
          </Button>
        </div>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    )
  }

  return (
    <>
      <Helmet><title>المفضلة - أئمة التراويح</title></Helmet>
      <div className="container py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">المفضلة</h2>
            {favMosques.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                {favMosques.length}
              </span>
            )}
          </div>
          {favMosques.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
              <Share2 className="h-4 w-4" />
              مشاركة
            </Button>
          )}
        </div>

        {mosquesLoading ? (
          <MosqueGrid mosques={[]} isLoading={true} />
        ) : favMosques.length > 0 ? (
          <MosqueGrid mosques={favMosques} />
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">لم تضف أي مسجد بعد</p>
            <Link to="/" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ArrowRight className="h-4 w-4" />
              تصفح المساجد
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
