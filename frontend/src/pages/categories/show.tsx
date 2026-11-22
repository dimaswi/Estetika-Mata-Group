import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { categoriesApi, type Category } from "@/lib/api";
import { formatDateID, getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Edit3, Trash2, FolderTree, CheckCircle2, XCircle, Eye } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function CategoryShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle("Detail Kategori Produk");
    categoriesApi
      .getById(Number(id))
      .then((res) => setCategory(res.data.data))
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail kategori.") }))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteDialogOpen(false);
    try {
      await categoriesApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Kategori berhasil dihapus." });
      setTimeout(() => navigate("/categories"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus kategori.") });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
        Memuat detail kategori...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Kategori tidak ditemukan</p>
        <Button onClick={() => navigate("/categories")} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">
          Kembali ke Daftar Kategori
        </Button>
      </div>
    );
  }

  const products = category.products || [];

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/categories")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <FolderTree className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">{category.name}</h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                    {category.code}
                  </span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 border inline-flex items-center gap-1 ${
                    category.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
                  }`}>
                    {category.is_active ? <><CheckCircle2 className="size-3" /> ACTIVE</> : <><XCircle className="size-3" /> INACTIVE</>}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  {category.description || "Kategori produk"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission("categories.update") && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/categories/${id}/edit`}>
                  <Edit3 className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Edit Kategori</span>
                </Link>
              </Button>
            )}
            {hasPermission("categories.delete") && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={deleting} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 shadow-none">
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                <span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">KODE KATEGORI:</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">{category.code}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">INDUK KATEGORI:</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{category.parent?.name || "—"}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">JUMLAH PRODUK:</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">{products.length} Produk</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TANGGAL DIBUAT:</span>
              <span className="font-mono text-neutral-800 dark:text-neutral-200">{formatDateID(category.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Daftar Produk dalam Kategori ({products.length})
            </h2>
          </div>
          <div className="border border-neutral-200 dark:border-neutral-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 dark:bg-neutral-900/50">
                  <TableHead className="text-xs font-bold uppercase">Prefix SKU</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Nama Produk</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Merk / AKL</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Variasi</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-xs text-neutral-500 font-mono">
                      Belum ada produk dalam kategori ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/products/${p.id}`)}>
                      <TableCell className="font-mono text-xs">{p.sku_prefix}</TableCell>
                      <TableCell className="text-xs font-semibold">{p.name}</TableCell>
                      <TableCell className="text-xs text-neutral-500">{p.brand || "—"} {p.akl_number ? `(${p.akl_number})` : ""}</TableCell>
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Kategori"
        description="Apakah Anda yakin ingin menghapus kategori ini?"
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
      />
    </div>
  );
}
