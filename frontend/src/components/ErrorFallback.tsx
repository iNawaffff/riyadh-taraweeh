import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>

      {/* Title */}
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        حدث خطأ غير متوقع
      </h1>

      {/* Message */}
      <p className="mb-6 max-w-md text-muted-foreground">
        نعتذر عن هذا الخطأ. يرجى تحديث الصفحة أو المحاولة لاحقاً.
      </p>

      {/* Error details (development only) */}
      {import.meta.env.DEV && error && (
        <pre className="mb-6 max-w-lg overflow-auto rounded-lg bg-muted p-4 text-start text-xs text-muted-foreground">
          {error.message}
        </pre>
      )}

      {/* Retry button */}
      <Button
        onClick={() => {
          if (resetError) {
            resetError()
          } else {
            window.location.reload()
          }
        }}
        size="lg"
        className="gap-2"
      >
        <RefreshCw className="h-5 w-5" />
        تحديث الصفحة
      </Button>
    </div>
  )
}
