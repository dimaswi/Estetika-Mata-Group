import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThousandInput } from "@/components/ui/thousand-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { productsApi, categoriesApi, brandsApi, type Category, type Brand } from "@/lib/api";
import { getApiErrorMessage, UNIT_OPTIONS } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function ProductEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [existingVariantCount, setExistingVariantCount] = useState(0);
  const [formData, setFormData] = useState({
    category_id: "",
    brand_id: "",
    sku_prefix: "",
    name: "",
    alternative_name: "",
    brand: "",
    akl_number: "",
    unit_name: "pcs",
    min_stock_alert: "5",
    has_variants: false,
    buy_price: "0",
    sell_price: "0",
    fee_product_type: "fixed",
    fee_product_value: "0",
    barcode: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    setPageTitle("Edit Produk Alkes");
    Promise.all([productsApi.getById(Number(id)), categoriesApi.getAll(), brandsApi.getAll()])
      .then(([prodRes, catRes, brandRes]) => {
        const p = prodRes.data.data;
        const firstVar = p.variants?.[0];
        setExistingVariantCount(p.variants?.length || 0);
        setFormData({
          category_id: String(p.category_id),
          brand_id: p.brand_id ? String(p.brand_id) : "",
          sku_prefix: p.sku_prefix,
          name: p.name,
          alternative_name: p.alternative_name || "",
          brand: p.brand || "",
          akl_number: p.akl_number || "",
          unit_name: p.unit_name || "pcs",
          min_stock_alert: String(p.min_stock_alert || 5),
          has_variants: Boolean(p.has_variants),
          buy_price: firstVar ? String(firstVar.buy_price ?? 0) : "0",
          sell_price: firstVar ? String(firstVar.sell_price ?? 0) : "0",
          fee_product_type: firstVar?.fee_product_type || "fixed",
          fee_product_value: firstVar ? String(firstVar.fee_product_value ?? 0) : "0",
          barcode: firstVar?.barcode || "",
          description: p.description || "",
          is_active: p.is_active,
        });
        setCategories(catRes.data?.data || []);
        setBrands(brandRes.data?.data || []);
      })
      .catch((err) => {
        toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat data produk.") });
      })
      .finally(() => setFetching(false));
  }, [id, toast]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: String(c.id), label: c.name, sublabel: c.code })),
    [categories]
  );

  const brandOptions = useMemo(
    () => [
      { value: "", label: "— Tanpa Brand —" },
      ...brands.map((b) => ({ value: String(b.id), label: b.name, sublabel: b.code })),
    ],
    [brands]
  );

  const unitOptions = useMemo(() => {
    const base = UNIT_OPTIONS.map((u) => ({ value: u.value, label: u.label }));
    if (formData.unit_name && !UNIT_OPTIONS.some((u) => u.value === formData.unit_name)) {
      return [{ value: formData.unit_name, label: formData.unit_name }, ...base];
    }
    return base;
  }, [formData.unit_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await productsApi.update(Number(id), {
        category_id: Number(formData.category_id),
        brand_id: formData.brand_id ? Number(formData.brand_id) : null,
        sku_prefix: formData.sku_prefix,
        name: formData.name,
        alternative_name: formData.alternative_name,
        brand: formData.brand,
        akl_number: formData.akl_number,
        unit_name: formData.unit_name || "pcs",
        min_stock_alert: Number(formData.min_stock_alert || 5),
        has_variants: formData.has_variants,
        ...(formData.has_variants
          ? {}
          : {
              buy_price: Number(formData.buy_price || 0),
              sell_price: Number(formData.sell_price || 0),
              fee_product_type: formData.fee_product_type,
              fee_product_value: Number(formData.fee_product_value || 0),
              barcode: formData.barcode,
            }),
        description: formData.description,
        is_active: formData.is_active,
      });
      toast({ variant: "success", title: "Sukses!", description: "Produk berhasil diperbarui." });
      setTimeout(() => navigate(`/products/${id}`), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memperbarui produk.") });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
        Memuat data produk...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/products/${id}`)} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Package className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                Edit Produk: {formData.name}
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono">Prefix SKU: {formData.sku_prefix} • ID #{id}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Kategori <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={categoryOptions}
                  value={formData.category_id}
                  onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                  placeholder="Pilih kategori..."
                  searchPlaceholder="Cari kategori..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Prefix SKU *</label>
                <Input required value={formData.sku_prefix} onChange={(e) => setFormData({ ...formData, sku_prefix: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Nama Produk *</label>
                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Nama Produk Alternatif</label>
                <Input placeholder="Nama lain / alias produk (opsional)" value={formData.alternative_name} onChange={(e) => setFormData({ ...formData, alternative_name: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Brand / Merk</label>
                <SearchableSelect
                  options={brandOptions}
                  value={formData.brand_id}
                  onValueChange={(val) => {
                    const selected = brands.find((b) => String(b.id) === val);
                    setFormData({ ...formData, brand_id: val, brand: selected ? selected.name : "" });
                  }}
                  placeholder="— Pilih Brand —"
                  searchPlaceholder="Cari brand..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">No. AKL Kemenkes</label>
                <Input value={formData.akl_number} onChange={(e) => setFormData({ ...formData, akl_number: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Satuan</label>
                <SearchableSelect
                  options={unitOptions}
                  value={formData.unit_name}
                  onValueChange={(val) => setFormData({ ...formData, unit_name: val })}
                  placeholder="Pilih satuan..."
                  searchPlaceholder="Cari satuan..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Min. Stok Alert</label>
                <ThousandInput allowDecimal={false} value={formData.min_stock_alert} onValueChange={(v) => setFormData({ ...formData, min_stock_alert: v })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Tipe Variasi Produk</label>
                <select
                  value={formData.has_variants ? "yes" : "no"}
                  onChange={(e) => {
                    const nextVal = e.target.value === "yes";
                    if (!nextVal && existingVariantCount > 1) {
                      toast({
                        variant: "destructive",
                        title: "Tidak dapat mengubah tipe",
                        description: "Produk masih memiliki lebih dari 1 variasi. Hapus variasi tambahan terlebih dahulu.",
                      });
                      return;
                    }
                    setFormData({ ...formData, has_variants: nextVal });
                  }}
                  className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none shadow-none cursor-pointer"
                >
                  <option value="no">Tidak Ada Variasi (Produk Tunggal)</option>
                  <option value="yes">Memiliki Variasi (Power / Ukuran / Tipe)</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Deskripsi</label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
              </div>
              <div className="flex items-center justify-between h-8 px-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Status Aktif</span>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              </div>
            </div>

            {!formData.has_variants ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-neutral-200/80 dark:border-neutral-800">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Harga Beli Standar (Rp)</label>
                  <ThousandInput value={formData.buy_price} onValueChange={(v) => setFormData({ ...formData, buy_price: v })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Harga Jual Standar (Rp)</label>
                  <ThousandInput value={formData.sell_price} onValueChange={(v) => setFormData({ ...formData, sell_price: v })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Fee Product</label>
                  <div className="flex h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden focus-within:ring-1 focus-within:ring-neutral-400">
                    <select
                      value={formData.fee_product_type}
                      onChange={(e) => setFormData({ ...formData, fee_product_type: e.target.value })}
                      className="h-full w-14 shrink-0 px-2 bg-neutral-100/80 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-800 text-xs font-mono font-semibold outline-none cursor-pointer"
                    >
                      <option value="fixed">Rp</option>
                      <option value="percent">%</option>
                    </select>
                    {formData.fee_product_type === "fixed" ? (
                      <ThousandInput
                        value={formData.fee_product_value}
                        onValueChange={(v) => setFormData({ ...formData, fee_product_value: v })}
                        className="h-full flex-1 border-0 rounded-none bg-transparent shadow-none focus-visible:ring-0 text-xs"
                      />
                    ) : (
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.fee_product_value}
                        onChange={(e) => setFormData({ ...formData, fee_product_value: e.target.value })}
                        className="h-full flex-1 border-0 rounded-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-mono"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Barcode Kemasan Pabrik</label>
                  <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} placeholder="Opsional..." className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-mono" />
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-mono text-neutral-500 pt-1 border-t border-neutral-200/80 dark:border-neutral-800">
                * Produk dengan variasi: harga beli, harga jual, fee, dan barcode diatur per masing-masing variasi di halaman Detail Produk.
              </p>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/products/${id}`)} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 shadow-none">
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
