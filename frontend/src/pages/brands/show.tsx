import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brandsApi, type Brand } from "@/lib/api";
import { formatDateID, getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ArrowLeft, Loader2, Edit3, Trash2, Award, CheckCircle2, XCircle, Eye } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function BrandShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle("Detail Brand");
    brandsApi
      .getById(Number(id))
      .then((res) => setBrand(res.data.data))
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail brand.") }))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await brandsApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Brand berhasil dihapus." });
      setTimeout(() => navigate("/brands"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus brand.") });
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat detail brand...
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Brand tidak ditemukan</p>
        <Button onClick={() => navigate("/brands")} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">Kembali</Button>
      </div>
    );
  }

  const products = brand.products || [];

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/brands")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <Award className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight">{brand.name}</h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">{brand.code}</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 border inline-flex items-center gap-1 ${brand.is_active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
                    }`}>
                    {brand.is_active ? <><CheckCircle2 className="size-3" /> ACTIVE</> : <><XCircle className="size-3" /> INACTIVE</>}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{brand.description || "Master Brand"}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission("brands.update") && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/brands/${id}/edit`}><Edit3 className="size-3.5 text-blue-600" /><span>Edit Brand</span></Link>
              </Button>
            )}
            {hasPermission("brands.delete") && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 shadow-none">
                <Trash2 className="size-3.5" /><span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">PABRIKAN:</span>
              <span className="font-bold">{brand.manufacturer || "—"}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">NEGARA ASAL:</span>
              <span className="font-mono font-bold">{brand.country || "—"}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">JUMLAH PRODUK:</span>
              <span className="font-mono font-bold">{products.length} Produk</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TANGGAL DIBUAT:</span>
              <span className="font-mono">{formatDateID(brand.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">
            Daftar Produk dengan Brand {brand.name} ({products.length})
          </h2>
          <div className="border border-neutral-200 dark:border-neutral-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prefix SKU</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Variasi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-neutral-500 font-mono">Belum ada produk di bawah brand ini.</TableCell></TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/products/${p.id}`)}>
                      <TableCell className="font-mono text-xs">{p.sku_prefix}</TableCell>
                      <TableCell className="text-xs">{p.category?.name || "—"}</TableCell>
                      <TableCell className="text-xs font-semibold">{p.name}</TableCell>
                      <TableCell className="text-xs font-mono">{p.variants?.length || 0} variasi</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-7 rounded-none" onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.id}`); }}>
                          <Eye className="size-3.5 text-blue-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Brand" description="Yakin ingin menghapus brand ini?" variant="destructive" />
    </div>
  );
}
