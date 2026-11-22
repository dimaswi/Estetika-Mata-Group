import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import type { ProductGroup } from "@/lib/api";

interface ProductGroupColumnsProps {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  hasViewPermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

export function createProductGroupColumns({
  onView,
  onEdit,
  onDelete,
  hasViewPermission,
  hasEditPermission,
  hasDeletePermission,
}: ProductGroupColumnsProps): ColumnDef<ProductGroup>[] {
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
        <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
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
        <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
          <span>NAMA KELOMPOK</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">{row.original.name}</div>
          {row.original.description && <div className="text-[11px] text-neutral-400 mt-0.5">{row.original.description}</div>}
        </div>
      ),
    },
    {
      accessorKey: "group_type",
      meta: { className: "w-40" },
      header: () => <span>TIPE</span>,
      cell: ({ row }) => (
        <span className="inline-block px-2 py-0.5 text-[11px] font-mono uppercase border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
          {row.original.group_type}
        </span>
      ),
    },
    {
      id: "members",
      meta: { className: "w-32 text-right" },
      header: () => <span className="block text-right">ANGGOTA</span>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs font-bold">
          {row.original.items?.length || 0} variasi
        </div>
      ),
    },
    {
      id: "actions",
      meta: { className: "w-28 text-right" },
      header: () => <span className="block text-right">AKSI</span>,
      cell: ({ row }) => {
        const g = row.original;
        return (
          <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            {hasViewPermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onView(g.id)} title="Lihat Detail">
                <Eye className="size-3.5 text-blue-500" />
              </Button>
            )}
            {hasEditPermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onEdit(g.id)} title="Edit Kelompok">
                <Edit3 className="size-3.5 text-amber-500" />
              </Button>
            )}
            {hasDeletePermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onDelete(g.id)} title="Hapus Kelompok">
                <Trash2 className="size-3.5 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
