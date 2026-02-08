import { useState, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Star,
  Building2,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import AudioPipeline from '@/components/admin/AudioPipeline'
import LocationCombobox from '@/components/admin/LocationCombobox'
import { AREAS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useAdminRequests,
  useAdminRequest,
  useApproveRequest,
  useRejectRequest,
  useNeedsInfoRequest,
} from '@/hooks/use-requests'
import type { AdminCommunityRequest, RequestStatus, RequestType } from '@/types'

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: 'معلق', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'مقبول', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'مرفوض', className: 'bg-red-50 text-red-700 border-red-200' },
  needs_info: { label: 'يحتاج معلومات', className: 'bg-blue-50 text-blue-700 border-blue-200' },
}

const TYPE_CONFIG: Record<RequestType, { label: string; icon: typeof Building2; className: string }> = {
  new_mosque: { label: 'مسجد جديد', icon: Building2, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  new_imam: { label: 'تغيير إمام', icon: RefreshCw, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  imam_transfer: { label: 'تغيير إمام', icon: RefreshCw, className: 'bg-purple-50 text-purple-700 border-purple-200' },
}

function RequestDetail({ request: listRequest, onClose }: {
  request: AdminCommunityRequest
  onClose: () => void
}) {
  // Fetch full detail data (includes impact warnings, existing imam name, etc.)
  const { data: detailData } = useAdminRequest(listRequest.id)
  const request = detailData ?? listRequest

  const approveMutation = useApproveRequest()
  const rejectMutation = useRejectRequest()
  const needsInfoMutation = useNeedsInfoRequest()
  const [rejectReason, setRejectReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showNeedsInfoDialog, setShowNeedsInfoDialog] = useState(false)
  // Editable fields for approval
  const [mosqueName, setMosqueName] = useState(listRequest.mosque_name || '')
  const [mosqueArea, setMosqueArea] = useState(listRequest.mosque_area || '')
  const [mosqueLocation, setMosqueLocation] = useState(listRequest.mosque_location || '')
  const [imamName, setImamName] = useState(listRequest.imam_name || '')
  const [audioSample, setAudioSample] = useState('')

  const isPending = request.status === 'pending' || request.status === 'needs_info'

  const handleApprove = async () => {
    try {
      const overrides: Record<string, unknown> = {}
      if (request.request_type === 'new_mosque') {
        overrides.mosque_name = mosqueName
        overrides.mosque_area = mosqueArea
        overrides.mosque_location = mosqueLocation
        overrides.mosque_map_link = request.mosque_map_link
        if (imamName) overrides.imam_name = imamName
        if (request.imam_youtube_link) overrides.imam_youtube_link = request.imam_youtube_link
      } else {
        if (imamName) overrides.imam_name = imamName
      }
      if (audioSample) overrides.audio_sample = audioSample
      if (adminNotes) overrides.admin_notes = adminNotes
      await approveMutation.mutateAsync({ id: request.id, overrides })
      toast.success('تمت الموافقة على الطلب')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({
        id: request.id,
        reason: rejectReason || undefined,
        adminNotes: adminNotes || undefined,
      })
      toast.success('تم رفض الطلب')
      setShowRejectDialog(false)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const handleNeedsInfo = async () => {
    try {
      await needsInfoMutation.mutateAsync({
        id: request.id,
        adminNotes,
      })
      toast.success('تم تحديث حالة الطلب')
      setShowNeedsInfoDialog(false)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <>
      <div className="space-y-5 py-4">
        {/* Submitter info */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#0d4b33]/60">مقدم الطلب:</span>
          <span className="text-sm font-bold text-[#0d4b33]">{request.submitter_name}</span>
          {request.submitter_trust_level === 'trusted' && (
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          )}
        </div>

        {/* Type */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#0d4b33]/60">النوع:</span>
          <Badge variant="outline" className={TYPE_CONFIG[request.request_type].className}>
            {TYPE_CONFIG[request.request_type].label}
          </Badge>
        </div>

        {/* Fields based on type */}
        {request.request_type === 'new_mosque' && (
          <div className="space-y-3 rounded-xl border border-[#0d4b33]/[0.06] p-4">
            <h4 className="text-sm font-bold text-[#0d4b33]">معلومات المسجد</h4>
            {isPending ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-[#0d4b33]/60">اسم المسجد</label>
                  <Input value={mosqueName} onChange={(e) => setMosqueName(e.target.value)} className="font-tajawal text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#0d4b33]/60">المنطقة</label>
                  <Select value={mosqueArea} onValueChange={(val) => { setMosqueArea(val); setMosqueLocation('') }}>
                    <SelectTrigger className="font-tajawal text-sm">
                      <SelectValue placeholder="اختر المنطقة" />
                    </SelectTrigger>
                    <SelectContent className="font-tajawal">
                      {AREAS.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#0d4b33]/60">الحي</label>
                  <LocationCombobox
                    value={mosqueLocation}
                    onChange={setMosqueLocation}
                    area={mosqueArea}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm"><span className="text-[#0d4b33]/60">الاسم:</span> {request.mosque_name}</p>
                <p className="text-sm"><span className="text-[#0d4b33]/60">المنطقة:</span> {request.mosque_area}</p>
                <p className="text-sm"><span className="text-[#0d4b33]/60">الحي:</span> {request.mosque_location}</p>
              </>
            )}
            {request.mosque_map_link && (
              <a href={request.mosque_map_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline" dir="ltr">
                رابط خرائط جوجل
              </a>
            )}
          </div>
        )}

        {request.request_type !== 'new_mosque' && request.target_mosque_name && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#0d4b33]/60">المسجد:</span>
            <span className="text-sm font-bold text-[#0d4b33]">{request.target_mosque_name}</span>
          </div>
        )}

        {/* Imam info */}
        {(request.imam_name || request.existing_imam_name) && (
          <div className="space-y-3 rounded-xl border border-[#0d4b33]/[0.06] p-4">
            <h4 className="text-sm font-bold text-[#0d4b33]">معلومات الإمام</h4>
            {isPending && request.imam_source !== 'existing' ? (
              <div className="space-y-1">
                <label className="text-xs text-[#0d4b33]/60">اسم الإمام</label>
                <Input value={imamName} onChange={(e) => setImamName(e.target.value)} className="font-tajawal text-sm" />
              </div>
            ) : (
              <p className="text-sm">
                <span className="text-[#0d4b33]/60">الإمام:</span>{' '}
                {request.imam_source === 'existing' ? request.existing_imam_name || request.imam_name : request.imam_name}
                {request.imam_source === 'existing' && <span className="mr-1 text-xs text-[#0d4b33]/40">(موجود)</span>}
              </p>
            )}
            {request.imam_youtube_link && (
              <a href={request.imam_youtube_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline" dir="ltr">
                رابط يوتيوب
              </a>
            )}
          </div>
        )}

        {/* Notes */}
        {request.notes && (
          <div>
            <span className="text-xs text-[#0d4b33]/60">ملاحظات:</span>
            <p className="mt-1 text-sm text-[#0d4b33]/80">{request.notes}</p>
          </div>
        )}

        {/* Admin notes input */}
        {isPending && (
          <div className="space-y-1">
            <label className="text-xs text-[#0d4b33]/60">ملاحظات الإدارة (داخلية)</label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="ملاحظات داخلية..."
              rows={2}
              className="font-tajawal text-sm"
            />
          </div>
        )}

        {/* Date info */}
        <div className="text-xs text-[#0d4b33]/40">
          تاريخ الإرسال: {request.created_at ? new Date(request.created_at).toLocaleDateString('ar-SA') : '—'}
          {request.reviewed_at && (
            <span className="mr-3">
              تاريخ المراجعة: {new Date(request.reviewed_at).toLocaleDateString('ar-SA')}
            </span>
          )}
        </div>

        {/* Impact warnings */}
        {isPending && request.request_type !== 'new_mosque' && request.current_mosque_imam && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              <span className="font-bold">تنبيه:</span> المسجد لديه إمام حالياً: <strong>{request.current_mosque_imam}</strong> — سيصبح بدون مسجد
            </p>
          </div>
        )}
        {isPending && request.imam_current_mosque_name && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              <span className="font-bold">تنبيه:</span> {request.imam_current_mosque_name} سيصبح بدون إمام
            </p>
          </div>
        )}

        {/* Audio pipeline for YouTube links */}
        {isPending && request.imam_source !== 'existing' && request.imam_youtube_link && (
          <AudioPipeline
            value={audioSample}
            onChange={setAudioSample}
            initialVideoUrl={request.imam_youtube_link}
          />
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex flex-col gap-2 border-t border-[#0d4b33]/[0.06] pt-4 sm:flex-row">
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="h-11 flex-1 gap-1 bg-[#0d4b33] font-tajawal hover:bg-[#0d4b33]/90"
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              موافقة
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNeedsInfoDialog(true)}
              className="h-11 gap-1 font-tajawal text-blue-600 hover:bg-blue-50"
            >
              <AlertCircle className="h-4 w-4" />
              استفسار
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              className="h-11 gap-1 font-tajawal text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" />
              رفض
            </Button>
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent dir="rtl" className="font-tajawal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-tajawal text-[#0d4b33]">رفض الطلب</AlertDialogTitle>
            <AlertDialogDescription className="font-tajawal">
              يرجى ذكر سبب الرفض (سيظهر لمقدم الطلب).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="سبب الرفض..."
            rows={3}
            className="font-tajawal"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="font-tajawal">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 font-tajawal hover:bg-red-700"
            >
              رفض
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Needs info dialog */}
      <AlertDialog open={showNeedsInfoDialog} onOpenChange={setShowNeedsInfoDialog}>
        <AlertDialogContent dir="rtl" className="font-tajawal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-tajawal text-[#0d4b33]">طلب معلومات إضافية</AlertDialogTitle>
            <AlertDialogDescription className="font-tajawal">
              أضف ملاحظة توضح ما تحتاجه من معلومات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="ما المعلومات المطلوبة؟"
            rows={3}
            className="font-tajawal"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="font-tajawal">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleNeedsInfo}
              className="bg-blue-600 font-tajawal hover:bg-blue-700"
            >
              إرسال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function RequestsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { data, isLoading } = useAdminRequests({
    page,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  })
  const [selectedRequest, setSelectedRequest] = useState<AdminCommunityRequest | null>(null)

  const columns = useMemo<ColumnDef<AdminCommunityRequest, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: '#',
        meta: { className: 'hidden sm:table-cell' },
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/40">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'request_type',
        header: 'النوع',
        cell: ({ row }) => {
          const config = TYPE_CONFIG[row.original.request_type]
          const Icon = config.icon
          return (
            <Badge variant="outline" className={`gap-1 ${config.className}`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          )
        },
      },
      {
        id: 'title',
        header: 'العنوان',
        cell: ({ row }) => {
          const r = row.original
          const title = r.request_type === 'new_mosque'
            ? r.mosque_name
            : r.target_mosque_name
          return (
            <div>
              <p className="text-sm font-medium text-[#0d4b33]">{title || '—'}</p>
              {r.imam_name && <p className="text-xs text-[#0d4b33]/50">{r.imam_name}</p>}
            </div>
          )
        },
      },
      {
        accessorKey: 'submitter_name',
        header: 'مقدم الطلب',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="text-sm text-[#0d4b33]">{row.original.submitter_name}</span>
            {row.original.submitter_trust_level === 'trusted' && (
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        cell: ({ row }) => {
          const config = STATUS_CONFIG[row.original.status]
          return (
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'التاريخ',
        meta: { className: 'hidden sm:table-cell' },
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/50">
            {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString('ar-SA') : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedRequest(row.original)}
            className="h-8 gap-1 text-xs text-[#0d4b33]/60 hover:text-[#0d4b33]"
          >
            <Eye className="h-3.5 w-3.5" />
            تفاصيل
          </Button>
        ),
      },
    ],
    []
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        perPage={data?.per_page ?? 50}
        onPageChange={setPage}
        searchPlaceholder=""
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-9 w-full font-tajawal text-sm sm:w-36">
                <SelectValue placeholder="كل الأنواع" />
              </SelectTrigger>
              <SelectContent className="font-tajawal">
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="new_mosque">مسجد جديد</SelectItem>
                <SelectItem value="new_imam">تغيير إمام (جديد)</SelectItem>
                <SelectItem value="imam_transfer">تغيير إمام (موجود)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="h-9 w-full font-tajawal text-sm sm:w-36">
                <SelectValue placeholder="كل الحالات" />
              </SelectTrigger>
              <SelectContent className="font-tajawal">
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="approved">مقبول</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="needs_info">يحتاج معلومات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Detail sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={(open) => { if (!open) setSelectedRequest(null) }}>
        <SheetContent side="left" className="w-full overflow-y-auto font-tajawal sm:max-w-lg" dir="rtl">
          <SheetHeader>
            <SheetTitle className="font-tajawal text-[#0d4b33]">
              تفاصيل الطلب #{selectedRequest?.id}
            </SheetTitle>
          </SheetHeader>
          {selectedRequest && (
            <RequestDetail
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
