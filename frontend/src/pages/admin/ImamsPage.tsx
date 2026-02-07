import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Music, Youtube, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
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
import ImamFormDialog from '@/components/admin/ImamFormDialog'
import { useAdminImams, useCreateImam, useUpdateImam, useDeleteImam } from '@/hooks/use-admin'
import type { AdminImam } from '@/types'

export default function ImamsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useAdminImams({ page, search: search || undefined })
  const createImam = useCreateImam()
  const updateImam = useUpdateImam()
  const deleteImam = useDeleteImam()
  const [deleteTarget, setDeleteTarget] = useState<AdminImam | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminImam | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await deleteImam.mutateAsync(deleteTarget.id)
      toast.success('تم حذف الإمام')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحذف')
    } finally {
      setDeletingId(null)
      setDeleteTarget(null)
    }
  }

  const handleFormSubmit = async (data: {
    name: string
    mosque_id: number | null
    audio_sample: string
    youtube_link: string
  }) => {
    try {
      if (editTarget) {
        await updateImam.mutateAsync({ id: editTarget.id, data })
        toast.success('تم تحديث الإمام')
      } else {
        await createImam.mutateAsync(data)
        toast.success('تم إضافة الإمام')
      }
      setFormOpen(false)
      setEditTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'حدث خطأ')
    }
  }

  const openCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const openEdit = (imam: AdminImam) => {
    setEditTarget(imam)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<AdminImam, unknown>[]>(
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
        header: 'الإمام',
        cell: ({ row }) => (
          <p className="font-medium text-[#0d4b33]">{row.original.name}</p>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'mosque_name',
        header: 'المسجد',
        cell: ({ row }) => (
          <span className={row.original.mosque_name ? '' : 'text-[#0d4b33]/30'}>
            {row.original.mosque_name || 'بدون مسجد'}
          </span>
        ),
      },
      {
        id: 'media',
        header: 'الوسائط',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.audio_sample && (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50" title="يوجد مقطع صوتي">
                <Music className="h-3 w-3 text-emerald-600" />
              </div>
            )}
            {row.original.youtube_link && (
              <a
                href={row.original.youtube_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-6 w-6 items-center justify-center rounded bg-red-50 transition-colors hover:bg-red-100"
                title="رابط يوتيوب"
              >
                <Youtube className="h-3 w-3 text-red-500" />
              </a>
            )}
            {!row.original.audio_sample && !row.original.youtube_link && (
              <span className="text-xs text-[#0d4b33]/25">—</span>
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
                  ···
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="font-tajawal">
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={() => openEdit(row.original)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </DropdownMenuItem>
                {row.original.mosque_id && (
                  <DropdownMenuItem asChild>
                    <Link to={`/dashboard/mosques/${row.original.mosque_id}/edit`} className="flex items-center gap-2">
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل المسجد
                    </Link>
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
    [deleteImam, deletingId]
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
        onSearchChange={(val) => { setSearch(val); setPage(1) }}
        searchPlaceholder="بحث باسم الإمام..."
        toolbar={
          <Button
            onClick={openCreate}
            className="bg-[#0d4b33] font-tajawal text-sm hover:bg-[#0d4b33]/90"
          >
            <Plus className="h-4 w-4" />
            إضافة إمام
          </Button>
        }
      />

      <ImamFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditTarget(null) }}
        imam={editTarget}
        onSubmit={handleFormSubmit}
        isSubmitting={createImam.isPending || updateImam.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent dir="rtl" className="font-tajawal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-tajawal text-[#0d4b33]">حذف الإمام</AlertDialogTitle>
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
    </>
  )
}
