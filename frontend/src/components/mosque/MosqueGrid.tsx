import { useState, useEffect, useCallback, useRef } from 'react'
import { SearchX, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'
import { MosqueCard } from './MosqueCard'
import { MosqueCardSkeleton } from './MosqueCardSkeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toArabicNum } from '@/lib/arabic-utils'
import type { Mosque } from '@/types'

/** How many cards to show initially / per "show more" tap */
const INITIAL_COUNT = 8
const INCREMENT = 8

interface MosqueGridProps {
  mosques: Mosque[]
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  onReset?: () => void
  isProximitySorted?: boolean
}

export function MosqueGrid({
  mosques,
  isLoading = false,
  isError = false,
  isEmpty = false,
  onReset,
  isProximitySorted = false,
}: MosqueGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const [isRevealing, setIsRevealing] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(INITIAL_COUNT)

  // Reset visible count when the mosque list changes (search, filter, proximity)
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT)
    prevCountRef.current = INITIAL_COUNT
  }, [mosques])

  const totalCount = mosques.length
  const hasMore = visibleCount < totalCount
  const remaining = totalCount - visibleCount
  const visibleMosques = mosques.slice(0, visibleCount)

  const handleShowMore = useCallback(() => {
    setIsRevealing(true)
    prevCountRef.current = visibleCount
    // Small delay so the button shows a brief loading state before cards appear
    requestAnimationFrame(() => {
      setVisibleCount((prev) => Math.min(prev + INCREMENT, totalCount))
      // Clear revealing state after animations finish
      setTimeout(() => setIsRevealing(false), 400)
    })
  }, [visibleCount, totalCount])

  const handleShowAll = useCallback(() => {
    setIsRevealing(true)
    prevCountRef.current = visibleCount
    requestAnimationFrame(() => {
      setVisibleCount(totalCount)
      setTimeout(() => setIsRevealing(false), 400)
    })
  }, [visibleCount, totalCount])

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <MosqueCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <EmptyState
        type="error"
        message="حدث خطأ أثناء تحميل البيانات"
        subtitle="الرجاء المحاولة لاحقاً"
        onReset={onReset}
      />
    )
  }

  // Empty state
  if (isEmpty || mosques.length === 0) {
    return (
      <EmptyState
        type="empty"
        message="لم يتم العثور على مساجد مطابقة للبحث"
        subtitle="جرّب تعديل كلمات البحث أو تغيير المنطقة"
        onReset={onReset}
        buttonText="إعادة ضبط البحث"
      />
    )
  }

  // Mosques grid with progressive reveal
  return (
    <div>
      <div
        ref={gridRef}
        className={cn(
          'grid grid-cols-1 gap-5 md:grid-cols-2',
          isProximitySorted && 'proximity-sorted'
        )}
      >
        {visibleMosques.map((mosque, index) => (
          <MosqueCard
            key={mosque.id}
            mosque={mosque}
            className={index >= prevCountRef.current ? 'animate-fade-in-up' : undefined}
          />
        ))}
      </div>

      {/* Show more section */}
      {hasMore && (
        <div className="relative mt-8">
          {/* Fade gradient hint — signals more content below */}
          <div className="pointer-events-none absolute -top-20 inset-x-0 h-20 bg-gradient-to-t from-background to-transparent" aria-hidden />

          {/* Show more button area */}
          <div className="flex flex-col items-center gap-4">
            {/* Ornamental divider */}
            <div className="flex w-full items-center gap-4" aria-hidden>
              <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
              <div className="h-1.5 w-1.5 rounded-full bg-accent/60" />
              <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            </div>

            {/* Count indicator */}
            <p className="text-sm text-muted-foreground">
              عرض {toArabicNum(Math.min(visibleCount, totalCount))} من {toArabicNum(totalCount)} مسجد
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleShowMore}
                disabled={isRevealing}
                className={cn(
                  'group h-11 gap-2 rounded-full px-6 text-sm font-bold',
                  'bg-primary text-white shadow-[0_2px_10px_rgba(13,75,51,0.2)]',
                  'transition-all duration-300',
                  'hover:shadow-[0_4px_16px_rgba(13,75,51,0.3)] hover:-translate-y-0.5',
                  'active:scale-[0.98]',
                )}
              >
                {isRevealing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
                )}
                عرض المزيد
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-semibold tabular-nums">
                  {toArabicNum(Math.min(remaining, INCREMENT))}
                </span>
              </Button>

              {remaining > INCREMENT && (
                <Button
                  variant="outline"
                  onClick={handleShowAll}
                  disabled={isRevealing}
                  className={cn(
                    'h-11 rounded-full border-border/60 px-5 text-sm font-medium',
                    'text-primary',
                    'transition-all duration-200',
                    'hover:border-accent/30 hover:bg-accent-light/50',
                    'active:scale-[0.98]',
                  )}
                >
                  عرض الكل ({toArabicNum(totalCount)})
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* End of list ornament — shown when all mosques are visible and list is substantial */}
      {!hasMore && totalCount > INITIAL_COUNT && (
        <div className="mt-8 flex items-center justify-center gap-3" aria-hidden>
          <div className="h-px w-12 bg-gradient-to-l from-accent/40 to-transparent" />
          <div className="flex gap-1">
            <div className="h-1 w-1 rounded-full bg-accent/40" />
            <div className="h-1 w-1 rounded-full bg-accent/60" />
            <div className="h-1 w-1 rounded-full bg-accent/40" />
          </div>
          <div className="h-px w-12 bg-gradient-to-r from-accent/40 to-transparent" />
        </div>
      )}
    </div>
  )
}

// Empty/Error state component
interface EmptyStateProps {
  type: 'empty' | 'error'
  message: string
  subtitle?: string
  onReset?: () => void
  buttonText?: string
}

function EmptyState({
  type,
  message,
  subtitle,
  onReset,
  buttonText = 'إعادة المحاولة',
}: EmptyStateProps) {
  const Icon = type === 'error' ? AlertTriangle : SearchX

  return (
    <div className="rounded-xl bg-white p-16 text-center shadow-card">
      <div className="mb-5 flex justify-center">
        <div className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full',
          type === 'error' ? 'bg-destructive/10' : 'bg-primary-light'
        )}>
          <Icon className={cn(
            'h-8 w-8',
            type === 'error' ? 'text-destructive' : 'text-primary'
          )} />
        </div>
      </div>

      <p className="mb-2 text-lg font-medium text-primary">{message}</p>
      {subtitle && (
        <p className="mb-5 text-sm text-muted-foreground">{subtitle}</p>
      )}

      {onReset && (
        <Button
          variant="ghost"
          onClick={onReset}
          className="text-primary hover:bg-primary-light"
        >
          {buttonText}
        </Button>
      )}
    </div>
  )
}
