import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Eye, Edit3, Trash2, ArrowUpDown, CheckCircle2, XCircle } from "lucide-react"
import type { User } from "@/lib/api"

interface UserColumnsProps {
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  hasViewPermission: boolean
  hasEditPermission: boolean
  hasDeletePermission: boolean
}

export function createUserColumns({
  onView,
  onEdit,
  onDelete,
  hasViewPermission,
  hasEditPermission,
  hasDeletePermission,
}: UserColumnsProps): ColumnDef<User>[] {
  return [
    {
      id: "no",
      meta: { className: "w-12 text-center" },
      header: () => <span className="block text-center">NO</span>,
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        return (
          <span className="font-mono text-neutral-500 text-xs">
            {pageIndex * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      accessorKey: "username",
      meta: { className: "w-44" },
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900"
        >
          <span>USERNAME (LOGIN)</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 rounded-none inline-block">
          @{row.original.username}
        </span>
      ),
    },
    {
      accessorKey: "full_name",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900"
        >
          <span>NAMA LENGKAP</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm leading-snug">
              {user.full_name || '—'}
            </div>
            {user.email && (
              <div className="text-xs text-neutral-400 font-mono mt-0.5">
                {user.email}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "role.name",
      meta: { className: "w-36 text-center" },
      header: () => <span className="block text-center">ROLE / PERAN</span>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-block px-2.5 py-0.5 rounded-none text-xs font-semibold uppercase tracking-wider border bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 font-mono">
            {row.original.role?.name || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      meta: { className: "w-24 text-center" },
      header: () => <span className="block text-center">STATUS</span>,
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <div className="flex items-center justify-center">
            {isActive ? (
              <span title="Aktif" className="inline-flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
              </span>
            ) : (
              <span title="Tidak Aktif" className="inline-flex items-center justify-center text-rose-500 dark:text-rose-400">
                <XCircle className="size-3.5" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      meta: { className: "w-28 text-right" },
      header: () => <span className="block text-right">AKSI</span>,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            {hasViewPermission && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-none text-neutral-500 hover:text-blue-600 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 p-0 shadow-none"
                onClick={() => onView(user.id)}
                title="Lihat Detail"
              >
                <Eye className="size-3.5 text-blue-500" />
                <span className="sr-only">Lihat</span>
              </Button>
            )}
            {hasEditPermission && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-none text-neutral-500 hover:text-amber-600 hover:bg-amber-50/70 dark:hover:bg-amber-950/40 p-0 shadow-none"
                onClick={() => onEdit(user.id)}
                title="Edit Pengguna"
              >
                <Edit3 className="size-3.5 text-amber-500" />
                <span className="sr-only">Edit</span>
              </Button>
            )}
            {hasDeletePermission && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-none text-neutral-500 hover:text-rose-600 hover:bg-rose-50/70 dark:hover:bg-rose-950/40 p-0 shadow-none"
                onClick={() => onDelete(user.id)}
                title="Hapus Pengguna"
              >
                <Trash2 className="size-3.5 text-red-500" />
                <span className="sr-only">Hapus</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
