import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, ArrowUpDown, CheckCircle2, XCircle } from "lucide-react";
import type { Category } from "@/lib/api";

interface CategoryColumnsProps {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  hasViewPermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

export function createCategoryColumns({
  onView,
  onEdit,
  onDelete,
  hasViewPermission,
  hasEditPermission,
  hasDeletePermission,
}: CategoryColumnsProps): ColumnDef<Category>[] {
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
      accessorKey: "code",
      meta: { className: "w-40" },
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px] hover:text-neutral-900 dark:hover:text-white"
        >
          <span>KODE</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 rounded-none inline-block">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px] hover:text-neutral-900 dark:hover:text-white"
        >
          <span>NAMA KATEGORI</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs leading-snug">
            {row.original.name}
          </div>
          {row.original.description && (
            <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "parent.name",
      meta: { className: "w-44" },
      header: () => <span>INDUK KATEGORI</span>,
      cell: ({ row }) => (
        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
          {row.original.parent?.name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      meta: { className: "w-24 text-center" },
      header: () => <span className="block text-center">STATUS</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          {row.original.is_active ? (
            <span title="Aktif" className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
            </span>
          ) : (
            <span title="Nonaktif" className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-500 dark:text-rose-400">
              <XCircle className="size-3.5" />
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      meta: { className: "w-28 text-right" },
      header: () => <span className="block text-right">AKSI</span>,
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            {hasViewPermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onView(cat.id)} title="Lihat Detail">
                <Eye className="size-3.5 text-blue-500" />
              </Button>
            )}
            {hasEditPermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onEdit(cat.id)} title="Edit Kategori">
                <Edit3 className="size-3.5 text-amber-500" />
              </Button>
            )}
            {hasDeletePermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onDelete(cat.id)} title="Hapus Kategori">
                <Trash2 className="size-3.5 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
