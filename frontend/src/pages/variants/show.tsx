import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { variantsApi, type ProductVariant, type ProductBatch, type StockUnit } from "@/lib/api";
import { formatIDR, formatDateID, getApiErrorMessage, getEDBadgeInfo } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ArrowLeft, Loader2, Edit3, Trash2, Layers } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function VariantShow() {
  const navigate = useNavigate();
  const { productId, id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();

  const [detail, setDetail] = useState<{
    variant: ProductVariant;
    batches: ProductBatch[];
    units: StockUnit[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const res = await variantsApi.getDetail(Number(id));
      setDetail(res.data?.data || null);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail variasi.") });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    setPageTitle("Detail Variasi & Unit Item");
    loadDetail();
  }, [loadDetail]);

  const resolvedProductId = detail?.variant?.product_id || productId;
  const backPath = resolvedProductId ? `/products/${resolvedProductId}` : "/products";

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await variantsApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Variasi berhasil dihapus." });
      setTimeout(() => navigate(backPath), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus variasi.") });
    }
  };

  const batchColumns = useMemo<ColumnDef<ProductBatch>[]>(
    () => [
      {
        accessorKey: "batch_number",
        header: () => <span>NO. BATCH</span>,
        cell: ({ row }) => <span className="font-mono text-xs font-bold">{row.original.batch_number}</span>,
      },
      {
        id: "supplier",
        header: () => <span>SUPPLIER</span>,
        cell: ({ row }) => <span className="text-xs">{row.original.supplier?.name || "—"}</span>,
      },
      {
        accessorKey: "expired_date",
        header: () => <span>EXPIRED DATE</span>,
        cell: ({ row }) => <span className="text-xs">{formatDateID(row.original.expired_date)}</span>,
      },
      {
        id: "ed_status",
        header: () => <span>STATUS ED</span>,
        cell: ({ row }) => {
          const ed = getEDBadgeInfo(row.original.ed_status, row.original.days_to_expiry);
          return <span className={`text-[10px] px-1.5 py-0.5 border font-medium ${ed.className}`}>{ed.label}</span>;
        },
      },
      {
        id: "qty",
        header: () => <span>SISA / AWAL</span>,
        cell: ({ row }) => <span className="font-mono text-xs font-bold">{row.original.qty_available} / {row.original.qty_initial}</span>,
      },
      {
        accessorKey: "unit_cost",
        meta: { className: "text-right" },
        header: () => <span className="block text-right">HPP UNIT</span>,
        cell: ({ row }) => <span className="font-mono text-xs block text-right">{formatIDR(row.original.unit_cost)}</span>,
      },
    ],
    []
  );

  const unitColumns = useMemo<ColumnDef<StockUnit>[]>(
    () => [
      {
        accessorKey: "unit_code",
        header: () => <span>KODE BARCODE / QR UNIT</span>,
        cell: ({ row }) => <span className="font-mono text-xs font-bold">{row.original.unit_code}</span>,
      },
      {
        id: "batch",
        header: () => <span>NO. BATCH</span>,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.product_batch?.batch_number || "—"}</span>,
      },
      {
        id: "ed",
        header: () => <span>EXPIRED DATE</span>,
        cell: ({ row }) => <span className="text-xs">{formatDateID(row.original.product_batch?.expired_date)}</span>,
      },
      {
        accessorKey: "location",
        header: () => <span>LOKASI RAK</span>,
        cell: ({ row }) => <span className="text-xs">{row.original.location || "—"}</span>,
      },
      {
        accessorKey: "status",
        header: () => <span>STATUS</span>,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "in_stock" ? "default" : "secondary"} className="rounded-none text-[10px] uppercase font-mono">
            {row.original.status}
          </Badge>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat detail variasi...
      </div>
    );
  }

  if (!detail?.variant) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Variasi tidak ditemukan</p>
        <Button onClick={() => navigate(backPath)} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">Kembali</Button>
      </div>
    );
  }

  const { variant, batches, units } = detail;

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(backPath)} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <Layers className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight">
                    {variant.product?.name} — {variant.variant_name}
                  </h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                    {variant.sku}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  Kategori: {variant.product?.category?.name || "—"} • Brand: {variant.product?.brand || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission("products.update") && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/products/${resolvedProductId}/variants/${id}/edit`}><Edit3 className="size-3.5 text-blue-600" /><span>Edit Variasi</span></Link>
              </Button>
            )}
            {hasPermission("products.delete") && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 shadow-none">
                <Trash2 className="size-3.5" /><span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">HARGA BELI STANDAR:</span>
              <span className="font-mono font-bold">{formatIDR(variant.buy_price)}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">HARGA JUAL STANDAR:</span>
              <span className="font-mono font-bold">{formatIDR(variant.sell_price)}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">FEE PRODUCT:</span>
              <span className="font-mono font-bold">
                {variant.fee_product_type === "percent" ? `${variant.fee_product_value}%` : formatIDR(variant.fee_product_value)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">STOK IN-STOCK:</span>
              <span className="font-mono font-bold text-emerald-600">{variant.stock_count || 0} {variant.product?.unit_name || "pcs"}</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          <DataTable
            embedded
            showSearch={false}
            columns={batchColumns}
            data={batches}
            cardTitle="BATCH MASUK (URUTAN FEFO)"
            entityName="Batch"
            pageSize={10}
          />
          <DataTable
            embedded
            columns={unitColumns}
            data={units}
            cardTitle="SELURUH ITEM UNIT DI DALAM VARIASI INI"
            searchPlaceholder="Cari kode barcode unit atau lokasi..."
            searchLabel="CARI UNIT"
            entityName="Unit"
            pageSize={10}
          />
        </div>
      </div>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Variasi" description="Yakin ingin menghapus variasi ini?" variant="destructive" />
    </div>
  );
}
