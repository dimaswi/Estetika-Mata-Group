import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import type { Customer } from "@/lib/api";
import { formatIDR } from "@/lib/format";

interface CustomerColumnsProps {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  hasViewPermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

export function createCustomerColumns({
  onView,
  onEdit,
  onDelete,
  hasViewPermission,
  hasEditPermission,
  hasDeletePermission,
}: CustomerColumnsProps): ColumnDef<Customer>[] {
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
      meta: { className: "w-36" },
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]"
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
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]"
        >
          <span>NAMA PELANGGAN / KLINIK / RS</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">{row.original.name}</div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            {row.original.phone || "—"} {row.original.city ? `• ${row.original.city}` : ""}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "default_term_days",
      meta: { className: "w-28 text-center" },
      header: () => <span className="block text-center">TERMIN</span>,
      cell: ({ row }) => (
        <div className="text-center font-mono text-xs">{row.original.default_term_days} hari</div>
      ),
    },
    {
      accessorKey: "outstanding_ar",
      meta: { className: "w-44 text-right" },
      header: () => <span className="block text-right">SISA PIUTANG (AR)</span>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
          {formatIDR(row.original.outstanding_ar)}
        </div>
      ),
    },
    {
      id: "actions",
      meta: { className: "w-28 text-right" },
      header: () => <span className="block text-right">AKSI</span>,
      cell: ({ row }) => {
        const cust = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasViewPermission && (
              <Button type="button" variant="ghost" size="icon" className="size-7 rounded-none" onClick={() => onView(cust.id)} title="Detail">
                <Eye className="size-3.5" />
              </Button>
            )}
            {hasEditPermission && (
              <Button type="button" variant="ghost" size="icon" className="size-7 rounded-none text-blue-600" onClick={() => onEdit(cust.id)} title="Edit">
                <Edit3 className="size-3.5" />
              </Button>
            )}
            {hasDeletePermission && (
              <Button type="button" variant="ghost" size="icon" className="size-7 rounded-none text-destructive" onClick={() => onDelete(cust.id)} title="Hapus">
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
