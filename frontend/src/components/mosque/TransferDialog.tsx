import { useState, useRef, useEffect } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useDebounce, useMediaQuery } from '@/hooks'
import { useImamSearch, useSubmitTransfer } from '@/hooks/use-transfers'
import { toast } from 'sonner'
import { showSuccessToast } from '@/components/ui/success-toast'
import { Loader2, Search, UserPlus, Check, X, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImamSearchResult } from '@/types'

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mosqueId: number
  mosqueName: string
}

export function TransferDialog({ open, onOpenChange, mosqueId, mosqueName }: TransferDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 640px)')

  const [mode, setMode] = useState<'search' | 'create'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedImam, setSelectedImam] = useState<ImamSearchResult | null>(null)
  const [newImamName, setNewImamName] = useState('')
  const [notes, setNotes] = useState('')

  const debouncedQuery = useDebounce(searchQuery, 300)
  const { data: imamResults = [], isLoading: isSearching } = useImamSearch(debouncedQuery)
  const submitMutation = useSubmitTransfer()
  const inputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setMode('search')
    setSearchQuery('')
    setSelectedImam(null)
    setNewImamName('')
    setNotes('')
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm()
    onOpenChange(isOpen)
  }

  const handleSubmit = async () => {
    const data: { mosque_id: number; new_imam_id?: number; new_imam_name?: string; notes?: string } = {
      mosque_id: mosqueId,
    }
    if (mode === 'search' && selectedImam) {
      data.new_imam_id = selectedImam.id
    } else if (mode === 'create' && newImamName.trim()) {
      data.new_imam_name = newImamName.trim()
    } else {
      toast.error('يجب تحديد الإمام الجديد')
      return
    }
    if (notes.trim()) data.notes = notes.trim()

    try {
      await submitMutation.mutateAsync(data)
      showSuccessToast({
        title: 'جزاك الله خيراً',
        subtitle: 'وكتبه في ميزان حسناتك',
        description: 'تم إرسال البلاغ للمراجعة — شكراً لمساهمتك في إثراء المنصة',
        duration: 5000,
      })
      resetForm()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const canSubmit = mode === 'search' ? !!selectedImam : !!newImamName.trim()

  // Auto-focus search input when dialog opens
  useEffect(() => {
    if (open && !selectedImam && mode === 'search') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, selectedImam, mode])

  const showResults = debouncedQuery.length >= 1 && !selectedImam && mode === 'search'

  const formContent = (
    <div className="flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
          !selectedImam && mode === 'search'
            ? 'bg-primary text-white'
            : selectedImam
              ? 'bg-green-500 text-white'
              : 'bg-muted text-muted-foreground'
        )}>
          {selectedImam ? <Check className="h-3 w-3" /> : '١'}
        </span>
        <span>اختيار الإمام</span>
        <ChevronLeft className="h-3 w-3" />
        <span className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
          selectedImam || (mode === 'create' && newImamName.trim())
            ? 'bg-primary text-white'
            : 'bg-muted text-muted-foreground'
        )}>٢</span>
        <span>إرسال</span>
      </div>

      {/* Imam Selection */}
      {mode === 'search' ? (
        <div>
          {selectedImam ? (
            <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3">
              <div className="min-w-0">
                <p className="font-semibold text-green-800">{selectedImam.name}</p>
                {selectedImam.mosque_name && (
                  <p className="mt-0.5 truncate text-sm text-green-600">{selectedImam.mosque_name}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedImam(null)
                  setSearchQuery('')
                  setTimeout(() => inputRef.current?.focus(), 50)
                }}
                className="me-1 shrink-0 rounded-full p-1.5 text-green-600 transition-colors hover:bg-green-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="اكتب اسم الإمام الجديد..."
                  className="pe-10 text-right"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>

              {/* Results dropdown */}
              {showResults && (
                <div className="mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-xl border bg-white shadow-lg">
                  {isSearching ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري البحث...</span>
                    </div>
                  ) : imamResults.length > 0 ? (
                    imamResults.map((imam) => (
                      <button
                        key={imam.id}
                        type="button"
                        onClick={() => {
                          setSelectedImam(imam)
                          setSearchQuery('')
                        }}
                        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-right transition-colors hover:bg-primary-light active:bg-primary/10"
                      >
                        <span className="font-medium">{imam.name}</span>
                        {imam.mosque_name && (
                          <span className="shrink-0 text-xs text-muted-foreground">{imam.mosque_name}</span>
                        )}
                      </button>
                    ))
                  ) : debouncedQuery.length >= 2 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      لم يتم العثور على نتائج
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setMode('create')
              setSearchQuery('')
            }}
            className="mt-2 flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary-dark"
          >
            <UserPlus className="h-3.5 w-3.5" />
            الإمام غير موجود بالنظام؟ أضف اسمه
          </button>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium">اسم الإمام الجديد</label>
          <Input
            value={newImamName}
            onChange={(e) => setNewImamName(e.target.value)}
            placeholder="مثال: الشيخ محمد العبدالله"
            className="text-right"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setMode('search')
              setNewImamName('')
            }}
            className="mt-2 flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary-dark"
          >
            <Search className="h-3.5 w-3.5" />
            البحث في الأئمة الموجودين
          </button>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">ملاحظات <span className="text-muted-foreground">(اختياري)</span></label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="مثال: الإمام السابق انتقل لمسجد آخر"
          rows={2}
          className="resize-none text-right"
          maxLength={500}
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitMutation.isPending}
        className="w-full gap-2 rounded-xl py-5 text-base"
        size="lg"
      >
        {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        إرسال البلاغ
      </Button>
    </div>
  )

  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="px-0 text-right">
            <DrawerTitle>الإبلاغ عن تغيير إمام</DrawerTitle>
            <DrawerDescription>{mosqueName}</DrawerDescription>
          </DrawerHeader>
          {formContent}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md gap-5">
        <DialogHeader>
          <DialogTitle>الإبلاغ عن تغيير إمام</DialogTitle>
          <DialogDescription>{mosqueName}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
