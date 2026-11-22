import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { productsApi, variantsApi, type Product, type ProductVariant, type ProductBatch, type StockUnit } from "@/lib/api";
import { formatIDR, formatDateID, getApiErrorMessage, getEDBadgeInfo } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ArrowLeft, Loader2, Edit3, Trash2, Package, Plus, Eye, Layers, ArrowUpDown } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function ProductShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();

  const [product, setProduct] = useState<Product | null>(null);
  const [singleDetail, setSingleDetail] = useState<{ batches: ProductBatch[]; units: StockUnit[] }>({ batches: [], units: [] });
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      const res = await productsApi.getById(Number(id));
      const p = res.data.data;
      setProduct(p);
      if (p && !p.has_variants && p.variants?.[0]) {
        try {
          const vRes = await variantsApi.getDetail(p.variants[0].id);
          setSingleDetail({
            batches: vRes.data?.data?.batches || [],
            units: vRes.data?.data?.units || [],
          });
        } catch {
          setSingleDetail({ batches: [], units: [] });
        }
      } else {
        setSingleDetail({ batches: [], units: [] });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail produk.") });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    setPageTitle("Detail Produk");
    loadProduct();
  }, [loadProduct]);

  const confirmDeleteProduct = async () => {
    setDeleteDialogOpen(false);
    try {
      await productsApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Produk berhasil dihapus." });
      setTimeout(() => navigate("/products"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus produk.") });
    }
  };

  const variants = product?.variants || [];
  const defaultVariant = product && !product.has_variants ? variants[0] : undefined;
  const totalStock = variants.reduce((s, v) => s + (v.stock_count || 0), 0);
  const brandName = product?.brand_info?.name || product?.brand || "—";
  const unitName = product?.unit_name || "pcs";
  const minStockAlert = product?.min_stock_alert ?? 5;
  const productId = product?.id || Number(id);
  const canUpdate = hasPermission("products.update");

  const variantColumns = useMemo<ColumnDef<ProductVariant>[]>(
    () => [
      {
        id: "no",
        meta: { className: "w-12 text-center" },
        header: () => <span className="block text-center">NO</span>,
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          return <span className="font-mono text-neutral-500 text-xs">{pageIndex * pageSize + row.index + 1}</span>;
        },
      },
      {
        accessorKey: "sku",
        meta: { className: "w-40" },
        header: ({ column }) => (
          <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
            <span>SKU VARIASI</span>
            <ArrowUpDown className="size-3 text-neutral-400" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 rounded-none inline-block">
            {row.original.sku}
          </span>
        ),
      },
      {
        accessorKey: "variant_name",
        header: ({ column }) => (
          <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
            <span>NAMA VARIASI</span>
            <ArrowUpDown className="size-3 text-neutral-400" />
          </button>
        ),
        cell: ({ row }) => <span className="font-semibold text-xs">{row.original.variant_name}</span>,
      },
      {
        accessorKey: "buy_price",
        meta: { className: "text-right" },
        header: () => <span className="block text-right">HARGA BELI</span>,
        cell: ({ row }) => <span className="font-mono text-xs block text-right">{formatIDR(row.original.buy_price)}</span>,
      },
      {
        accessorKey: "sell_price",
        meta: { className: "text-right" },
        header: () => <span className="block text-right">HARGA JUAL</span>,
        cell: ({ row }) => <span className="font-mono text-xs block text-right">{formatIDR(row.original.sell_price)}</span>,
      },
      {
        id: "fee",
        meta: { className: "text-right" },
        header: () => <span className="block text-right">FEE</span>,
        cell: ({ row }) => (
          <span className="font-mono text-xs block text-right">
            {row.original.fee_product_type === "percent"
              ? `${row.original.fee_product_value}%`
              : formatIDR(row.original.fee_product_value)}
          </span>
        ),
      },
      {
        accessorKey: "stock_count",
        meta: { className: "text-center" },
        header: () => <span className="block text-center">STOK UNIT</span>,
        cell: ({ row }) => {
          const cnt = row.original.stock_count || 0;
          return (
            <div className="text-center">
              <Badge variant={cnt <= minStockAlert ? "destructive" : "secondary"} className="rounded-none text-[10px] font-mono">
                {cnt} {unitName}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "actions",
        meta: { className: "w-24 text-right" },
        header: () => <span className="block text-right">AKSI</span>,
        cell: ({ row }) => {
          const v = row.original;
          return (
            <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="size-7 rounded-none" onClick={() => navigate(`/products/${productId}/variants/${v.id}`)} title="Lihat Detail & Unit">
                <Eye className="size-3.5 text-blue-500" />
              </Button>
              {canUpdate && (
                <Button variant="ghost" size="icon" className="size-7 rounded-none" onClick={() => navigate(`/products/${productId}/variants/${v.id}/edit`)} title="Edit Variasi">
                  <Edit3 className="size-3.5 text-amber-500" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [minStockAlert, unitName, productId, canUpdate, navigate]
  );

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
        <Loader2 className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
        Memuat detail produk...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Produk tidak ditemukan</p>
        <Button onClick={() => navigate("/products")} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">
          Kembali ke Daftar Produk
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/products")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <Package className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">{product.name}</h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                    {product.sku_prefix}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 uppercase">
                    {product.category?.name || "—"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  {product.alternative_name ? `Alt: ${product.alternative_name} • ` : ""}Brand: {brandName} • AKL: {product.akl_number || "—"} • Satuan: {product.unit_name}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission("products.update") && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/products/${id}/edit`}>
                  <Edit3 className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Edit Produk</span>
                </Link>
              </Button>
            )}
            {hasPermission("products.delete") && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 shadow-none">
                <Trash2 className="size-3.5" />
                <span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          {product.has_variants ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">KATEGORI &amp; BRAND:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{product.category?.name || "—"} / {brandName}</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL VARIASI:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{variants.length} Variasi</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL STOK TERSEDIA:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{totalStock} {product.unit_name}</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">MIN. STOK ALERT:</span>
                <span className="font-mono text-neutral-800 dark:text-neutral-200">{product.min_stock_alert} {product.unit_name}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TIPE PRODUK:</span>
                <span className="font-bold text-neutral-900 dark:text-white">Produk Tunggal (Tanpa Variasi)</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">HARGA BELI STANDAR:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{formatIDR(defaultVariant?.buy_price)}</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">HARGA JUAL STANDAR:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{formatIDR(defaultVariant?.sell_price)}</span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">FEE PRODUCT:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  {defaultVariant?.fee_product_type === "percent"
                    ? `${defaultVariant?.fee_product_value || 0}%`
                    : formatIDR(defaultVariant?.fee_product_value)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL STOK TERSEDIA:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {totalStock} {product.unit_name}{defaultVariant?.barcode ? ` • Barcode: ${defaultVariant.barcode}` : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {product.has_variants ? (
          <DataTable
            embedded
            columns={variantColumns}
            data={variants}
            cardTitle={`VARIASI TERDAFTAR (${variants.length})`}
            cardSubtitle="Klik variasi untuk membuka detail & daftar unit item"
            cardIcon={<Layers className="size-4" />}
            searchPlaceholder="Cari SKU atau nama variasi..."
            searchLabel="CARI VARIASI"
            entityName="Variasi"
            pageSize={10}
            onRowClick={(v) => navigate(`/products/${product.id}/variants/${v.id}`)}
            toolbarActions={
              hasPermission("products.create") ? (
                <Button size="sm" onClick={() => navigate(`/products/${product.id}/variants/create`)} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3 gap-1.5 shadow-none">
                  <Plus className="size-3.5" />
                  <span>Tambah Variasi</span>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <DataTable
              embedded
              showSearch={false}
              columns={batchColumns}
              data={singleDetail.batches}
              cardTitle={`BATCH MASUK (URUTAN FEFO)`}
              cardSubtitle={`Min. Stok Alert: ${product.min_stock_alert} ${product.unit_name}`}
              entityName="Batch"
              pageSize={10}
            />
            <DataTable
              embedded
              columns={unitColumns}
              data={singleDetail.units}
              cardTitle={`SELURUH ITEM UNIT PRODUK INI`}
              searchPlaceholder="Cari kode unit atau lokasi rak..."
              searchLabel="CARI UNIT"
              entityName="Unit"
              pageSize={10}
            />
          </div>
        )}
      </div>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDeleteProduct} title="Hapus Produk" description="Yakin ingin menghapus produk ini?" variant="destructive" />
    </div>
  );
}
