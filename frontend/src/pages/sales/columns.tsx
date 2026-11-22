import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import type { Sale } from "@/lib/api";
import { formatIDR, formatDateID } from "@/lib/format";

interface SaleColumnsProps {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  hasViewPermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

const paymentBadgeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Lunas", variant: "default" },
  partial: { label: "Sebagian", variant: "secondary" },
  unpaid: { label: "Belum Bayar", variant: "outline" },
  overdue: { label: "Jatuh Tempo", variant: "destructive" },
  waiting_usage: { label: "Menunggu Dipakai", variant: "outline" },
};

const deliveryBadgeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  completed: { label: "Selesai", variant: "default" },
  partial_scanned: { label: "Sebagian", variant: "secondary" },
  draft: { label: "Draft", variant: "outline" },
};

export function createSaleColumns({
  onView,
  onEdit,
  onDelete,
  hasViewPermission,
  hasEditPermission,
  hasDeletePermission,
}: SaleColumnsProps): ColumnDef<Sale>[] {
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
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]"
        >
          <span>NO. INVOICE</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
            {row.original.invoice_number}
          </span>
          <div className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5">
            {row.original.payment_type === "consignment"
              ? "Konsinyasi (Pakai Dulu)"
              : row.original.payment_type === "termin"
              ? `Termin ${row.original.term_days} hr`
              : "Cash"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "customer_name",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]"
        >
          <span>CUSTOMER / KLINIK / RS</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
            {row.original.customer_name}
          </div>
          {(row.original.doctor_name || row.original.customer_phone) && (
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              {row.original.doctor_name ? `dr. ${row.original.doctor_name}` : ""}
              {row.original.doctor_name && row.original.customer_phone ? " • " : ""}
              {row.original.customer_phone || ""}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "sale_date",
      meta: { className: "w-36" },
      header: () => <span>TANGGAL</span>,
      cell: ({ row }) => (
        <div>
          <div className="text-xs font-mono">{formatDateID(row.original.sale_date)}</div>
          {row.original.due_date && (
            <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
              JT: {formatDateID(row.original.due_date)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "scan_progress",
      meta: { className: "w-32 text-center" },
      header: () => <span className="block text-center">SCAN OUT</span>,
      cell: ({ row }) => {
        const items = row.original.items || [];
        const totalOrd = items.reduce((s, it) => s + (it.qty_ordered || 0), 0);
        const totalOut = items.reduce((s, it) => s + (it.qty_scanned_out || 0), 0);
        return (
          <div className="text-center font-mono text-xs font-bold">
            <span className={totalOut >= totalOrd && totalOrd > 0 ? "text-emerald-600" : "text-amber-600"}>
              {totalOut} / {totalOrd}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "total_amount",
      meta: { className: "w-44 text-right" },
      header: () => <span className="block text-right">TOTAL &amp; SISA</span>,
      cell: ({ row }) => {
        const s = row.original;
        const isConsign = s.payment_type === "consignment";
        const billable = isConsign ? (s.billable_amount || 0) : s.total_amount;
        const sisa = Math.max(0, billable + s.penalty_amount - s.paid_amount);
        return (
          <div className="text-right font-mono text-xs">
            <div className="font-bold text-neutral-900 dark:text-neutral-100">
              {formatIDR(billable)}
            </div>
            <div className="text-[11px] text-neutral-500">
              {isConsign
                ? `Titip: ${formatIDR(s.total_amount)}`
                : sisa > 0
                ? `Sisa: ${formatIDR(sisa)}`
                : "Lunas"}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "payment_status",
      meta: { className: "w-32 text-center" },
      header: () => <span className="block text-center">STATUS BAYAR</span>,
      cell: ({ row }) => {
        const pBadge = paymentBadgeMap[row.original.payment_status] || { label: row.original.payment_status, variant: "outline" as const };
        return (
          <div className="text-center">
            <Badge variant={pBadge.variant} className="rounded-none text-[10px] px-1.5 py-0 uppercase">
              {pBadge.label}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "delivery_status",
      meta: { className: "w-28 text-center" },
      header: () => <span className="block text-center">STATUS KIRIM</span>,
      cell: ({ row }) => {
        const dBadge = deliveryBadgeMap[row.original.delivery_status] || { label: row.original.delivery_status, variant: "outline" as const };
        return (
          <div className="text-center">
            <Badge variant={dBadge.variant} className="rounded-none text-[10px] uppercase">
              {dBadge.label}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      meta: { className: "w-28 text-right" },
      header: () => <span className="block text-right">AKSI</span>,
      cell: ({ row }) => {
        const s = row.original;
        const isDraft = s.delivery_status === "draft";
        return (
          <div className="flex items-center justify-end gap-1">
            {hasViewPermission && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-none"
                onClick={() => onView(s.id)}
                title="Detail & Scan Out"
              >
                <Eye className="size-3.5" />
              </Button>
            )}
            {hasEditPermission && isDraft && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-none text-blue-600"
                onClick={() => onEdit(s.id)}
                title="Edit Penjualan"
              >
                <Edit3 className="size-3.5" />
              </Button>
            )}
            {hasDeletePermission && isDraft && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-none text-destructive"
                onClick={() => onDelete(s.id)}
                title="Hapus Penjualan"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
