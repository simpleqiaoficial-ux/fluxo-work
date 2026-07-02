import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Download } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from './Dropdown'

export interface TableProps<TData, TValue = unknown> {
  data: TData[]
  columns: ColumnDef<TData, TValue>[]
  isLoading?: boolean
  emptyState?: ReactNode
  onRowClick?: (row: TData) => void
  pageSize?: number
  exportFileName?: string
  className?: string
}

function toCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

function columnLabel(header: unknown, id: string): string {
  return typeof header === 'string' ? header : id
}

export function Table<TData, TValue = unknown>({
  data,
  columns,
  isLoading = false,
  emptyState,
  onRowClick,
  pageSize = 10,
  exportFileName,
  className,
}: TableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  function handleExport() {
    const visibleColumns = table.getVisibleLeafColumns()
    const headerRow = visibleColumns
      .map((col) => toCsvValue(columnLabel(col.columnDef.header, col.id)))
      .join(',')
    const rows = table
      .getFilteredRowModel()
      .rows.map((row) => visibleColumns.map((col) => toCsvValue(row.getValue(col.id))).join(','))
    const csv = [headerRow, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exportFileName ?? 'export'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const rows = table.getRowModel().rows

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-end gap-2">
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="secondary" size="sm">
              <Columns3 className="size-4" aria-hidden="true" />
              Colunas
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            {table.getAllLeafColumns().map((column) => (
              <DropdownItem
                key={column.id}
                onSelect={(event) => event.preventDefault()}
                className="justify-between"
              >
                <label className="flex w-full cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
                  />
                  {columnLabel(column.columnDef.header, column.id)}
                </label>
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
        {exportFileName ? (
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="size-4" aria-hidden="true" />
            Exportar CSV
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-card border border-slate-200 dark:border-dark-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-dark-surface">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDirection = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-dark-border dark:text-slate-400"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDirection === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          ) : sortDirection === 'desc' ? (
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-dark-border/60">
                  {columns.map((_col, colIndex) => (
                    <td key={colIndex} className="px-4 py-3.5">
                      <div className="h-4 w-full max-w-40 animate-pulse rounded-base bg-slate-200 dark:bg-white/5" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  {emptyState ?? 'Nenhum registro encontrado.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'border-b border-slate-100 last:border-b-0 dark:border-dark-border/60',
                    onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Próxima
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
