import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThousandInput } from "@/components/ui/thousand-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { suppliersApi, variantsApi, purchasesApi, type Supplier, type ProductVariant } from "@/lib/api";
import { formatIDR, formatDateInput, formatVariantDisplayName, getApiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingBag, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function PurchaseEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [autoPPN, setAutoPPN] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [form, setForm] = useState({
    invoice_number: "",
    supplier_id: "",
    purchase_date: formatDateInput(),
    payment_type: "termin" as "cash" | "termin",
    term_days: "30",
    discount_amount: "0",
    tax_amount: "0",
    notes: "",
    items: [] as { product_variant_id: string; qty_ordered: string; unit_cost: string; discount_amount: string }[],
  });

  useEffect(() => {
    setPageTitle("Edit Pembelian");
    Promise.all([purchasesApi.getById(Number(id)), suppliersApi.getAll(), variantsApi.getAll()])
      .then(([purRes, supRes, varRes]) => {
        const p = purRes.data.data;
        setSuppliers(supRes.data?.data || []);
        setVariants(varRes.data?.data || []);
        setForm({
          invoice_number: p.invoice_number,
          supplier_id: String(p.supplier_id),
          purchase_date: formatDateInput(p.purchase_date),
          payment_type: p.payment_type,
          term_days: String(p.term_days || 30),
          discount_amount: String(p.discount_amount || 0),
          tax_amount: String(p.tax_amount || 0),
          notes: p.notes || "",
          items: (p.items || []).map((it) => ({
            product_variant_id: String(it.product_variant_id),
            qty_ordered: String(it.qty_ordered),
            unit_cost: String(it.unit_cost),
            discount_amount: String(it.discount_amount || 0),
          })),
        });
        const initDpp = Math.max(0, (p.subtotal || 0) - (p.discount_amount || 0));
        if (p.tax_amount > 0 && Math.abs(p.tax_amount - Math.round(initDpp * 0.11)) <= 1) {
          setAutoPPN(true);
        }
      })
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat pembelian.") }))
      .finally(() => setFetching(false));
  }, [id, toast]);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: String(s.id),
        label: s.name,
        sublabel: `${s.code}${s.phone ? ` • ${s.phone}` : ""}`,
        keywords: `${s.code} ${s.contact_person || ""}`,
      })),
    [suppliers]
  );

  const variantOptions = useMemo(
    () =>
      variants.map((v) => ({
        value: String(v.id),
        label: `${formatVariantDisplayName(v)} (${v.sku})`,
        sublabel: `Beli: ${formatIDR(v.buy_price)} • Jual: ${formatIDR(v.sell_price)} • Stok: ${v.stock_count ?? 0}`,
        keywords: `${v.sku} ${v.product?.alternative_name || ""} ${v.barcode || ""}`,
      })),
    [variants]
  );

  const subtotalItems = form.items.reduce(
    (sum, it) => sum + Math.max(0, Number(it.qty_ordered || 0) * Number(it.unit_cost || 0) - Number(it.discount_amount || 0)),
    0
  );
  const notaDiscount = Number(form.discount_amount || 0);
  const dpp = Math.max(0, subtotalItems - notaDiscount);
  const notaTax = autoPPN ? Math.round(dpp * 0.11) : Number(form.tax_amount || 0);
  const grandTotal = dpp + notaTax;

  const handleTogglePPN11 = () => {
    setAutoPPN((prev) => {
      const next = !prev;
      setForm((f) => ({ ...f, tax_amount: next ? String(Math.round(dpp * 0.11)) : "0" }));
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih supplier terlebih dahulu." });
      return;
    }
    if (form.items.some((it) => !it.product_variant_id)) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih produk/variasi untuk setiap baris item." });
      return;
    }
    setLoading(true);
    try {
      await purchasesApi.update(Number(id), {
        invoice_number: form.invoice_number,
        supplier_id: Number(form.supplier_id),
        purchase_date: form.purchase_date,
        payment_type: form.payment_type,
        term_days: form.payment_type === "termin" ? Number(form.term_days || 30) : 0,
        discount_amount: notaDiscount,
        tax_amount: notaTax,
        notes: form.notes,
        items: form.items.map((it) => ({
          product_variant_id: Number(it.product_variant_id),
          qty_ordered: Number(it.qty_ordered || 1),
          unit_cost: Number(it.unit_cost || 0),
          discount_amount: Number(it.discount_amount || 0),
        })),
      });
      toast({ variant: "success", title: "Sukses!", description: "Draft pembelian diperbarui." });
      setTimeout(() => navigate(`/purchases/${id}`), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memperbarui pembelian.") });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat data pembelian...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/purchases/${id}`)} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Edit Pembelian: {form.invoice_number}</h1>
              <p className="text-[11px] text-neutral-500 font-mono">Perubahan hanya diizinkan sebelum item di-scan masuk</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">No. Invoice / PO *</label>
                <Input required value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Supplier *</label>
                <SearchableSelect
                  options={supplierOptions}
                  value={form.supplier_id}
                  onValueChange={(val) => {
                    const sup = suppliers.find((s) => String(s.id) === val);
                    setForm({
                      ...form,
                      supplier_id: val,
                      term_days: sup ? String(sup.default_term_days || 30) : form.term_days,
                    });
                  }}
                  placeholder="Pilih supplier..."
                  searchPlaceholder="Cari nama atau kode supplier..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Tanggal *</label>
                <Input type="date" required value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Metode Bayar</label>
                <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value as "cash" | "termin" })} className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none">
                  <option value="termin">Termin</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {form.payment_type === "termin" && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Tenor (Hari)</label>
                  <Input type="number" value={form.term_days} onChange={(e) => setForm({ ...form, term_days: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
                </div>
              )}
              <div className={form.payment_type === "termin" ? "sm:col-span-1 lg:col-span-3" : "sm:col-span-2 lg:col-span-4"}>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Catatan</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan pembelian (opsional)..." className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">Rincian Item Pembelian</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    items: [...prev.items, { product_variant_id: variants[0] ? String(variants[0].id) : "", qty_ordered: "1", unit_cost: variants[0] ? String(variants[0].buy_price || 0) : "0", discount_amount: "0" }],
                  }))
                }
                className="h-7 text-xs rounded-none gap-1"
              >
                <Plus className="size-3" /> Tambah Baris
              </Button>
            </div>
            <div className="border border-neutral-200 dark:border-neutral-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Produk / Variasi</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-40">Harga Beli (Rp)</TableHead>
                    <TableHead className="w-36">Diskon Item (Rp)</TableHead>
                    <TableHead className="w-40 text-right">Subtotal</TableHead>
                    <TableHead className="w-12 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.items.map((it, idx) => {
                    const lineSub = Math.max(
                      0,
                      Number(it.qty_ordered || 0) * Number(it.unit_cost || 0) - Number(it.discount_amount || 0)
                    );
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-center font-mono text-neutral-500">{idx + 1}</TableCell>
                        <TableCell className="min-w-[260px]">
                          <SearchableSelect
                            options={variantOptions}
                            value={it.product_variant_id}
                            onValueChange={(val) => {
                              const next = [...form.items];
                              next[idx].product_variant_id = val;
                              const v = variants.find((item) => String(item.id) === val);
                              if (v) next[idx].unit_cost = String(v.buy_price || 0);
                              setForm({ ...form, items: next });
                            }}
                            placeholder="Pilih produk / variasi..."
                            searchPlaceholder="Cari nama produk, variasi, atau SKU..."
                          />
                        </TableCell>
                        <TableCell>
                          <ThousandInput
                            allowDecimal={false}
                            required
                            value={it.qty_ordered}
                            onValueChange={(v) => {
                              const next = [...form.items];
                              next[idx].qty_ordered = v;
                              setForm({ ...form, items: next });
                            }}
                            className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900"
                          />
                        </TableCell>
                        <TableCell>
                          <ThousandInput
                            required
                            value={it.unit_cost}
                            onValueChange={(v) => {
                              const next = [...form.items];
                              next[idx].unit_cost = v;
                              setForm({ ...form, items: next });
                            }}
                            className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900"
                          />
                        </TableCell>
                        <TableCell>
                          <ThousandInput
                            value={it.discount_amount}
                            onValueChange={(v) => {
                              const next = [...form.items];
                              next[idx].discount_amount = v;
                              setForm({ ...form, items: next });
                            }}
                            className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                          {formatIDR(lineSub)}
                        </TableCell>
                        <TableCell className="text-center">
                          {form.items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-none text-destructive"
                              onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                              title="Hapus Baris"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      Subtotal Item
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                      {formatIDR(subtotalItems)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      Diskon Nota (Rp)
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-rose-600 text-[11px]">-</span>
                        <ThousandInput
                          value={form.discount_amount}
                          onValueChange={(v) => setForm({ ...form, discount_amount: v })}
                          className="h-8 text-xs text-right rounded-none bg-white dark:bg-neutral-900"
                        />
                      </div>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      <span className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleTogglePPN11}
                          className={`text-[10px] font-mono px-1.5 py-0.5 border cursor-pointer transition-colors ${
                            autoPPN
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                          title={autoPPN ? "Auto PPN 11% aktif (klik untuk matikan)" : "Aktifkan hitung otomatis PPN 11% dari (Subtotal - Diskon)"}
                        >
                          +11%
                        </button>
                        <span>Pajak / PPN (Rp)</span>
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-emerald-600 text-[11px]">+</span>
                        <ThousandInput
                          value={autoPPN ? String(notaTax) : form.tax_amount}
                          onValueChange={(v) => {
                            setAutoPPN(false);
                            setForm({ ...form, tax_amount: v });
                          }}
                          className="h-8 text-xs text-right rounded-none bg-white dark:bg-neutral-900"
                        />
                      </div>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow className="bg-neutral-100/70 dark:bg-neutral-900/60">
                    <TableCell colSpan={5} className="text-right text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                      Total Pembelian
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                      {formatIDR(grandTotal)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex justify-between border-t border-neutral-200 dark:border-neutral-800">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/purchases/${id}`)} className="h-8 rounded-none text-xs px-3">Batal</Button>
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
