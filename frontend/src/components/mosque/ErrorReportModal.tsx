import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { submitErrorReport } from '@/lib/api'
import { Loader2, CheckCircle } from 'lucide-react'

interface ErrorReportModalProps {
  isOpen: boolean
  onClose: () => void
  mosqueId: number
  mosqueName: string
}

const ERROR_TYPES = [
  { value: 'location', label: 'موقع المسجد غير صحيح' },
  { value: 'imam', label: 'معلومات الإمام غير محدثة' },
  { value: 'audio', label: 'الرابط الصوتي لا يعمل' },
  { value: 'other', label: 'أخرى' },
]

export function ErrorReportModal({
  isOpen,
  onClose,
  mosqueId,
  mosqueName,
}: ErrorReportModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [details, setDetails] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTypeChange = useCallback((type: string, checked: boolean) => {
    setSelectedTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type)
    )
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedTypes.length === 0) {
      setError('يرجى تحديد نوع الخطأ على الأقل')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await submitErrorReport({
        mosque_id: mosqueId,
        error_type: selectedTypes,
        error_details: details || undefined,
        reporter_email: email || undefined,
      })
      setIsSuccess(true)
    } catch {
      setError('حدث خطأ أثناء إرسال البلاغ. الرجاء المحاولة لاحقاً.')
    } finally {
      setIsSubmitting(false)
    }
  }, [mosqueId, selectedTypes, details, email])

  const handleClose = useCallback(() => {
    // Reset state on close
    setSelectedTypes([])
    setDetails('')
    setEmail('')
    setIsSuccess(false)
    setError(null)
    onClose()
  }, [onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        {isSuccess ? (
          // Success state
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
            <DialogTitle className="mb-2 text-xl text-primary">
              تم إرسال البلاغ بنجاح
            </DialogTitle>
            <DialogDescription className="mb-6">
              شكراً لمساعدتنا في تحسين الموقع
            </DialogDescription>
            <Button onClick={handleClose} className="bg-primary hover:bg-primary-dark">
              إغلاق
            </Button>
          </div>
        ) : (
          // Form state
          <>
            <DialogHeader>
              <DialogTitle className="text-destructive">
                ابلاغ عن خطأ في معلومات المسجد
              </DialogTitle>
              <DialogDescription>
                يرجى تحديد نوع الخطأ وإضافة أي معلومات إضافية عن "{mosqueName}"
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error types checkboxes */}
              <div className="space-y-3">
                {ERROR_TYPES.map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-3">
                    <Checkbox
                      id={value}
                      checked={selectedTypes.includes(value)}
                      onCheckedChange={(checked) =>
                        handleTypeChange(value, checked === true)
                      }
                    />
                    <label
                      htmlFor={value}
                      className="cursor-pointer text-sm leading-none"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              {/* Details textarea */}
              <div className="space-y-2">
                <label htmlFor="error_details" className="text-sm font-medium">
                  تفاصيل إضافية:
                </label>
                <Textarea
                  id="error_details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="أضف أي تفاصيل إضافية هنا..."
                />
              </div>

              {/* Email input */}
              <div className="space-y-2">
                <label htmlFor="reporter_email" className="text-sm font-medium">
                  البريد الإلكتروني (اختياري):
                </label>
                <Input
                  id="reporter_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-destructive hover:bg-destructive/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    'إرسال البلاغ'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
