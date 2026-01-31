import { Link } from 'react-router-dom'
import { Home, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Subtle crescent decoration */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
        <svg viewBox="0 0 200 200" className="h-[400px] w-[400px]" fill="currentColor">
          <path d="M100 10 C45 10 0 55 0 110 C0 165 45 200 100 200 C70 180 50 150 50 110 C50 70 70 40 100 10Z" />
        </svg>
      </div>

      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
        <AlertCircle className="h-10 w-10 text-primary" />
      </div>

      {/* 404 Number */}
      <h1 className="mb-2 text-6xl font-bold text-primary md:text-8xl">404</h1>

      {/* Message */}
      <h2 className="mb-4 text-xl font-semibold text-foreground md:text-2xl">
        الصفحة غير موجودة
      </h2>

      <p className="not-found-fade-in mb-8 max-w-md text-muted-foreground">
        عذراً، الصفحة التي تبحث عنها غير موجودة أو قد تم نقلها إلى مكان آخر.
      </p>

      {/* Back to Home */}
      <Button asChild size="lg" className="gap-2">
        <Link to="/">
          <Home className="h-5 w-5" />
          العودة للصفحة الرئيسية
        </Link>
      </Button>
    </div>
  )
}
