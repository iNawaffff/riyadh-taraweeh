import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Loader2,
  Building2,
  RefreshCw,
  Inbox,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useAuth } from '@/hooks/use-auth'
import { useMyRequests, useCancelRequest } from '@/hooks/use-requests'
import type { CommunityRequest, RequestStatus, RequestType } from '@/types'

const STATUS_CONFIG: Record<RequestStatus, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'قيد المراجعة', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'مقبول', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'مرفوض', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  needs_info: { label: 'يحتاج معلومات', icon: AlertCircle, className: 'bg-blue-50 text-blue-700 border-blue-200' },
}

const TYPE_CONFIG: Record<RequestType, { label: string; icon: typeof Building2 }> = {
  new_mosque: { label: 'مسجد جديد', icon: Building2 },
  new_imam: { label: 'تغيير إمام', icon: RefreshCw },
  imam_transfer: { label: 'تغيير إمام', icon: RefreshCw },
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function RequestCard({ request, onCancel, cancelling }: {
  request: CommunityRequest
  onCancel: (id: number) => void
  cancelling: boolean
}) {
  const typeConfig = TYPE_CONFIG[request.request_type]
  const TypeIcon = typeConfig.icon

  const title = request.request_type === 'new_mosque'
    ? request.mosque_name
    : request.target_mosque_name

  return (
    <div className="rounded-2xl bg-white p-3.5 sm:p-5 ring-1 ring-border/50 transition-all">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light">
            <TypeIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{title || 'بدون عنوان'}</p>
            <p className="text-[11px] text-muted-foreground">{typeConfig.label}</p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Imam info */}
      {request.imam_name && (
        <p className="mb-2 text-xs text-foreground/70">
          الإمام: {request.imam_name}
        </p>
      )}

      {/* Notes */}
      {request.notes && (
        <p className="mb-2 text-xs text-foreground/60 line-clamp-2">{request.notes}</p>
      )}

      {/* Reject reason */}
      {request.status === 'rejected' && request.reject_reason && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5">
          <p className="text-xs font-medium text-red-800">سبب الرفض:</p>
          <p className="text-xs text-red-700">{request.reject_reason}</p>
        </div>
      )}

      {/* Needs info message */}
      {request.status === 'needs_info' && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2.5">
          <p className="text-xs font-medium text-blue-800">يحتاج معلومات إضافية</p>
          <p className="text-xs text-blue-700">
            {request.admin_notes || 'تواصل معنا لتزويدنا بالمعلومات المطلوبة'}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/30 pt-3">
        <p className="text-[11px] text-muted-foreground">
          {request.created_at ? new Date(request.created_at).toLocaleDateString('ar-SA') : '—'}
        </p>
        {(request.status === 'pending' || request.status === 'needs_info') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancel(request.id)}
            disabled={cancelling}
            className="h-7 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            إلغاء
          </Button>
        )}
      </div>
    </div>
  )
}

function RequestCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-3.5 sm:p-5 ring-1 ring-border/50">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div>
            <Skeleton className="mb-1.5 h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-3 w-48" />
      <div className="flex items-center justify-between border-t border-border/30 pt-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
    </div>
  )
}

function MyRequestsPageSkeleton() {
  return (
    <div className="container max-w-2xl py-4 sm:py-8 md:py-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="mb-2 h-7 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl sm:w-28" />
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        {[16, 20, 14, 14, 24].map((w, i) => (
          <Skeleton key={i} className={`h-8 rounded-full`} style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      {/* Request cards */}
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <RequestCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function MyRequestsPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const { data: requests, isLoading } = useMyRequests()
  const cancelMutation = useCancelRequest()
  const [cancelTarget, setCancelTarget] = useState<number | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | RequestStatus>('all')

  const handleCancel = async () => {
    if (!cancelTarget) return
    setCancellingId(cancelTarget)
    try {
      await cancelMutation.mutateAsync(cancelTarget)
      toast.success('تم إلغاء الطلب')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل الإلغاء')
    } finally {
      setCancellingId(null)
      setCancelTarget(null)
    }
  }

  const filtered = requests?.filter(
    r => activeTab === 'all' || r.status === activeTab
  ) ?? []

  if (authLoading) {
    return (
      <>
        <Helmet><title>طلباتي - أئمة التراويح</title></Helmet>
        <MyRequestsPageSkeleton />
      </>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <Helmet><title>طلباتي - أئمة التراويح</title></Helmet>
        <div className="container max-w-2xl py-16 text-center">
          <h1 className="mb-3 text-2xl font-bold text-foreground">طلباتي</h1>
          <p className="text-sm text-muted-foreground">يجب تسجيل الدخول لعرض طلباتك</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet><title>طلباتي - أئمة التراويح</title></Helmet>

      <div className="container max-w-2xl py-4 sm:py-8 md:py-12 animate-fade-in-up">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">طلباتي</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              متابعة حالة طلبات الإضافة والتعديل
            </p>
          </div>
          <Button asChild className="gap-1.5 rounded-xl w-full sm:w-auto">
            <Link to="/request">
              <Plus className="h-4 w-4" />
              طلب جديد
            </Link>
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {[
            { key: 'all' as const, label: 'الكل' },
            { key: 'pending' as const, label: 'قيد المراجعة' },
            { key: 'approved' as const, label: 'مقبول' },
            { key: 'rejected' as const, label: 'مرفوض' },
            { key: 'needs_info' as const, label: 'يحتاج معلومات' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <RequestCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {activeTab === 'all' ? 'لا توجد طلبات بعد' : 'لا توجد طلبات بهذه الحالة'}
            </p>
            <Button asChild variant="outline" className="mt-4 gap-1.5 rounded-xl">
              <Link to="/request">
                <Plus className="h-4 w-4" />
                إرسال طلب جديد
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onCancel={setCancelTarget}
                cancelling={cancellingId === req.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null) }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الطلب</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              إلغاء الطلب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
