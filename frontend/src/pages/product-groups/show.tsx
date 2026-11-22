import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productGroupsApi, type ProductGroup } from "@/lib/api";
import { formatIDR, getApiErrorMessage, isStandaloneVariant } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ArrowLeft, Loader2, Edit3, Trash2, Boxes } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function ProductGroupShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [group, setGroup] = useState<ProductGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle("Detail Pengelompokan Produk");
    productGroupsApi
      .getById(Number(id))
      .then((res) => setGroup(res.data.data))
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail kelompok.") }))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await productGroupsApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Kelompok produk dihapus." });
      setTimeout(() => navigate("/product-groups"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus kelompok.") });
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat detail kelompok...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Kelompok produk tidak ditemukan</p>
        <Button onClick={() => navigate("/product-groups")} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">Kembali</Button>
      </div>
    );
  }

  const items = group.items || [];

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/product-groups")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <Boxes className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight">{group.name}</h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">{group.code}</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{group.description || group.group_type}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission("products.update") && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/product-groups/${id}/edit`}><Edit3 className="size-3.5 text-blue-600" /><span>Edit Kelompok</span></Link>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">KODE:</span>
              <span className="font-mono font-bold">{group.code}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TIPE KELOMPOK:</span>
              <span className="font-mono uppercase font-bold">{group.group_type}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL VARIASI ANGGOTA:</span>
              <span className="font-mono font-bold">{items.length} Variasi</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">Anggota Variasi Produk ({items.length})</h2>
          <div className="border border-neutral-200 dark:border-neutral-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 dark:bg-neutral-900/50">
                  <TableHead className="text-xs font-bold uppercase">SKU</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Kategori &amp; Produk</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Variasi</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Harga Jual</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Stok In-Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-neutral-500 font-mono">Belum ada anggota.</TableCell></TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow
                      key={it.id}
                      className="cursor-pointer"
                      onClick={() => {
                        const pid = it.product_variant?.product_id;
                        if (!pid) return;
                        navigate(
                          isStandaloneVariant(it.product_variant)
                            ? `/products/${pid}`
                            : `/products/${pid}/variants/${it.product_variant_id}`
                        );
                      }}
                    >
                      <TableCell className="font-mono text-xs font-bold">{it.product_variant?.sku}</TableCell>
                      <TableCell className="text-xs">{it.product_variant?.product?.category?.name} — {it.product_variant?.product?.name}</TableCell>
                      <TableCell className="text-xs font-semibold">
                        {isStandaloneVariant(it.product_variant) ? "Tunggal" : it.product_variant?.variant_name}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{formatIDR(it.product_variant?.sell_price)}</TableCell>
                      <TableCell className="text-xs font-mono font-bold">{it.product_variant?.stock_count ?? 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Kelompok" description="Yakin ingin menghapus kelompok produk ini?" variant="destructive" />
    </div>
  );
}
