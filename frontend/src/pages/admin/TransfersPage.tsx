import { useState, useMemo, useCallback } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import type { AdminTransfer } from '@/types'

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'معلق', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'مقبول', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'مرفوض', className: 'bg-red-50 text-red-700 border-red-200' },
}

export default function TransfersPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useAdminTransfers({ page, status: statusFilter || undefined })
  const approveMutation = useApproveTransfer()
  const rejectMutation = useRejectTransfer()

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = useCallback(async (id: number) => {
    if (!confirm('هل تريد قبول هذا البلاغ؟')) return
    try {
      await approveMutation.mutateAsync(id)
      toast.success('تم قبول البلاغ')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل القبول')
    }
  }, [approveMutation])

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
          const s = statusLabels[row.original.status]
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
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => handleApprove(row.original.id)}
                disabled={approveMutation.isPending}
                title="قبول"
              >
                {approveMutation.isPending ? (
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
    [approveMutation, handleApprove]
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
