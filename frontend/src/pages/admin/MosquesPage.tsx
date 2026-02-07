import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminMosques, useDeleteMosque } from '@/hooks/use-admin'
import { AREAS } from '@/lib/constants'
import type { AdminMosque } from '@/types'

const areaBadgeColors: Record<string, string> = {
  'شمال': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'جنوب': 'bg-blue-50 text-blue-700 border-blue-200',
  'شرق': 'bg-amber-50 text-amber-700 border-amber-200',
  'غرب': 'bg-purple-50 text-purple-700 border-purple-200',
}

export default function MosquesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('')
  const { data, isLoading } = useAdminMosques({ page, search: search || undefined, area: area || undefined })
  const deleteMosque = useDeleteMosque()
  const [deleteTarget, setDeleteTarget] = useState<AdminMosque | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await deleteMosque.mutateAsync(deleteTarget.id)
      toast.success('تم حذف المسجد')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحذف')
    } finally {
      setDeletingId(null)
      setDeleteTarget(null)
    }
  }

  const columns = useMemo<ColumnDef<AdminMosque, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: '#',
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/40">{row.original.id}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'name',
        header: 'المسجد',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-[#0d4b33]">{row.original.name}</p>
            <p className="text-xs text-[#0d4b33]/40">حي {row.original.location}</p>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'area',
        header: 'المنطقة',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={`border font-tajawal text-[10px] ${areaBadgeColors[row.original.area] || ''}`}
          >
            {row.original.area}
          </Badge>
        ),
      },
      {
        accessorKey: 'imam_name',
        header: 'الإمام',
        cell: ({ row }) => (
          <span className={row.original.imam_name ? '' : 'text-[#0d4b33]/30'}>
            {row.original.imam_name || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'audio_sample',
        header: 'صوت',
        cell: ({ row }) => (
          <div className="flex h-5 w-5 items-center justify-center">
            {row.original.audio_sample ? (
              <div className="h-2 w-2 rounded-full bg-emerald-400" title="يوجد مقطع صوتي" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-[#0d4b33]/10" title="لا يوجد مقطع" />
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {deletingId === row.original.id && (
              <Loader2 className="h-4 w-4 animate-spin text-[#0d4b33]/40" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#0d4b33]/40 hover:text-[#0d4b33]">
                  <span className="sr-only">القائمة</span>
                  ···
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="font-tajawal">
                <DropdownMenuItem asChild>
                  <Link to={`/dashboard/mosques/${row.original.id}/edit`} className="flex items-center gap-2">
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                  </Link>
                </DropdownMenuItem>
                {row.original.map_link && (
                  <DropdownMenuItem asChild>
                    <a href={row.original.map_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      الخريطة
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [deleteMosque, deletingId]
  )

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        total={data?.total ?? 0}
        page={page}
        perPage={data?.per_page ?? 50}
        onPageChange={setPage}
        onSearchChange={(val) => { setSearch(val); setPage(1) }}
        searchPlaceholder="بحث بالاسم أو الحي أو الإمام..."
        toolbar={
          <>
            <Select value={area} onValueChange={(val) => { setArea(val === 'all' ? '' : val); setPage(1) }}>
              <SelectTrigger className="h-9 w-32 border-[#0d4b33]/10 font-tajawal text-sm">
                <SelectValue placeholder="المنطقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-tajawal">الكل</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a} className="font-tajawal">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild className="bg-[#0d4b33] font-tajawal text-sm hover:bg-[#0d4b33]/90">
              <Link to="/dashboard/mosques/new">
                <Plus className="h-4 w-4" />
                إضافة مسجد
              </Link>
            </Button>
          </>
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent dir="rtl" className="font-tajawal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-tajawal text-[#0d4b33]">حذف المسجد</AlertDialogTitle>
            <AlertDialogDescription className="font-tajawal">
              هل تريد حذف &quot;{deleteTarget?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-tajawal">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 font-tajawal hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
