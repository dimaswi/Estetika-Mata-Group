import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThousandInput } from "@/components/ui/thousand-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { productsApi, variantsApi, type Product } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Layers, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function VariantEdit() {
  const navigate = useNavigate();
  const { productId, id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    sku: "",
    variant_name: "",
    attr_power: "",
    buy_price: "0",
    sell_price: "0",
    fee_product_type: "fixed",
    fee_product_value: "0",
    barcode: "",
    is_active: true,
  });

  useEffect(() => {
    setPageTitle("Edit Variasi Produk");
    Promise.all([variantsApi.getDetail(Number(id)), productsApi.getAll()])
      .then(([detRes, prodRes]) => {
        const v = detRes.data.data.variant;
        let powerVal = "";
        try {
          const parsed = JSON.parse(v.attributes || "{}");
          powerVal = parsed.power || "";
        } catch {
          powerVal = "";
        }
        setFormData({
          product_id: String(v.product_id),
          sku: v.sku,
          variant_name: v.variant_name,
          attr_power: powerVal,
          buy_price: String(v.buy_price),
          sell_price: String(v.sell_price),
          fee_product_type: v.fee_product_type || "fixed",
          fee_product_value: String(v.fee_product_value || 0),
          barcode: v.barcode || "",
          is_active: v.is_active,
        });
        setProducts(prodRes.data?.data || []);
      })
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat variasi.") }))
      .finally(() => setFetching(false));
  }, [id, toast]);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: `[${p.category?.name || "N/A"}] ${p.name} (${p.sku_prefix})`,
        keywords: `${p.sku_prefix} ${p.alternative_name || ""}`,
      })),
    [products]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const attrs = formData.attr_power.trim() ? JSON.stringify({ power: formData.attr_power.trim() }) : "{}";
      await variantsApi.update(Number(id), {
        product_id: Number(formData.product_id),
        sku: formData.sku,
        variant_name: formData.variant_name,
        attributes: attrs,
        buy_price: Number(formData.buy_price || 0),
        sell_price: Number(formData.sell_price || 0),
        fee_product_type: formData.fee_product_type,
        fee_product_value: Number(formData.fee_product_value || 0),
        barcode: formData.barcode,
        is_active: formData.is_active,
      });
      toast({ variant: "success", title: "Sukses!", description: "Variasi berhasil diperbarui." });
      const targetProdId = formData.product_id || productId;
      setTimeout(() => navigate(targetProdId ? `/products/${targetProdId}` : "/products"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memperbarui variasi.") });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat data variasi...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/products/${formData.product_id || productId}/variants/${id}`)} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Layers className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Edit Variasi: {formData.variant_name}</h1>
              <p className="text-[11px] text-neutral-500 font-mono">SKU: {formData.sku} • ID #{id}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Produk Induk *</label>
                <SearchableSelect
                  options={productOptions}
                  value={formData.product_id}
                  onValueChange={(val) => setFormData({ ...formData, product_id: val })}
                  placeholder="Pilih produk..."
                  searchPlaceholder="Cari nama atau SKU produk..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">SKU Variasi *</label>
                <Input required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Nama Variasi *</label>
                <Input required value={formData.variant_name} onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Atribut Power / Ukuran</label>
                <Input value={formData.attr_power} onChange={(e) => setFormData({ ...formData, attr_power: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Harga Beli (Rp)</label>
                <ThousandInput value={formData.buy_price} onValueChange={(v) => setFormData({ ...formData, buy_price: v })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Harga Jual (Rp)</label>
                <ThousandInput value={formData.sell_price} onValueChange={(v) => setFormData({ ...formData, sell_price: v })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Fee Product</label>
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
              <div className="flex items-center justify-between h-8 px-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">Aktif</span>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/products/${formData.product_id || productId}/variants/${id}`)} className="h-8 rounded-none text-xs px-3">Batal</Button>
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
