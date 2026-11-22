import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { productsApi, categoriesApi, type Product, type Category } from "@/lib/api";
import { formatIDR, getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Package, Plus, RefreshCw, Layers, Edit3, Search, ArrowRight } from "lucide-react";
import { createProductColumns } from "./columns";
import { cn } from "@/lib/utils";
import { setPageTitle } from "@/lib/page-title";

function ProductVariationsDrawer({
  product,
  canUpdate,
  onNavigate,
}: {
  product: Product;
  canUpdate: boolean;
  onNavigate: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const sorted = useMemo(
    () => [...(product.variants || [])].sort((a, b) => a.sku.localeCompare(b.sku)),
    [product.variants]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (v) => v.sku.toLowerCase().includes(q) || v.variant_name.toLowerCase().includes(q)
    );
  }, [sorted, query]);

  return (
    <div className="pl-12 pr-4 py-3 bg-neutral-100/80 dark:bg-neutral-900/70 border-l-4 border-neutral-900 dark:border-white space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Layers className="size-3.5" />
          <span>Daftar Variasi ({sorted.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {sorted.length > 8 && (
            <div className="relative">
              <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Filter variasi..."
                className="h-7 pl-7 pr-2 text-xs rounded-none bg-white dark:bg-neutral-950 w-44 shadow-none"
              />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/products/${product.id}`);
            }}
            className="h-7 rounded-none text-[11px] px-2.5 gap-1 bg-white dark:bg-neutral-950"
          >
            <span>Kelola di Detail Produk</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-4 text-center text-xs text-neutral-500 font-mono bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
          Variasi tidak ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto pr-1">
          {filtered.map((v) => {
            const stock = v.stock_count || 0;
            const lowStock = stock <= product.min_stock_alert;
            return (
              <div
                key={v.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(`/products/${product.id}/variants/${v.id}`);
                }}
                className="group bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-500 dark:hover:border-neutral-500 p-2 cursor-pointer transition-colors flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {v.variant_name}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 truncate">
                      {v.sku}
                    </div>
                  </div>
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/products/${product.id}/variants/${v.id}/edit`);
                      }}
                      title="Edit Variasi"
                      className="opacity-0 group-hover:opacity-100 text-amber-500 hover:text-amber-600 p-0.5 transition-opacity shrink-0"
                    >
                      <Edit3 className="size-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                  <span className="text-[11px] font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                    {formatIDR(v.sell_price)}
                  </span>
                  <Badge
                    variant={lowStock ? "destructive" : "secondary"}
                    className="rounded-none text-[9px] font-mono px-1.5 py-0 h-4"
                  >
                    {stock} {product.unit_name}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProductsIndex() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle("Master Produk");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setProducts(prodRes.data?.data || []);
      setCategories(catRes.data?.data || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat data produk.") });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await productsApi.delete(deleteId);
      toast({ variant: "success", title: "Sukses!", description: "Produk berhasil dihapus." });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus produk.") });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const columns = useMemo(
    () =>
      createProductColumns({
        onView: (id) => navigate(`/products/${id}`),
        onEdit: (id) => navigate(`/products/${id}/edit`),
        onDelete: (id) => {
          setDeleteId(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission("products.view"),
        hasEditPermission: hasPermission("products.update"),
        hasDeletePermission: hasPermission("products.delete"),
      }),
    [hasPermission, navigate]
  );

  const filteredData = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "all" && String(p.category_id) !== categoryFilter) return false;
      return true;
    });
  }, [products, categoryFilter]);

  const filterSlot = (
    <div>
      <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
        KATEGORI PRODUK
      </label>
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 rounded-none shadow-none outline-none cursor-pointer font-medium"
      >
        <option value="all">Semua Kategori</option>
        {categories.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={loadData}
        disabled={loading}
        className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none"
        title="Muat Ulang Data"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
      {hasPermission("products.create") && (
        <Button
          size="sm"
          onClick={() => navigate("/products/create")}
          className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3 gap-1.5 shadow-none"
        >
          <Plus className="size-3.5" />
          <span>Tambah Produk</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={filteredData}
        cardTitle="MASTER PRODUK ALKES"
        cardSubtitle="Data master produk alkes per kategori & brand"
        cardIcon={<Package className="size-4" />}
        searchPlaceholder="Cari produk berdasarkan nama, nama alternatif, prefix SKU, merk, atau AKL..."
        searchLabel="CARI PRODUK"
        entityName="Produk"
        filterSlot={filterSlot}
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        hasActiveFilters={categoryFilter !== "all"}
        onResetFilters={() => setCategoryFilter("all")}
        getRowCanExpand={(p) => Boolean(p.has_variants && (p.variants?.length || 0) > 0)}
        renderSubComponent={(p) => (
          <ProductVariationsDrawer
            product={p}
            canUpdate={hasPermission("products.update")}
            onNavigate={(path) => navigate(path)}
          />
        )}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Produk"
        description="Produk yang sudah memiliki unit stok tidak dapat dihapus. Lanjutkan?"
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
      />
    </div>
  );
}
