import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Eye, Edit3, Trash2, ArrowUpDown } from "lucide-react"

interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Permission[];
}

interface Permission {
  id: number;
  name: string;
  description: string;
}

interface RoleColumnsProps {
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  hasViewPermission: boolean
  hasEditPermission: boolean
  hasDeletePermission: boolean
}

export function createRoleColumns({
  onView,
  onEdit,
  onDelete,
  hasViewPermission,
  hasEditPermission,
  hasDeletePermission,
}: RoleColumnsProps): ColumnDef<Role>[] {
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
      accessorKey: "name",
      meta: { className: "w-48" },
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px] hover:text-neutral-900 dark:hover:text-white"
        >
          <span>NAMA ROLE / PERAN</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => {
        const role = row.original;
        return (
          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-none inline-block">
            {role.name}
          </span>
        );
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900"
        >
          <span>DESKRIPSI</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => {
        const description = row.getValue("description") as string;
        return (
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm leading-snug">
            {description || "—"}
          </div>
        );
      },
    },
    {
      accessorKey: "permissions",
      meta: { className: "w-40 text-center" },
      header: () => <span className="block text-center">TOTAL HAK AKSES</span>,
      cell: ({ row }) => {
        const role = row.original;
        const permissionCount = role.permissions?.length || 0;
        return (
          <div className="text-center">
            <span className="inline-block px-2.5 py-0.5 rounded-none text-[11px] font-semibold uppercase tracking-wider border bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 font-mono">
              {permissionCount} Hak Akses
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      meta: { className: "w-28 text-right" },
      header: () => <span className="block text-right">AKSI</span>,
      cell: ({ row }) => {
        const role = row.original;

        return (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            {hasViewPermission && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-none text-neutral-500 hover:text-blue-600 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 p-0 shadow-none"
                onClick={() => onView(role.id)}
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
                onClick={() => onEdit(role.id)}
                title="Edit Role"
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
                onClick={() => onDelete(role.id)}
                title="Hapus Role"
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
