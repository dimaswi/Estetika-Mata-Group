import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productGroupsApi, variantsApi, type ProductVariant } from "@/lib/api";
import { getApiErrorMessage, isStandaloneVariant } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Boxes, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function ProductGroupEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    group_type: "attribute_group",
    description: "",
    selectedVariantIds: [] as number[],
  });

  useEffect(() => {
    setPageTitle("Edit Pengelompokan Produk");
    Promise.all([productGroupsApi.getById(Number(id)), variantsApi.getAll()])
      .then(([grpRes, varRes]) => {
        const g = grpRes.data.data;
        setForm({
          code: g.code,
          name: g.name,
          group_type: g.group_type || "attribute_group",
          description: g.description || "",
          selectedVariantIds: (g.items || []).map((i) => i.product_variant_id),
        });
        setVariants(varRes.data?.data || []);
      })
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat kelompok produk.") }))
      .finally(() => setFetching(false));
  }, [id, toast]);

  const toggleVariant = (vid: number) => {
    setForm((prev) => ({
      ...prev,
      selectedVariantIds: prev.selectedVariantIds.includes(vid)
        ? prev.selectedVariantIds.filter((v) => v !== vid)
        : [...prev.selectedVariantIds, vid],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await productGroupsApi.update(Number(id), {
        code: form.code,
        name: form.name,
        group_type: form.group_type,
        description: form.description,
        items: form.selectedVariantIds.map((vid) => ({ product_variant_id: vid, default_qty: 1 })),
      });
      toast({ variant: "success", title: "Sukses!", description: "Kelompok produk diperbarui." });
      setTimeout(() => navigate(`/product-groups/${id}`), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memperbarui kelompok.") });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat data kelompok...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/product-groups/${id}`)} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Boxes className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Edit Kelompok: {form.name}</h1>
              <p className="text-[11px] text-neutral-500 font-mono">Kode: {form.code} • ID #{id}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Kode Kelompok *</label>
                <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Nama Kelompok *</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Tipe Kelompok</label>
                <select value={form.group_type} onChange={(e) => setForm({ ...form, group_type: e.target.value })} className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none">
                  <option value="attribute_group">Kelompok Atribut</option>
                  <option value="bundle">Paket / Bundling</option>
                  <option value="rack">Lokasi Rak</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Deskripsi</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
            </div>
          </div>

          <div className="p-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2">
              Pilih Variasi Anggota ({form.selectedVariantIds.length} dipilih)
            </label>
            <div className="border border-neutral-200 dark:border-neutral-800 max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
              {variants.map((v) => (
                <label key={v.id} className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer">
                  <input type="checkbox" checked={form.selectedVariantIds.includes(v.id)} onChange={() => toggleVariant(v.id)} />
                  <span className="font-mono font-bold">{v.sku}</span>
                  <span className="font-semibold">{v.product?.name}</span>
                  {!isStandaloneVariant(v) && <span>— {v.variant_name}</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex justify-between border-t border-neutral-200 dark:border-neutral-800">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/product-groups/${id}`)} className="h-8 rounded-none text-xs px-3">Batal</Button>
            <Button type="submit" size="sm" disabled={loading} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3.5 gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Perubahan</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
