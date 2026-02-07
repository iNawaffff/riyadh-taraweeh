import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Loader2, Send, Building2, RefreshCw, AlertTriangle, CheckCircle2, Search, UserPlus, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAuth } from '@/hooks/use-auth'
import { useMosques, useLocations } from '@/hooks/use-mosques'
import { useImamSearch } from '@/hooks/use-transfers'
import { useSubmitRequest, useCheckDuplicate } from '@/hooks/use-requests'
import { AREAS } from '@/lib/constants'

// UI-only type — never sent to backend
type UIRequestType = 'new_mosque' | 'imam_change'

const REQUEST_TYPES = [
  {
    id: 'new_mosque' as UIRequestType,
    title: 'مسجد جديد',
    description: 'أضف مسجداً غير موجود في الدليل',
    icon: Building2,
  },
  {
    id: 'imam_change' as UIRequestType,
    title: 'تغيير إمام',
    description: 'بلّغ عن تغيير إمام التراويح لمسجد موجود',
    icon: RefreshCw,
  },
] as const

const ARABIC_REGEX = /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s\d٠-٩.,،؟!؛:()\-]*$/

function isArabicOnly(text: string): boolean {
  return !text || ARABIC_REGEX.test(text)
}

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function RequestPageSkeleton() {
  return (
    <div className="container max-w-2xl py-4 sm:py-8 md:py-12 px-4">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col items-center text-center">
        <Skeleton className="mb-4 h-14 w-14 rounded-2xl" />
        <Skeleton className="mb-2 h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Request type radio cards */}
      <div className="mb-4 sm:mb-6 space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-border/50 bg-white p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 ring-1 ring-border/50">
        <Skeleton className="mb-5 h-5 w-28" />

        {/* Form fields */}
        <div className="space-y-4">
          {/* Field 1 */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          {/* Field 2 */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          {/* Field 3 */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          {/* Field 4 */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>

        {/* Separator + optional section */}
        <div className="mt-6 border-t border-border/30 pt-5">
          <Skeleton className="mb-4 h-4 w-36" />
          <div className="mb-4 flex gap-4">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>

        {/* Notes textarea */}
        <div className="mt-5 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>

      {/* Submit area */}
      <div className="mt-4 sm:mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-32 self-center sm:self-auto" />
        <Skeleton className="h-11 w-full rounded-xl sm:w-36" />
      </div>
    </div>
  )
}

export function RequestPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const submitRequest = useSubmitRequest()

  // Form state
  const [requestType, setRequestType] = useState<UIRequestType>('new_mosque')
  // new_mosque fields
  const [mosqueName, setMosqueName] = useState('')
  const [mosqueArea, setMosqueArea] = useState('')
  const [mosqueLocation, setMosqueLocation] = useState('')
  const [mosqueMapLink, setMosqueMapLink] = useState('')
  // new_mosque optional imam
  const [imamSource, setImamSource] = useState<'new' | 'existing'>('new')
  const [imamName, setImamName] = useState('')
  const [imamYoutubeLink, setImamYoutubeLink] = useState('')
  const [existingImamId, setExistingImamId] = useState<number | null>(null)
  const [existingImamName, setExistingImamName] = useState('')
  // imam_change fields
  const [targetMosqueId, setTargetMosqueId] = useState<number | null>(null)
  const [targetMosqueName, setTargetMosqueName] = useState('')
  const [imamMode, setImamMode] = useState<'existing' | 'new'>('existing')
  const [changeImamName, setChangeImamName] = useState('')
  const [changeImamYoutubeLink, setChangeImamYoutubeLink] = useState('')
  const [changeExistingImamId, setChangeExistingImamId] = useState<number | null>(null)
  const [changeExistingImamName, setChangeExistingImamName] = useState('')
  // shared
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Combobox open states
  const [mosqueOpen, setMosqueOpen] = useState(false)
  const [imamOpen, setImamOpen] = useState(false)
  const [changeImamOpen, setChangeImamOpen] = useState(false)

  // Imam search (for both new_mosque existing imam and imam_change existing imam)
  const [imamSearchQuery, setImamSearchQuery] = useState('')
  const { data: imamResults } = useImamSearch(imamSearchQuery)
  const [changeImamSearchQuery, setChangeImamSearchQuery] = useState('')
  const { data: changeImamResults } = useImamSearch(changeImamSearchQuery)

  // Mosque list for combobox
  const { data: allMosques } = useMosques()

  // Locations filtered by selected area
  const { data: locations = [] } = useLocations(mosqueArea || undefined)

  // Duplicate detection
  const debouncedMosqueName = useDebounced(mosqueName, 500)
  const { data: mosqueDuplicates } = useCheckDuplicate('mosque', debouncedMosqueName)

  // Filter mosques for combobox
  const [mosqueFilter, setMosqueFilter] = useState('')
  const filteredMosques = useMemo(() => {
    if (!allMosques) return []
    if (!mosqueFilter) return allMosques.slice(0, 50)
    const q = mosqueFilter.toLowerCase()
    return allMosques.filter(m => m.name.toLowerCase().includes(q)).slice(0, 50)
  }, [allMosques, mosqueFilter])

  // Current imam of selected mosque (for imam_change)
  const selectedMosqueImam = useMemo(() => {
    if (!targetMosqueId || !allMosques) return null
    return allMosques.find(m => m.id === targetMosqueId)?.imam || null
  }, [targetMosqueId, allMosques])

  const resetForm = () => {
    setMosqueName('')
    setMosqueArea('')
    setMosqueLocation('')
    setMosqueMapLink('')
    setImamName('')
    setImamYoutubeLink('')
    setImamSource('new')
    setExistingImamId(null)
    setExistingImamName('')
    setTargetMosqueId(null)
    setTargetMosqueName('')
    setImamMode('existing')
    setChangeImamName('')
    setChangeImamYoutubeLink('')
    setChangeExistingImamId(null)
    setChangeExistingImamName('')
    setNotes('')
  }

  const handleTypeChange = (type: UIRequestType) => {
    setRequestType(type)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data: Record<string, unknown> = {}

    if (requestType === 'new_mosque') {
      if (!mosqueName.trim()) return toast.error('اسم المسجد مطلوب')
      if (!isArabicOnly(mosqueName.trim())) return toast.error('اسم المسجد يجب أن يكون بالعربية فقط')
      if (!mosqueArea) return toast.error('المنطقة مطلوبة')
      if (!mosqueLocation) return toast.error('الحي مطلوب')
      data.request_type = 'new_mosque'
      data.mosque_name = mosqueName.trim()
      data.mosque_area = mosqueArea
      data.mosque_location = mosqueLocation
      data.mosque_map_link = mosqueMapLink.trim() || undefined
      // Imam info (optional) — can be new or existing
      data.imam_source = imamSource
      if (imamSource === 'existing' && existingImamId) {
        data.existing_imam_id = existingImamId
      } else if (imamName.trim()) {
        if (!isArabicOnly(imamName.trim())) return toast.error('اسم الإمام يجب أن يكون بالعربية فقط')
        data.imam_name = imamName.trim()
        data.imam_youtube_link = imamYoutubeLink.trim() || undefined
      }
    } else if (requestType === 'imam_change') {
      if (!targetMosqueId) return toast.error('اختر المسجد')
      data.target_mosque_id = targetMosqueId

      if (imamMode === 'existing') {
        // User picked an existing imam from search
        if (!changeExistingImamId) return toast.error('اختر الإمام')
        data.request_type = 'imam_transfer'
        data.imam_source = 'existing'
        data.existing_imam_id = changeExistingImamId
      } else {
        // User typed a new imam name
        if (!changeImamName.trim()) return toast.error('اسم الإمام مطلوب')
        if (!isArabicOnly(changeImamName.trim())) return toast.error('اسم الإمام يجب أن يكون بالعربية فقط')
        data.request_type = 'new_imam'
        data.imam_source = 'new'
        data.imam_name = changeImamName.trim()
        data.imam_youtube_link = changeImamYoutubeLink.trim() || undefined
      }
    }

    data.notes = notes.trim() || undefined

    try {
      await submitRequest.mutateAsync(data)
      setSubmitted(true)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  if (authLoading) {
    return (
      <>
        <Helmet><title>إضافة طلب - أئمة التراويح</title></Helmet>
        <RequestPageSkeleton />
      </>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <Helmet><title>إضافة طلب - أئمة التراويح</title></Helmet>
        <div className="container max-w-2xl py-16 text-center px-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
            <Send className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-foreground">إضافة طلب جديد</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            يجب تسجيل الدخول لإرسال طلب
          </p>
        </div>
      </>
    )
  }

  if (submitted) {
    return (
      <>
        <Helmet><title>تم إرسال الطلب - أئمة التراويح</title></Helmet>
        <div className="container max-w-2xl py-16 text-center px-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-foreground">تم إرسال طلبك بنجاح</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            سنقوم بمراجعة طلبك في أقرب وقت ممكن. يمكنك متابعة حالة طلباتك من صفحة طلباتي.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => setSubmitted(false)} className="w-full sm:w-auto">
              إرسال طلب آخر
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/my-requests">عرض طلباتي</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet><title>إضافة طلب - أئمة التراويح</title></Helmet>

      <div className="container max-w-2xl py-4 sm:py-8 md:py-12 px-4 animate-fade-in-up">
        {/* Page header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
            <Send className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">إضافة طلب جديد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ساهم في تحديث بيانات أئمة التراويح في الرياض
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Step 1: Request type selector */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground">نوع الطلب</label>
            <RadioGroup
              value={requestType}
              onValueChange={(v: string) => handleTypeChange(v as UIRequestType)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {REQUEST_TYPES.map((rt) => {
                const Icon = rt.icon
                const isSelected = requestType === rt.id
                return (
                  <label key={rt.id} htmlFor={`type-${rt.id}`} className="cursor-pointer">
                    <div className={`relative rounded-2xl border-2 p-4 transition-all ${
                      isSelected
                        ? 'border-accent bg-accent/5 shadow-md'
                        : 'border-border/50 bg-white hover:border-accent/30'
                    }`}>
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={rt.id} id={`type-${rt.id}`} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${isSelected ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
                            <span className="text-sm font-bold text-foreground">{rt.title}</span>
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">{rt.description}</p>
                        </div>
                      </div>
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          {/* Step 2: Conditional fields */}
          <div className="rounded-2xl bg-white p-4 sm:p-6 ring-1 ring-border/50">
            {requestType === 'new_mosque' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-foreground">معلومات المسجد</h3>

                {/* Mosque name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/70">
                    اسم المسجد <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={mosqueName}
                    onChange={(e) => setMosqueName(e.target.value)}
                    placeholder="جامع الراجحي"
                    className="h-11 bg-muted/30"
                    required
                  />
                  {/* Duplicate warning */}
                  {mosqueDuplicates?.matches && mosqueDuplicates.matches.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-bold text-amber-800">هل تقصد أحد هذه المساجد؟</span>
                      </div>
                      {mosqueDuplicates.matches.map((m) => (
                        <p key={m.id} className="text-xs text-amber-700">
                          {m.name} — حي {m.location}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Area */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/70">
                    المنطقة <span className="text-red-400">*</span>
                  </label>
                  <Select value={mosqueArea} onValueChange={(v) => { setMosqueArea(v); setMosqueLocation('') }}>
                    <SelectTrigger className="h-11 bg-muted/30">
                      <SelectValue placeholder="اختر المنطقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {AREAS.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/70">
                    الحي <span className="text-red-400">*</span>
                  </label>
                  <Select value={mosqueLocation} onValueChange={setMosqueLocation}>
                    <SelectTrigger className="h-11 bg-muted/30">
                      <SelectValue placeholder={mosqueArea ? 'اختر الحي' : 'اختر المنطقة أولاً'} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Map link */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/70">رابط خرائط جوجل</label>
                  <Input
                    value={mosqueMapLink}
                    onChange={(e) => setMosqueMapLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="h-11 bg-muted/30"
                    dir="ltr"
                  />
                </div>

                {/* Imam info (optional) */}
                <div className="mt-6 border-t border-border/30 pt-5">
                  <h4 className="mb-4 text-sm font-bold text-foreground/80">معلومات الإمام (اختياري)</h4>

                  {/* Imam source radio */}
                  <div className="mb-4 space-y-2">
                    <RadioGroup
                      value={imamSource}
                      onValueChange={(v: string) => {
                        setImamSource(v as 'new' | 'existing')
                        setExistingImamId(null)
                        setExistingImamName('')
                        setImamName('')
                        setImamYoutubeLink('')
                      }}
                      className="flex flex-wrap gap-4"
                    >
                      <label htmlFor="mosque-imam-new" className="flex cursor-pointer items-center gap-2">
                        <RadioGroupItem value="new" id="mosque-imam-new" />
                        <span className="text-sm text-foreground/80">إمام جديد</span>
                      </label>
                      <label htmlFor="mosque-imam-existing" className="flex cursor-pointer items-center gap-2">
                        <RadioGroupItem value="existing" id="mosque-imam-existing" />
                        <span className="text-sm text-foreground/80">إمام موجود في المنصة</span>
                      </label>
                    </RadioGroup>
                  </div>

                  {imamSource === 'existing' ? (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground/70">البحث عن إمام</label>
                      <Popover open={imamOpen} onOpenChange={setImamOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="h-11 w-full justify-between bg-muted/30 font-normal"
                          >
                            {existingImamName || 'ابحث عن إمام...'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command dir="rtl">
                            <CommandInput
                              placeholder="اسم الإمام..."
                              value={imamSearchQuery}
                              onValueChange={setImamSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>لم يتم العثور على نتائج</CommandEmpty>
                              <CommandGroup>
                                {imamResults?.map((imam) => (
                                  <CommandItem
                                    key={imam.id}
                                    value={imam.name}
                                    onSelect={() => {
                                      setExistingImamId(imam.id)
                                      setExistingImamName(imam.name)
                                      setImamOpen(false)
                                    }}
                                  >
                                    <span>{imam.name}</span>
                                    {imam.mosque_name && (
                                      <span className="mr-auto text-xs text-muted-foreground">{imam.mosque_name}</span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground/70">اسم الإمام</label>
                        <Input
                          value={imamName}
                          onChange={(e) => setImamName(e.target.value)}
                          placeholder="الشيخ عبدالله..."
                          className="h-11 bg-muted/30"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground/70">رابط يوتيوب أو مقطع صوتي</label>
                        <Input
                          value={imamYoutubeLink}
                          onChange={(e) => setImamYoutubeLink(e.target.value)}
                          placeholder="https://youtube.com/watch?v=..."
                          className="h-11 bg-muted/30"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {requestType === 'imam_change' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-foreground">تغيير إمام</h3>

                {/* Target mosque combobox */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/70">
                    المسجد <span className="text-red-400">*</span>
                  </label>
                  <Popover open={mosqueOpen} onOpenChange={setMosqueOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="h-11 w-full justify-between bg-muted/30 font-normal"
                      >
                        {targetMosqueName || 'اختر المسجد...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command dir="rtl">
                        <CommandInput
                          placeholder="ابحث عن مسجد..."
                          value={mosqueFilter}
                          onValueChange={setMosqueFilter}
                        />
                        <CommandList>
                          <CommandEmpty>لم يتم العثور على نتائج</CommandEmpty>
                          <CommandGroup>
                            {filteredMosques.map((m) => (
                              <CommandItem
                                key={m.id}
                                value={m.name}
                                onSelect={() => {
                                  setTargetMosqueId(m.id)
                                  setTargetMosqueName(m.name)
                                  setMosqueOpen(false)
                                }}
                              >
                                <span>{m.name}</span>
                                <span className="mr-auto text-xs text-muted-foreground">حي {m.location}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Current imam info box */}
                  {targetMosqueId && selectedMosqueImam && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <div className="flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                        <span className="text-xs text-sky-800">
                          الإمام الحالي: <strong>{selectedMosqueImam}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Imam selection with toggle */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground/70">
                    الإمام الجديد <span className="text-red-400">*</span>
                  </label>

                  {imamMode === 'existing' ? (
                    <div>
                      <Popover open={changeImamOpen} onOpenChange={setChangeImamOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="h-11 w-full justify-between bg-muted/30 font-normal"
                          >
                            {changeExistingImamName || 'ابحث عن إمام...'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command dir="rtl">
                            <CommandInput
                              placeholder="اسم الإمام..."
                              value={changeImamSearchQuery}
                              onValueChange={setChangeImamSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>لم يتم العثور على نتائج</CommandEmpty>
                              <CommandGroup>
                                {changeImamResults?.map((imam) => (
                                  <CommandItem
                                    key={imam.id}
                                    value={imam.name}
                                    onSelect={() => {
                                      setChangeExistingImamId(imam.id)
                                      setChangeExistingImamName(imam.name)
                                      setChangeImamOpen(false)
                                    }}
                                  >
                                    <span>{imam.name}</span>
                                    {imam.mosque_name && (
                                      <span className="mr-auto text-xs text-muted-foreground">{imam.mosque_name}</span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Toggle to new imam */}
                      <button
                        type="button"
                        onClick={() => {
                          setImamMode('new')
                          setChangeExistingImamId(null)
                          setChangeExistingImamName('')
                          setChangeImamSearchQuery('')
                        }}
                        className="mt-2.5 flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        الإمام غير موجود؟ أضف اسمه
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="space-y-3">
                        <Input
                          value={changeImamName}
                          onChange={(e) => setChangeImamName(e.target.value)}
                          placeholder="الشيخ عبدالله..."
                          className="h-11 bg-muted/30"
                        />
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground/70">رابط يوتيوب (اختياري)</label>
                          <Input
                            value={changeImamYoutubeLink}
                            onChange={(e) => setChangeImamYoutubeLink(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="h-11 bg-muted/30"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* Toggle to search existing */}
                      <button
                        type="button"
                        onClick={() => {
                          setImamMode('existing')
                          setChangeImamName('')
                          setChangeImamYoutubeLink('')
                        }}
                        className="mt-2.5 flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
                      >
                        <Search className="h-3.5 w-3.5" />
                        البحث في الأئمة الموجودين
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes (all types) */}
            <div className="mt-5 space-y-1.5">
              <label className="text-sm font-medium text-foreground/70">ملاحظات إضافية</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي معلومات إضافية تود مشاركتها..."
                rows={3}
                maxLength={500}
                className="bg-muted/30"
              />
              {notes.length > 0 && (
                <p className="text-[11px] text-muted-foreground">{notes.length}/500</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/my-requests" className="text-center text-sm text-primary hover:underline sm:text-start">
              عرض طلباتي السابقة
            </Link>
            <Button
              type="submit"
              disabled={submitRequest.isPending}
              className="h-11 w-full gap-2 rounded-xl px-8 sm:w-auto"
            >
              {submitRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              إرسال الطلب
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
