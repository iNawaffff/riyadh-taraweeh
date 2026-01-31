import { Loader2 } from 'lucide-react'

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  )
}
