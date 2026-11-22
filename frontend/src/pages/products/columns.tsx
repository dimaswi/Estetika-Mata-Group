import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/api";
import { formatIDR } from "@/lib/format";

interface ProductColumnsProps {
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  hasViewPermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

export function createProductColumns({
  onView,
  onEdit,
  onDelete,
  hasViewPermission,
  hasEditPermission,
  hasDeletePermission,
}: ProductColumnsProps): ColumnDef<Product>[] {
  return [
    {
      id: "expander",
      meta: { className: "w-10 text-center px-2" },
      header: () => null,
      cell: ({ row }) => {
        const p = row.original;
        const canExpand = Boolean(p.has_variants && (p.variants?.length || 0) > 0);
        if (!canExpand) return null;
        return (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 rounded-none p-0 shadow-none text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            title={row.getIsExpanded() ? "Tutup Variasi" : "Lihat Variasi"}
          >
            {row.getIsExpanded() ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </Button>
        );
      },
    },
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
      accessorKey: "sku_prefix",
      meta: { className: "w-36" },
      header: ({ column }) => (
        <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
          <span>SKU PREFIX</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 rounded-none inline-block">
          {row.original.sku_prefix}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
          <span>NAMA PRODUK</span>
          <ArrowUpDown className="size-3 text-neutral-400" />
        </button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        const brandName = p.brand_info?.name || p.brand;
        return (
          <div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs leading-snug">{p.name}</div>
            {p.alternative_name && (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Alt: {p.alternative_name}
              </div>
            )}
            {(brandName || p.akl_number) && (
              <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                {brandName || "—"} {p.akl_number ? `• AKL: ${p.akl_number}` : ""}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category.name",
      meta: { className: "w-44" },
      header: () => <span>KATEGORI</span>,
      cell: ({ row }) => (
        <span className="inline-block px-2 py-0.5 rounded-none text-[11px] font-semibold uppercase tracking-wider border bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 font-mono">
          {row.original.category?.name || "N/A"}
        </span>
      ),
    },
    {
      id: "variants_stock",
      meta: { className: "w-48 text-right" },
      header: () => <span className="block text-right">VARIASI &amp; STOK</span>,
      cell: ({ row }) => {
        const p = row.original;
        const vars = p.variants || [];
        const total = vars.reduce((sum, v) => sum + (v.stock_count || 0), 0);
        if (!p.has_variants) {
          const single = vars[0];
          return (
            <div className="text-right font-mono text-xs">
              <div>
                <span className="text-[11px] text-neutral-500">Tunggal</span> •{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{total}</span> {p.unit_name}
              </div>
              {single && single.sell_price > 0 && (
                <div className="text-[11px] text-neutral-400">{formatIDR(single.sell_price)}</div>
              )}
            </div>
          );
        }
        return (
          <div className="text-right font-mono text-xs">
            <span className="font-bold text-neutral-900 dark:text-white">{vars.length}</span> var •{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{total}</span> {p.unit_name}
          </div>
        );
      },
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
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onView(p.id)} title="Lihat Variasi & Unit">
                <Eye className="size-3.5 text-blue-500" />
              </Button>
            )}
            {hasEditPermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onEdit(p.id)} title="Edit Produk">
                <Edit3 className="size-3.5 text-amber-500" />
              </Button>
            )}
            {hasDeletePermission && (
              <Button variant="ghost" size="icon" className="size-7 rounded-none p-0 shadow-none" onClick={() => onDelete(p.id)} title="Hapus Produk">
                <Trash2 className="size-3.5 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
