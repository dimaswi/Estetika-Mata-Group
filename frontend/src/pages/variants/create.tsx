import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThousandInput } from "@/components/ui/thousand-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { productsApi, variantsApi, type Product } from "@/lib/api";
import { generateAutoCode, getApiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Layers, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function VariantCreate() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: productId || "",
    sku: generateAutoCode("VAR"),
    variant_name: "",
    attr_power: "",
    buy_price: "0",
    sell_price: "0",
    fee_product_type: "fixed",
    fee_product_value: "0",
    barcode: "",
  });

  useEffect(() => {
    setPageTitle("Tambah Variasi Produk");
    productsApi.getAll().then((res) => {
      const list = res.data?.data || [];
      setProducts(list);
      const target = list.find((p) => String(p.id) === productId) || list[0];
      if (target) {
        const nextSeq = String((target.variants?.length || 0) + 1).padStart(3, "0");
        setFormData((prev) => ({
          ...prev,
          product_id: prev.product_id || String(target.id),
          sku: `${target.sku_prefix}-${nextSeq}`,
        }));
      }
    }).catch(() => {});
  }, [productId]);

  const handleProductChange = (pid: string) => {
    const selected = products.find((p) => String(p.id) === pid);
    if (selected) {
      const nextSeq = String((selected.variants?.length || 0) + 1).padStart(3, "0");
      setFormData((prev) => ({
        ...prev,
        product_id: pid,
        sku: `${selected.sku_prefix}-${nextSeq}`,
      }));
    } else {
      setFormData((prev) => ({ ...prev, product_id: pid }));
    }
  };

  const backPath = productId ? `/products/${productId}` : "/products";

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
      await variantsApi.create({
        product_id: Number(formData.product_id),
        sku: formData.sku,
        variant_name: formData.variant_name,
        attributes: attrs,
        buy_price: Number(formData.buy_price || 0),
        sell_price: Number(formData.sell_price || 0),
        fee_product_type: formData.fee_product_type,
        fee_product_value: Number(formData.fee_product_value || 0),
        barcode: formData.barcode,
      });
      toast({ variant: "success", title: "Sukses!", description: "Variasi produk berhasil ditambahkan." });
      const targetProdId = formData.product_id || productId;
      setTimeout(() => navigate(targetProdId ? `/products/${targetProdId}` : backPath), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menambah variasi.") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(backPath)} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Layers className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Tambah Variasi Produk Baru</h1>
              <p className="text-[11px] text-neutral-500 font-mono">Contoh: Power +2.50, Power +3.00, Size M, atau ukuran spesifik</p>
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
                  onValueChange={handleProductChange}
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
                <Input required autoFocus placeholder="Contoh: Power +2.50" value={formData.variant_name} onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Atribut Power / Ukuran</label>
                <Input placeholder="Contoh: +2.50" value={formData.attr_power} onChange={(e) => setFormData({ ...formData, attr_power: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Harga Beli Standar (Rp)</label>
                <ThousandInput value={formData.buy_price} onValueChange={(v) => setFormData({ ...formData, buy_price: v })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Harga Jual Standar (Rp)</label>
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
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Barcode Kemasan Pabrik</label>
                <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(backPath)} className="h-8 rounded-none text-xs px-3">Batal</Button>
            <Button type="submit" size="sm" disabled={loading} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3.5 gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Variasi</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
