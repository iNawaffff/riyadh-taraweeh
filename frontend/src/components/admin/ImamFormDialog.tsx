import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminMosques } from '@/hooks/use-admin'
import type { AdminImam } from '@/types'

interface ImamFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imam?: AdminImam | null
  onSubmit: (data: {
    name: string
    mosque_id: number | null
    audio_sample: string
    youtube_link: string
  }) => Promise<void>
  isSubmitting: boolean
}

export default function ImamFormDialog({
  open,
  onOpenChange,
  imam,
  onSubmit,
  isSubmitting,
}: ImamFormDialogProps) {
  const [name, setName] = useState('')
  const [mosqueId, setMosqueId] = useState<string>('none')
  const [audioSample, setAudioSample] = useState('')
  const [youtubeLink, setYoutubeLink] = useState('')

  const { data: mosquesData } = useAdminMosques({ page: 1, search: '' })

  useEffect(() => {
    if (open) {
      setName(imam?.name || '')
      setMosqueId(imam?.mosque_id ? String(imam.mosque_id) : 'none')
      setAudioSample(imam?.audio_sample || '')
      setYoutubeLink(imam?.youtube_link || '')
    }
  }, [open, imam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit({
      name: name.trim(),
      mosque_id: mosqueId !== 'none' ? Number(mosqueId) : null,
      audio_sample: audioSample.trim(),
      youtube_link: youtubeLink.trim(),
    })
  }

  const isEdit = !!imam

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-tajawal sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-tajawal text-[#0d4b33]">
            {isEdit ? 'تعديل إمام' : 'إضافة إمام'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="font-tajawal text-sm text-[#0d4b33]/60">
              اسم الإمام <span className="text-red-400">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الشيخ عبدالله..."
              className="border-[#0d4b33]/10 font-tajawal focus-visible:ring-[#c4a052]/30"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-tajawal text-sm text-[#0d4b33]/60">
              المسجد (اختياري)
            </label>
            <Select value={mosqueId} onValueChange={setMosqueId}>
              <SelectTrigger className="border-[#0d4b33]/10 font-tajawal text-sm">
                <SelectValue placeholder="بدون مسجد" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="none" className="font-tajawal">بدون مسجد</SelectItem>
                {mosquesData?.items.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)} className="font-tajawal text-sm">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="font-tajawal text-sm text-[#0d4b33]/60">
              رابط الملف الصوتي (اختياري)
            </label>
            <Input
              value={audioSample}
              onChange={(e) => setAudioSample(e.target.value)}
              placeholder="https://imams-riyadh-audio.s3..."
              className="border-[#0d4b33]/10 font-tajawal text-sm focus-visible:ring-[#c4a052]/30"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-tajawal text-sm text-[#0d4b33]/60">
              رابط يوتيوب (اختياري)
            </label>
            <Input
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="border-[#0d4b33]/10 font-tajawal text-sm focus-visible:ring-[#c4a052]/30"
              dir="ltr"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-tajawal"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-[#0d4b33] font-tajawal hover:bg-[#0d4b33]/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
