"use client"

import * as React from "react"
import type {
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  RotateCcw,
  RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  searchLabel?: string
  showColumnVisibility?: boolean
  showPagination?: boolean
  showSearch?: boolean
  showHeader?: boolean
  embedded?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  toolbarActions?: React.ReactNode
  filterSlot?: React.ReactNode
  cardTitle?: string
  cardSubtitle?: string
  cardIcon?: React.ReactNode
  entityName?: string
  loading?: boolean
  onRefresh?: () => void
  hasActiveFilters?: boolean
  onResetFilters?: () => void
  onRowClick?: (row: TData) => void
  getRowCanExpand?: (row: TData) => boolean
  renderSubComponent?: (row: TData) => React.ReactNode
  renderSubRows?: (row: TData, rowNumber: number) => React.ReactNode
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Cari nomor jurnal atau keterangan...",
  searchLabel = "Cari No. Jurnal / Keterangan",
  showColumnVisibility = false,
  showPagination = true,
  showSearch = true,
  showHeader = true,
  embedded = false,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  toolbarActions,
  filterSlot,
  cardTitle,
  cardSubtitle,
  cardIcon,
  entityName = "Data",
  loading = false,
  onRefresh,
  hasActiveFilters = false,
  onResetFilters,
  onRowClick,
  getRowCanExpand,
  renderSubComponent,
  renderSubRows,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getRowCanExpand: getRowCanExpand ? (row) => getRowCanExpand(row.original) : undefined,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      expanded,
    },
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  })

  const totalRecords = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const currentPageSize = table.getState().pagination.pageSize
  const totalPages = Math.max(1, table.getPageCount())
  const fromRecord = totalRecords === 0 ? 0 : pageIndex * currentPageSize + 1
  const toRecord = Math.min((pageIndex + 1) * currentPageSize, totalRecords)

  const handleReset = () => {
    setGlobalFilter("")
    if (onResetFilters) {
      onResetFilters()
    }
    table.resetColumnFilters()
    table.setPageIndex(0)
  }

  const isResetVisible = Boolean(globalFilter || hasActiveFilters)

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* ─── Satu Kontainer Card Utuh (Single Unified Card Container from Jurnal Umum) ──── */}
      <div className={cn(
        "w-full rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none",
        !embedded && "border border-neutral-200 dark:border-neutral-800"
      )}>
        
        {/* 1. Header Bar: Title on Left, Action Buttons on Right */}
        {showHeader && (
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-2.5">
            {cardIcon && (
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                {cardIcon}
              </div>
            )}
            <div>
              {cardTitle && (
                <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                  {cardTitle}
                </h1>
              )}
              <p className="text-[11px] text-neutral-500 font-mono flex items-center gap-1.5">
                {cardSubtitle && (
                  <>
                    <span>{cardSubtitle}</span>
                    <span>•</span>
                  </>
                )}
                <span>{totalRecords} Total {entityName}</span>
                {loading && (
                  <RefreshCw className="size-3 animate-spin text-neutral-400 ml-1" />
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons on Right */}
          <div className="flex flex-wrap items-center gap-2">
            {isResetVisible && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 gap-1 px-2.5 rounded-none"
                title="Reset semua filter ke default"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset Filter</span>
              </Button>
            )}

            {onRefresh && !toolbarActions && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-2.5 shadow-none"
                title="Segarkan Data"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              </Button>
            )}

            {showColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-2.5 shadow-none gap-1 font-normal"
                  >
                    <span>Kolom</span>
                    <ChevronDown className="size-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-none border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none">
                  {table
                    .getAllColumns()
                    .filter((column: any) => column.getCanHide())
                    .map((column: any) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-xs rounded-none cursor-pointer"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {toolbarActions}
          </div>
        </div>
        )}

        {/* 2. Shaded Filter Strip */}
        {(showSearch || filterSlot) && (
          <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 px-4 py-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {showSearch && (
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                    {searchLabel}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={globalFilter ?? ""}
                      onChange={(e) => {
                        setGlobalFilter(e.target.value)
                        table.setPageIndex(0)
                      }}
                      className="h-8 pl-8 pr-7 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none"
                    />
                    {globalFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setGlobalFilter("")
                          table.setPageIndex(0)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {filterSlot}
            </div>
          </div>
        )}

        {/* 3. Table Section */}
        <div className="overflow-x-auto select-none">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup: any) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header: any) => (
                    <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-14 text-center text-neutral-500 text-sm"
                  >
                    <RefreshCw className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
                    Memuat data {entityName.toLowerCase()}...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row: any, idx: number) => (
                  <React.Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      onClick={() => onRowClick?.(row.original)}
                      className={onRowClick ? "cursor-pointer" : undefined}
                    >
                      {row.getVisibleCells().map((cell: any) => (
                        <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && renderSubRows && renderSubRows(row.original, pageIndex * currentPageSize + idx + 1)}
                    {row.getIsExpanded() && !renderSubRows && renderSubComponent && (
                      <TableRow className="bg-neutral-50/80 dark:bg-neutral-900/50 hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50">
                        <TableCell colSpan={row.getVisibleCells().length} className="p-0 border-t border-neutral-200 dark:border-neutral-800">
                          {renderSubComponent(row.original)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-14 text-center text-neutral-500 text-sm"
                  >
                    Tidak ada data {entityName.toLowerCase()} yang sesuai dengan filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Pagination Footer Bar (Exact copy of Jurnal Umum) */}
        {showPagination && (
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
              <select
                value={currentPageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value))
                }}
                className="h-7 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-xs rounded-none shadow-none cursor-pointer outline-none font-medium text-neutral-800 dark:text-neutral-200"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="font-mono text-neutral-400 ml-2">
                Menampilkan {fromRecord} - {toRecord} dari {totalRecords} data
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="h-7 w-7 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none disabled:opacity-40"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-7 w-7 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none disabled:opacity-40"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="size-3.5" />
              </Button>

              <span className="px-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Hal {totalRecords === 0 ? 0 : pageIndex + 1} dari {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-7 w-7 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none disabled:opacity-40"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(totalPages - 1)}
                disabled={!table.getCanNextPage()}
                className="h-7 w-7 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none disabled:opacity-40"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// Helper function to create a select column
export function createSelectColumn<T>(): ColumnDef<T> {
  return {
    id: "select",
    header: ({ table }: any) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="rounded-none border-neutral-300 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
      />
    ),
    cell: ({ row }: any) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="rounded-none border-neutral-300 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}
