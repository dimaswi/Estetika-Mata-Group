import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThousandInput } from "@/components/ui/thousand-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { productsApi, categoriesApi, brandsApi, type Category, type Brand } from "@/lib/api";
import { generateAutoCode, getApiErrorMessage, UNIT_OPTIONS } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function ProductCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formData, setFormData] = useState({
    category_id: "",
    brand_id: "",
    sku_prefix: generateAutoCode("PRD"),
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
  });

  useEffect(() => {
    setPageTitle("Tambah Produk Alkes");
    Promise.all([categoriesApi.getAll(), brandsApi.getAll({ active_only: true })])
      .then(([catRes, brandRes]) => {
        const list = catRes.data?.data || [];
        setCategories(list);
        setBrands(brandRes.data?.data || []);
        if (list[0]) setFormData((prev) => ({ ...prev, category_id: String(list[0].id) }));
      })
      .catch(() => {});
  }, []);

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

  const unitOptions = useMemo(
    () => UNIT_OPTIONS.map((u) => ({ value: u.value, label: u.label })),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await productsApi.create({
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
      });
      toast({ variant: "success", title: "Sukses!", description: "Produk berhasil ditambahkan." });
      setTimeout(() => navigate("/products"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menambah produk.") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/products")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Package className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                Tambah Produk Alkes Baru
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono">
                Registrasi master produk sebelum menambahkan variasi (mis. Power +2.50)
              </p>
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
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Prefix SKU <span className="text-rose-500">*</span>
                </label>
                <Input required placeholder="Contoh: IOL-HYDRO" value={formData.sku_prefix} onChange={(e) => setFormData({ ...formData, sku_prefix: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <Input required placeholder="Contoh: Lensa Mata Intraokular Hydrophilic" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Nama Produk Alternatif
                </label>
                <Input placeholder="Nama lain / alias produk (opsional)" value={formData.alternative_name} onChange={(e) => setFormData({ ...formData, alternative_name: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none" />
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
                <Input value={formData.akl_number} onChange={(e) => setFormData({ ...formData, akl_number: e.target.value })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono" />
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
                <ThousandInput allowDecimal={false} value={formData.min_stock_alert} onValueChange={(v) => setFormData({ ...formData, min_stock_alert: v })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Tipe Variasi Produk</label>
                <select
                  value={formData.has_variants ? "yes" : "no"}
                  onChange={(e) => setFormData({ ...formData, has_variants: e.target.value === "yes" })}
                  className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none shadow-none cursor-pointer"
                >
                  <option value="no">Tidak Ada Variasi (Produk Tunggal)</option>
                  <option value="yes">Memiliki Variasi (Power / Ukuran / Tipe)</option>
                </select>
              </div>
              <div className="sm:col-span-1 lg:col-span-3">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Deskripsi</label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Spesifikasi umum produk..." className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none" />
              </div>
            </div>

            {!formData.has_variants ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-neutral-200/80 dark:border-neutral-800">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Harga Beli Standar (Rp)</label>
                  <ThousandInput value={formData.buy_price} onValueChange={(v) => setFormData({ ...formData, buy_price: v })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">Harga Jual Standar (Rp)</label>
                  <ThousandInput value={formData.sell_price} onValueChange={(v) => setFormData({ ...formData, sell_price: v })} className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none" />
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
                  <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} placeholder="Opsional..." className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono" />
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-mono text-neutral-500 pt-1 border-t border-neutral-200/80 dark:border-neutral-800">
                * Produk dengan variasi: harga beli, harga jual, fee, dan barcode diatur per masing-masing variasi di halaman Detail Produk.
              </p>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/products")} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 shadow-none">
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3.5 gap-1.5 shadow-none">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Produk</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
