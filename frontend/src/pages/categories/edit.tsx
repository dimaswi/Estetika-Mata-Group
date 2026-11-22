import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { categoriesApi, type Category } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FolderTree, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function CategoryEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [parents, setParents] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    parent_id: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    setPageTitle("Edit Kategori Produk");
    Promise.all([categoriesApi.getById(Number(id)), categoriesApi.getAll()])
      .then(([catRes, listRes]) => {
        const cat = catRes.data.data;
        setFormData({
          code: cat.code,
          name: cat.name,
          parent_id: cat.parent_id ? String(cat.parent_id) : "",
          description: cat.description || "",
          is_active: cat.is_active,
        });
        setParents((listRes.data?.data || []).filter((c) => c.id !== Number(id)));
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat kategori.") });
      })
      .finally(() => setFetching(false));
  }, [id, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await categoriesApi.update(Number(id), {
        code: formData.code,
        name: formData.name,
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
        description: formData.description,
        is_active: formData.is_active,
      });
      toast({ variant: "success", title: "Sukses!", description: "Kategori berhasil diperbarui." });
      setTimeout(() => navigate(`/categories/${id}`), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memperbarui kategori.") });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
        Memuat data kategori...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/categories")}
              className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <FolderTree className="size-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                  Edit Kategori: {formData.name}
                </h1>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Kode: {formData.code} • ID #{id}
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Kode Kategori <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Induk Kategori
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none shadow-none cursor-pointer"
                >
                  <option value="">— Tanpa Induk —</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Deskripsi
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none"
                />
              </div>
              <div className="flex items-center justify-between h-8 px-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Status Aktif</span>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/categories")} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 shadow-none">
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3.5 gap-1.5 shadow-none">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Perubahan</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
