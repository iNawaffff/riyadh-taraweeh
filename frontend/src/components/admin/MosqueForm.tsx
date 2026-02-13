import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { MapPin, Loader2, AlertTriangle } from 'lucide-react'
import { extractCoordsFromMapLink } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AudioPipeline from '@/components/admin/AudioPipeline'
import LocationCombobox from '@/components/admin/LocationCombobox'
import ImamCombobox, { type ImamValue } from '@/components/admin/ImamCombobox'
import type { AdminMosque } from '@/types'

const areas = ['شمال', 'جنوب', 'شرق', 'غرب'] as const

export interface MosqueFormValues {
  name: string
  area: string
  location: string
  map_link: string
  latitude: number | null
  longitude: number | null
  imam_name: string
  existing_imam_id: number | null
  youtube_link: string
  audio_sample: string
}

interface MosqueFormProps {
  mosque?: AdminMosque | null
  onSubmit: (data: MosqueFormValues) => Promise<void>
  isSubmitting: boolean
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 font-tajawal text-xs text-red-500">{message}</p>
}

export default function MosqueForm({ mosque, onSubmit, isSubmitting }: MosqueFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<MosqueFormValues>({
    defaultValues: {
      name: mosque?.name ?? '',
      area: mosque?.area ?? '',
      location: mosque?.location ?? '',
      map_link: mosque?.map_link ?? '',
      latitude: mosque?.latitude ?? null,
      longitude: mosque?.longitude ?? null,
      imam_name: mosque?.imam_name ?? '',
      existing_imam_id: mosque?.imam_id ?? null,
      youtube_link: mosque?.youtube_link ?? '',
      audio_sample: mosque?.audio_sample ?? '',
    },
  })

  const [imamCurrentMosque, setImamCurrentMosque] = useState<string | null>(null)

  // Show warning if selected imam belongs to a different mosque
  const showImamWarning = imamCurrentMosque && watch('existing_imam_id') !== null
    && (!mosque || watch('existing_imam_id') !== mosque.imam_id)

  useEffect(() => {
    if (mosque) {
      reset({
        name: mosque.name,
        area: mosque.area,
        location: mosque.location,
        map_link: mosque.map_link ?? '',
        latitude: mosque.latitude,
        longitude: mosque.longitude,
        imam_name: mosque.imam_name ?? '',
        existing_imam_id: mosque.imam_id ?? null,
        youtube_link: mosque.youtube_link ?? '',
        audio_sample: mosque.audio_sample ?? '',
      })
    }
  }, [mosque, reset])

  const handleExtractCoords = () => {
    const mapLink = getValues('map_link')
    if (!mapLink) return
    const coords = extractCoordsFromMapLink(mapLink)
    if (coords) {
      setValue('latitude', coords.lat)
      setValue('longitude', coords.lng)
    }
  }

  const validate = (data: MosqueFormValues) => {
    const errs: Partial<Record<keyof MosqueFormValues, string>> = {}
    if (!data.name || data.name.length < 3) errs.name = 'اسم المسجد مطلوب (٣ أحرف على الأقل)'
    if (!data.area || !areas.includes(data.area as typeof areas[number])) errs.area = 'المنطقة مطلوبة'
    if (!data.location || data.location.length < 2) errs.location = 'الحي مطلوب'
    if (data.location?.startsWith('حي')) errs.location = 'لا تضف كلمة "حي" — تُضاف تلقائياً'
    if (data.imam_name && !data.imam_name.startsWith('الشيخ')) errs.imam_name = 'يجب أن يبدأ بـ "الشيخ"'
    return Object.keys(errs).length > 0 ? errs : null
  }

  const handleFormSubmit = async (data: MosqueFormValues) => {
    const validationErrors = validate(data)
    if (validationErrors) {
      Object.entries(validationErrors).forEach(([key, msg]) => {
        setError(key as keyof MosqueFormValues, { message: msg })
      })
      return
    }
    await onSubmit(data)
  }

  const inputClass = 'border-[#0d4b33]/10 font-tajawal focus-visible:ring-[#c4a052]/30'
  const labelClass = 'mb-1.5 block font-tajawal text-sm text-[#0d4b33]/70'

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Mosque Info Section */}
      <div className="rounded-xl border border-[#0d4b33]/[0.06] bg-white p-6 shadow-sm">
        <h3 className="mb-5 font-tajawal text-base font-bold text-[#0d4b33]">بيانات المسجد</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>اسم المسجد</label>
            <Input
              {...register('name', { required: 'اسم المسجد مطلوب', minLength: { value: 3, message: '٣ أحرف على الأقل' } })}
              placeholder="جامع الراجحي"
              className={inputClass}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div>
            <label className={labelClass}>المنطقة</label>
            <Select onValueChange={(val) => { setValue('area', val); setValue('location', '') }} value={watch('area')}>
              <SelectTrigger className={`${inputClass} focus:ring-[#c4a052]/30`}>
                <SelectValue placeholder="اختر المنطقة" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area} value={area} className="font-tajawal">{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.area?.message} />
          </div>

          <div>
            <label className={labelClass}>الحي</label>
            <LocationCombobox
              value={watch('location')}
              onChange={(val) => setValue('location', val, { shouldValidate: true })}
              area={watch('area')}
            />
            <FieldError message={errors.location?.message} />
          </div>

          <div>
            <label className={labelClass}>رابط الخريطة</label>
            <Input
              {...register('map_link')}
              placeholder="https://maps.google.com/..."
              className={inputClass}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Coordinates Section */}
      <div className="rounded-xl border border-[#0d4b33]/[0.06] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-tajawal text-base font-bold text-[#0d4b33]">الإحداثيات</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExtractCoords}
            className="border-[#c4a052]/30 font-tajawal text-xs text-[#c4a052] hover:bg-[#c4a052]/5"
          >
            <MapPin className="h-3.5 w-3.5" />
            استخراج من رابط الخريطة
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>خط العرض</label>
            <Input
              value={watch('latitude') ?? ''}
              onChange={(e) => setValue('latitude', e.target.value ? parseFloat(e.target.value) : null)}
              type="number"
              step="any"
              placeholder="24.7136"
              className={inputClass}
              dir="ltr"
            />
          </div>

          <div>
            <label className={labelClass}>خط الطول</label>
            <Input
              value={watch('longitude') ?? ''}
              onChange={(e) => setValue('longitude', e.target.value ? parseFloat(e.target.value) : null)}
              type="number"
              step="any"
              placeholder="46.6753"
              className={inputClass}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Imam Info Section */}
      <div className="rounded-xl border border-[#0d4b33]/[0.06] bg-white p-6 shadow-sm">
        <h3 className="mb-5 font-tajawal text-base font-bold text-[#0d4b33]">بيانات الإمام</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>اسم الإمام</label>
            <ImamCombobox
              value={{ id: watch('existing_imam_id'), name: watch('imam_name') }}
              onChange={({ id, name, mosqueName }: ImamValue) => {
                setValue('imam_name', name, { shouldValidate: true })
                setValue('existing_imam_id', id)
                setImamCurrentMosque(mosqueName ?? null)
              }}
            />
            <FieldError message={errors.imam_name?.message} />
            {showImamWarning && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <p className="flex items-center gap-1.5 font-tajawal text-xs text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span><strong>{imamCurrentMosque}</strong> سيصبح بدون إمام</span>
                </p>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>رابط يوتيوب</label>
            <Input
              {...register('youtube_link')}
              placeholder="https://youtube.com/..."
              className={inputClass}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Audio Section */}
      <AudioPipeline
        value={watch('audio_sample')}
        onChange={(url) => setValue('audio_sample', url)}
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#0d4b33] px-8 font-tajawal hover:bg-[#0d4b33]/90"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mosque ? 'حفظ التعديلات' : 'إضافة المسجد'}
        </Button>
      </div>
    </form>
  )
}
