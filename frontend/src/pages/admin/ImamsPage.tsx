import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, Music, Youtube } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdminImams, useDeleteImam } from '@/hooks/use-admin'
import type { AdminImam } from '@/types'

export default function ImamsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useAdminImams({ page, search: search || undefined })
  const deleteImam = useDeleteImam()

  const handleDelete = async (imam: AdminImam) => {
    if (!confirm(`هل تريد حذف "${imam.name}"؟`)) return
    try {
      await deleteImam.mutateAsync(imam.id)
      toast.success('تم حذف الإمام')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحذف')
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#0d4b33]/40 hover:text-[#0d4b33]">
                ···
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="font-tajawal">
              {row.original.mosque_id && (
                <DropdownMenuItem asChild>
                  <Link to={`/dashboard/mosques/${row.original.mosque_id}/edit`} className="flex items-center gap-2">
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="flex items-center gap-2 text-red-600 focus:text-red-600"
                onClick={() => handleDelete(row.original)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteImam]
  )

  return (
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
    />
  )
}
