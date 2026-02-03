import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SuccessToastProps {
  id: string | number
  title: string
  subtitle?: string
  description?: string
}

function SuccessToastContent({ id, title, subtitle, description }: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50)
    const particleTimer = setTimeout(() => setShowParticles(true), 200)
    return () => {
      clearTimeout(timer)
      clearTimeout(particleTimer)
    }
  }, [])

  return (
    <div
      dir="rtl"
      onClick={() => toast.dismiss(id)}
      className={cn(
        'relative w-[320px] cursor-pointer overflow-hidden rounded-2xl transition-all duration-500 ease-out',
        'bg-gradient-to-bl from-primary via-primary to-emerald-800',
        'shadow-[0_20px_60px_-15px_rgba(13,75,51,0.5)]',
        isVisible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'translate-y-4 scale-95 opacity-0'
      )}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M40 0L80 40L40 80L0 40z' fill='none' stroke='%23ffffff' stroke-width='1'%3E%3C/path%3E%3Ccircle cx='40' cy='40' r='20' fill='none' stroke='%23ffffff' stroke-width='1'%3E%3C/circle%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Shimmer effect */}
      <div
        className={cn(
          'absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/20 to-transparent',
          isVisible && 'animate-[shimmer_1.5s_ease-out_0.3s_forwards]'
        )}
      />

      {/* Celebration particles */}
      {showParticles && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                background: i % 2 === 0 ? '#c4a052' : '#ffffff',
                left: `${15 + (i * 10)}%`,
                top: '50%',
                animation: `particle-float-${i % 4} 1.5s ease-out forwards`,
                animationDelay: `${i * 0.05}s`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-5">
        {/* Icon + Title row */}
        <div className="mb-3 flex items-center gap-3">
          {/* Animated checkmark circle */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            {/* Outer ring */}
            <div
              className={cn(
                'absolute inset-0 rounded-full border-2 border-white/30 transition-all duration-700',
                isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
              )}
            />
            {/* Inner filled circle */}
            <div
              className={cn(
                'absolute inset-1.5 rounded-full bg-white/20 backdrop-blur-sm transition-all duration-500 delay-150',
                isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              )}
            />
            {/* Checkmark SVG */}
            <svg
              viewBox="0 0 24 24"
              className={cn(
                'relative h-5 w-5 text-white transition-all duration-300 delay-300',
                isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M5 13l4 4L19 7"
                className={cn(
                  'transition-all duration-500 delay-400',
                  isVisible ? '[stroke-dashoffset:0]' : '[stroke-dashoffset:30]'
                )}
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: isVisible ? 0 : 30,
                  transition: 'stroke-dashoffset 0.5s ease-out 0.4s',
                }}
              />
            </svg>
          </div>

          {/* Title */}
          <div className="min-w-0">
            <p
              className={cn(
                'text-lg font-bold text-white transition-all duration-500 delay-200',
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              )}
            >
              {title}
            </p>
            {subtitle && (
              <p
                className={cn(
                  'mt-0.5 text-sm text-white/70 transition-all duration-500 delay-300',
                  isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-sm leading-relaxed text-white/80 transition-all duration-500 delay-400',
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}
          >
            {description}
          </p>
        )}

        {/* Bottom accent line */}
        <div
          className={cn(
            'mt-4 h-0.5 rounded-full bg-gradient-to-l from-transparent via-accent/60 to-transparent transition-all duration-700 delay-500',
            isVisible ? 'w-full opacity-100' : 'w-0 opacity-0'
          )}
        />
      </div>
    </div>
  )
}

// Export a function to show the success toast
export function showSuccessToast({
  title,
  subtitle,
  description,
  duration = 5000,
}: Omit<SuccessToastProps, 'id'> & { duration?: number }) {
  toast.custom(
    (id) => (
      <SuccessToastContent
        id={id}
        title={title}
        subtitle={subtitle}
        description={description}
      />
    ),
    {
      duration,
      // Remove default styling
      unstyled: true,
    }
  )
}
