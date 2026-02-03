import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Heart, HandHeart, Medal, Award, Star, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeaderboard } from '@/hooks/use-transfers'
import { useAuth } from '@/hooks/use-auth'
import { LoginDialog } from '@/components/auth'
import { toArabicNum, pluralizeArabic, arabicNouns } from '@/lib/arabic-utils'

export function LeaderboardPage() {
  const { data: entries = [], isLoading } = useLeaderboard()
  const { isAuthenticated } = useAuth()
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <>
      <Helmet>
        <title>المساهمون - أئمة التراويح</title>
      </Helmet>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark py-12 text-white">
        <div className="islamic-pattern-large absolute inset-0" />
        {/* Decorative circles */}
        <div className="absolute -start-20 -top-20 h-60 w-60 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-10 -end-10 h-40 w-40 rounded-full bg-white/[0.03]" />
        <div className="container relative text-center">
          <div className="crown-bounce mb-4 inline-block">
            <HandHeart className="mx-auto h-12 w-12 text-accent" strokeWidth={1.5} />
          </div>
          <h1 className="hero-fade-in text-3xl font-bold md:text-4xl">المساهمون</h1>
          <p className="hero-fade-in animation-delay-150 mt-2 text-sm text-white/60">
            شركاؤنا في تحديث بيانات الأئمة
          </p>
        </div>
      </div>

      <div className="container py-8">
        {isLoading ? (
          <div className="mx-auto max-w-lg space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          /* ── Empty State ── */
          <div className="celebration-pop mx-auto max-w-sm py-16 text-center">
            <div className="relative mx-auto mb-6 h-28 w-28">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/30" />
              <div className="flex h-full w-full items-center justify-center rounded-full bg-accent-light">
                <HandHeart className="h-14 w-14 text-accent" strokeWidth={1.5} />
              </div>
              <Star className="absolute -end-1 top-2 h-5 w-5 fill-accent/20 text-accent/40" />
              <Star className="absolute -start-2 bottom-4 h-4 w-4 fill-accent/15 text-accent/30" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-foreground">لا توجد مساهمات بعد</h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              كن أول من يساهم في تحديث بيانات الأئمة
              <br />
              كل تحديث صحيح هو صدقة جارية تُعين المصلين
            </p>
            {isAuthenticated ? (
              <Button asChild className="gap-2 rounded-full px-6">
                <Link to="/">
                  تصفح المساجد
                </Link>
              </Button>
            ) : (
              <Button onClick={() => setIsLoginOpen(true)} className="gap-2 rounded-full px-6">
                سجّل للمساهمة
              </Button>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-lg">
            {/* ── Podium: Top 3 ── */}
            {top3.length > 0 && (
              <div className="mb-8">
                {top3.map((entry, index) => {
                  const isFirst = index === 0
                  const podiumStyles = [
                    'bg-gradient-to-l from-yellow-50 to-amber-50/50 border-amber-200/60 shadow-[0_2px_16px_rgba(196,160,82,0.12)]',
                    'bg-gradient-to-l from-gray-50 to-slate-50/50 border-gray-200/60',
                    'bg-gradient-to-l from-orange-50 to-amber-50/30 border-amber-200/40',
                  ]
                  const rankColors = ['text-amber-500', 'text-gray-400', 'text-amber-600']
                  const RankIcon = [Heart, Medal, Award][index]

                  return (
                    <div
                      key={entry.username}
                      className={`slide-in-right mb-3 flex items-center gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-card-hover ${podiumStyles[index]}`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Rank icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        <RankIcon
                          className={`${isFirst ? 'h-7 w-7' : 'h-6 w-6'} ${rankColors[index]} ${isFirst ? 'fill-amber-500' : ''}`}
                          strokeWidth={isFirst ? 2 : 1.5}
                        />
                      </div>

                      {/* User info */}
                      <Link to={`/u/${entry.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar className={`shrink-0 ${isFirst ? 'h-12 w-12 ring-2 ring-amber-300/50 ring-offset-2' : 'h-10 w-10'}`}>
                          {entry.avatar_url && <AvatarImage src={entry.avatar_url} referrerPolicy="no-referrer" />}
                          <AvatarFallback className="bg-primary/10 font-bold text-primary">
                            {(entry.display_name || entry.username)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`truncate font-bold ${isFirst ? 'text-base' : 'text-sm'}`}>
                              {entry.display_name || entry.username}
                            </p>
                            {entry.is_pioneer && (
                              <Badge className="gap-0.5 rounded-full bg-gradient-to-l from-amber-500 to-yellow-400 px-2 py-0 text-[10px] text-white shadow-sm">
                                <Sparkles className="h-2.5 w-2.5" />
                                رائد
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span dir="ltr" className="inline-block">@{entry.username}</span>
                          </p>
                        </div>
                      </Link>

                      {/* Contributions count */}
                      <div
                        className={`count-up shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${
                          isFirst
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-primary-light text-primary'
                        }`}
                        style={{ animationDelay: `${index * 100 + 300}ms` }}
                      >
                        {toArabicNum(entry.points)} {pluralizeArabic(entry.points, arabicNouns.contribution)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Rest of the list ── */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((entry, index) => (
                  <div
                    key={entry.username}
                    className="slide-in-right flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-card transition-shadow hover:shadow-card-hover"
                    style={{ animationDelay: `${(index + 3) * 80}ms` }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                      {toArabicNum(index + 4)}
                    </span>

                    <Link to={`/u/${entry.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar className="h-9 w-9 shrink-0">
                        {entry.avatar_url && <AvatarImage src={entry.avatar_url} referrerPolicy="no-referrer" />}
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {(entry.display_name || entry.username)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">{entry.display_name || entry.username}</p>
                          {entry.is_pioneer && (
                            <Badge className="gap-0.5 rounded-full bg-gradient-to-l from-amber-500 to-yellow-400 px-1.5 py-0 text-[9px] text-white shadow-sm">
                              <Sparkles className="h-2 w-2" />
                              رائد
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span dir="ltr" className="inline-block">@{entry.username}</span>
                        </p>
                      </div>
                    </Link>

                    <span className="shrink-0 text-sm font-bold text-primary">
                      {toArabicNum(entry.points)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── CTA for non-authenticated users ── */}
            {!isAuthenticated && (
              <div className="mt-10 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <HandHeart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">ساهم معنا</h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  ساعد المصلين في الوصول للمساجد الصحيحة
                  <br />
                  <span className="text-primary">كل تحديث صحيح صدقة جارية</span>
                </p>
                <Button onClick={() => setIsLoginOpen(true)} className="rounded-full px-6">
                  سجّل الآن للمساهمة
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  )
}
