import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import type { Purchase } from "@/lib/api";
import { formatIDR, formatDateID } from "@/lib/format";

interface PurchaseColumnsProps {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  hasViewPermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

export function createPurchaseColumns({
  onView,
  onEdit,
  onDelete,
  hasViewPermission,
  hasEditPermission,
  hasDeletePermission,
}: PurchaseColumnsProps): ColumnDef<Purchase>[] {
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
      accessorKey: "invoice_number",
      meta: { className: "w-44" },
      header: ({ column }) => (
        <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
          <span>NO. INVOICE / PO</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 rounded-none inline-block">
          {row.original.invoice_number}
        </span>
      ),
    },
    {
      accessorKey: "supplier.name",
      header: () => <span>SUPPLIER &amp; TANGGAL</span>,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">{p.supplier?.name || "—"}</div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              {formatDateID(p.purchase_date)} • {p.payment_type === "cash" ? "CASH" : `TERMIN ${p.term_days} HR (JT: ${formatDateID(p.due_date)})`}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "total_amount",
      meta: { className: "w-44 text-right" },
      header: () => <span className="block text-right">TOTAL &amp; SISA</span>,
      cell: ({ row }) => {
        const p = row.original;
        const sisa = Math.max(0, p.total_amount + p.penalty_amount - p.paid_amount);
        return (
          <div className="text-right font-mono text-xs">
            <div className="font-bold text-neutral-900 dark:text-white">{formatIDR(p.total_amount)}</div>
            <div className="text-[11px] text-neutral-500">
              {sisa > 0 ? `Sisa: ${formatIDR(sisa)}` : "Lunas"}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "payment_status",
      meta: { className: "w-28 text-center" },
      header: () => <span className="block text-center">STATUS BAYAR</span>,
      cell: ({ row }) => {
        const st = row.original.payment_status;
        return (
          <div className="text-center">
            <Badge variant={st === "paid" ? "default" : st === "overdue" ? "destructive" : "secondary"} className="rounded-none text-[10px] uppercase font-mono">
              {st}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "receive_status",
      meta: { className: "w-32 text-center" },
      header: () => <span className="block text-center">SCAN IN</span>,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant={row.original.receive_status === "completed" ? "default" : "outline"} className="rounded-none text-[10px] uppercase font-mono">
            {row.original.receive_status}
          </Badge>
        </div>
      ),
    },
    {
      id: "actions",
      meta: { className: "w-28 text-right" },
      header: () => <span className="block text-right">AKSI</span>,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            {hasViewPermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onView(p.id)} title="Lihat Detail & Scan In">
                <Eye className="size-3.5 text-blue-500" />
              </Button>
            )}
            {hasEditPermission && p.receive_status === "draft" && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onEdit(p.id)} title="Edit Pembelian">
                <Edit3 className="size-3.5 text-amber-500" />
              </Button>
            )}
            {hasDeletePermission && p.receive_status === "draft" && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onDelete(p.id)} title="Hapus Pembelian">
                <Trash2 className="size-3.5 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
