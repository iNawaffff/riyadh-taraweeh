import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { ArrowUpDown, Search, ChevronRight, ChevronLeft, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  isLoading?: boolean
  total?: number
  page?: number
  perPage?: number
  onPageChange?: (page: number) => void
  onSearchChange?: (search: string) => void
  toolbar?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'بحث...',
  isLoading,
  total = 0,
  page = 1,
  perPage = 50,
  onPageChange,
  onSearchChange,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
  })

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {(searchKey || onSearchChange) && (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0d4b33]/30" />
            <Input
              placeholder={searchPlaceholder}
              value={
                onSearchChange
                  ? undefined
                  : (table.getColumn(searchKey!)?.getFilterValue() as string) ?? ''
              }
              onChange={(e) => {
                if (onSearchChange) {
                  onSearchChange(e.target.value)
                } else if (searchKey) {
                  table.getColumn(searchKey)?.setFilterValue(e.target.value)
                }
              }}
              className="border-[#0d4b33]/10 pr-9 font-tajawal placeholder:text-[#0d4b33]/30 focus-visible:ring-[#c4a052]/30"
            />
          </div>
        )}
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#0d4b33]/[0.06] bg-white shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-[#0d4b33]/[0.06] bg-[#faf9f6] hover:bg-[#faf9f6]">
                {headerGroup.headers.map((header) => {
                  const metaClassName = (header.column.columnDef.meta as { className?: string })?.className
                  return (
                  <TableHead
                    key={header.id}
                    className={`font-tajawal text-xs font-semibold text-[#0d4b33]/60 ${metaClassName || ''}`}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1.5 transition-colors hover:text-[#0d4b33]"
                        onClick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc')}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-[#0d4b33]/[0.04]">
                  {columns.map((col, j) => {
                    const metaClassName = (col.meta as { className?: string })?.className
                    return (
                    <TableCell key={j} className={metaClassName || ''}>
                      <Skeleton className="h-5 w-full max-w-[200px]" />
                    </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-[#0d4b33]/[0.04] transition-colors hover:bg-[#0d4b33]/[0.015]"
                >
                  {row.getVisibleCells().map((cell) => {
                    const metaClassName = (cell.column.columnDef.meta as { className?: string })?.className
                    return (
                    <TableCell key={cell.id} className={`font-tajawal text-sm text-[#0d4b33]/80 ${metaClassName || ''}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-8 w-8 text-[#0d4b33]/15" />
                    <p className="font-tajawal text-sm text-[#0d4b33]/40">لا توجد نتائج</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between">
          <p className="font-tajawal text-xs text-[#0d4b33]/40">
            {total} نتيجة — صفحة {page} من {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#0d4b33]/10"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#0d4b33]/10"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { type ColumnDef } from '@tanstack/react-table'
