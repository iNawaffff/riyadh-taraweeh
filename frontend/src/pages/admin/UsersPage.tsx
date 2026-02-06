import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { DataTable, type ColumnDef } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminUsers, useUpdateUserRole } from '@/hooks/use-admin'
import { useAuth } from '@/hooks/use-auth'
import type { AdminUser, UserRole } from '@/types'

const roleLabels: Record<string, { label: string; className: string }> = {
  admin: { label: 'مدير', className: 'bg-[#0d4b33] text-white border-transparent' },
  moderator: { label: 'مشرف', className: 'bg-[#c4a052]/15 text-[#8a6914] border-[#c4a052]/30' },
  user: { label: 'مستخدم', className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useAdminUsers({ page, search: search || undefined })
  const updateRole = useUpdateUserRole()
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'

  const handleRoleChange = useCallback(async (userId: number, newRole: UserRole) => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole })
      toast.success('تم تحديث الدور')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التحديث')
    }
  }, [updateRole])

  const columns = useMemo<ColumnDef<AdminUser, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: '#',
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/40">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'username',
        header: 'المستخدم',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {row.original.avatar_url ? (
                <AvatarImage src={row.original.avatar_url} />
              ) : null}
              <AvatarFallback className="bg-[#0d4b33]/5 font-tajawal text-xs text-[#0d4b33]/50">
                {(row.original.display_name || row.original.username)[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-[#0d4b33]">
                {row.original.display_name || row.original.username}
              </p>
              <p className="text-xs text-[#0d4b33]/40">@{row.original.username}</p>
            </div>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'email',
        header: 'البريد',
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/50" dir="ltr">
            {row.original.email || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'الدور',
        cell: ({ row }) => {
          const user = row.original
          const isCurrentUser = user.id === currentUser?.id

          if (isAdmin && !isCurrentUser) {
            return (
              <Select
                value={user.role}
                onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
              >
                <SelectTrigger className="h-7 w-24 border-[#0d4b33]/10 font-tajawal text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user" className="font-tajawal text-xs">مستخدم</SelectItem>
                  <SelectItem value="moderator" className="font-tajawal text-xs">مشرف</SelectItem>
                  <SelectItem value="admin" className="font-tajawal text-xs">مدير</SelectItem>
                </SelectContent>
              </Select>
            )
          }

          const r = roleLabels[user.role]
          return (
            <Badge variant="outline" className={`border font-tajawal text-[10px] ${r?.className || ''}`}>
              {r?.label || user.role}
              {isCurrentUser && ' (أنت)'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'contribution_points',
        header: 'النقاط',
        cell: ({ row }) => (
          <span className={row.original.contribution_points > 0 ? 'font-medium text-[#c4a052]' : 'text-[#0d4b33]/25'}>
            {row.original.contribution_points || '—'}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'created_at',
        header: 'التسجيل',
        cell: ({ row }) => (
          <span className="text-xs text-[#0d4b33]/40">
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString('ar-SA')
              : '—'}
          </span>
        ),
      },
    ],
    [isAdmin, currentUser, handleRoleChange]
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
      searchPlaceholder="بحث بالاسم أو البريد..."
    />
  )
}
