import { Loader2, Navigation, Check, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProximityButtonProps {
  onClick: () => void
  isLoading?: boolean
  isActive?: boolean
  isSuccess?: boolean
  disabled?: boolean
}

export function ProximityButton({
  onClick,
  isLoading = false,
  isActive = false,
  isSuccess = false,
  disabled = false,
}: ProximityButtonProps) {
  const getIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    if (isSuccess) {
      return <Check className="h-4 w-4" />
    }
    return <Navigation className="h-4 w-4" />
  }

  const getText = () => {
    if (isLoading) {
      return 'جاري تحديد موقعك...'
    }
    if (isSuccess) {
      return 'تم الترتيب حسب الأقرب'
    }
    return 'الأقرب إليك'
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'h-10 min-w-36 gap-2 rounded-full border border-primary/30 px-5 font-medium transition-all duration-200',
        'hover:bg-primary/5 hover:border-primary/50',
        'active:scale-[0.97]',
        isActive && 'border-primary bg-primary text-white hover:bg-primary-dark hover:border-primary-dark hover:text-white',
        isSuccess && 'border-accent bg-accent-light text-primary-dark'
      )}
    >
      {getIcon()}
      <span className="button-text">{getText()}</span>
    </Button>
  )
}

// Location Permission Modal
interface LocationPermissionModalProps {
  isOpen: boolean
  onAllow: () => void
  onDeny: () => void
}

export function LocationPermissionModal({
  isOpen,
  onAllow,
  onDeny,
}: LocationPermissionModalProps) {
  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 transition-all duration-300',
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
      onClick={onDeny}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="mb-5 text-5xl text-accent">
          <MapPin className="mx-auto h-12 w-12" />
        </div>

        {/* Title */}
        <h3 className="mb-4 text-xl font-bold text-primary">
          السماح بتحديد موقعك
        </h3>

        {/* Description */}
        <p className="mb-6 leading-relaxed text-muted-foreground">
          لعرض المساجد الأقرب إليك، نحتاج إلى إذن للوصول إلى موقعك الحالي.
          سيتم استخدام هذه المعلومات فقط لترتيب المساجد حسب المسافة.
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={onAllow}
            className="min-w-24 rounded-full bg-primary px-6 hover:bg-primary-dark"
          >
            السماح
          </Button>
          <Button
            variant="secondary"
            onClick={onDeny}
            className="min-w-24 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
          >
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  )
}
