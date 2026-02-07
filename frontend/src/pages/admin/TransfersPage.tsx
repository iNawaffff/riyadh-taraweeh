import { useState, useMemo, useCallback } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAdminTransfers, useApproveTransfer, useRejectTransfer } from '@/hooks/use-admin'
import { STATUS_LABELS } from '@/lib/constants'
import type { AdminTransfer } from '@/types'

export default function TransfersPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useAdminTransfers({ page, status: statusFilter || undefined })
  const approveMutation = useApproveTransfer()
  const rejectMutation = useRejectTransfer()

  const [approveTarget, setApproveTarget] = useState<AdminTransfer | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })
  const [rejectReason, setRejectReason] = useState('')

  const handleApproveConfirm = useCallback(async () => {
    if (!approveTarget) return
    setApprovingId(approveTarget.id)
    try {
      await approveMutation.mutateAsync(approveTarget.id)
      toast.success('تم قبول البلاغ')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل القبول')
    } finally {
      setApprovingId(null)
      setApproveTarget(null)
    }
  }, [approveTarget, approveMutation])

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectDialog.id) return
    try {
      await rejectMutation.mutateAsync({ id: rejectDialog.id, reason: rejectReason || undefined })
      toast.success('تم رفض البلاغ')
      setRejectDialog({ open: false, id: null })
      setRejectReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الرفض')
    }
  }, [rejectDialog.id, rejectReason, rejectMutation])

  const columns = useMemo<ColumnDef<AdminTransfer, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: '#',
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/40">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'mosque_name',
        header: 'المسجد',
        cell: ({ row }) => (
          <p className="font-medium text-[#0d4b33]">{row.original.mosque_name || '—'}</p>
        ),
      },
      {
        accessorKey: 'current_imam_name',
        header: 'الإمام الحالي',
        cell: ({ row }) => (
          <span className={row.original.current_imam_name ? 'text-[#0d4b33]/70' : 'text-[#0d4b33]/30'}>
            {row.original.current_imam_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'new_imam_name',
        header: 'الإمام الجديد',
        cell: ({ row }) => (
          <span className="font-medium text-[#c4a052]">
            {row.original.new_imam_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'submitter_name',
        header: 'المُبلّغ',
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/50">{row.original.submitter_name || '—'}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        cell: ({ row }) => {
          const s = STATUS_LABELS[row.original.status]
          return (
            <Badge variant="outline" className={`border font-tajawal text-[10px] ${s?.className || ''}`}>
              {s?.label || row.original.status}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'التاريخ',
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/40">
            {new Date(row.original.created_at).toLocaleDateString('ar-SA')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          if (row.original.status !== 'pending') return null
          const isApproving = approvingId === row.original.id
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => setApproveTarget(row.original)}
                disabled={isApproving}
                title="قبول"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => setRejectDialog({ open: true, id: row.original.id })}
                title="رفض"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        },
      },
    ],
    [approveMutation, approvingId]
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
        toolbar={
          <Select value={statusFilter || 'all'} onValueChange={(val) => { setStatusFilter(val === 'all' ? '' : val); setPage(1) }}>
            <SelectTrigger className="h-9 w-32 border-[#0d4b33]/10 font-tajawal text-sm">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-tajawal">الكل</SelectItem>
              <SelectItem value="pending" className="font-tajawal">معلق</SelectItem>
              <SelectItem value="approved" className="font-tajawal">مقبول</SelectItem>
              <SelectItem value="rejected" className="font-tajawal">مرفوض</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Approve confirmation */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null) }}>
        <AlertDialogContent dir="rtl" className="font-tajawal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-tajawal text-[#0d4b33]">قبول البلاغ</AlertDialogTitle>
            <AlertDialogDescription className="font-tajawal">
              هل تريد قبول بلاغ نقل الإمام في &quot;{approveTarget?.mosque_name}&quot;؟
              سيتم تعيين الإمام الجديد ومنح نقطة مساهمة للمُبلّغ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-tajawal">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              className="bg-[#0d4b33] font-tajawal hover:bg-[#0d4b33]/90"
            >
              قبول
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject reason dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) { setRejectDialog({ open: false, id: null }); setRejectReason('') } }}>
        <DialogContent className="font-tajawal sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-tajawal text-[#0d4b33]">رفض البلاغ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm text-[#0d4b33]/60">سبب الرفض (اختياري)</label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: الإمام لم يتغير"
              className="border-[#0d4b33]/10 font-tajawal focus-visible:ring-[#c4a052]/30"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setRejectDialog({ open: false, id: null }); setRejectReason('') }}
              className="font-tajawal"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              className="bg-red-600 font-tajawal hover:bg-red-700"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              رفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
