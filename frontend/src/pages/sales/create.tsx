import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThousandInput } from "@/components/ui/thousand-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { variantsApi, customersApi, salesApi, type ProductVariant, type Customer } from "@/lib/api";
import { formatIDR, formatDateInput, formatVariantDisplayName, getApiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Receipt, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function SaleCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [autoPPN, setAutoPPN] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [form, setForm] = useState({
    invoice_number: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    doctor_name: "",
    sale_date: formatDateInput(),
    payment_type: "termin" as "cash" | "termin" | "consignment",
    term_days: "30",
    discount_amount: "0",
    tax_amount: "0",
    notes: "",
    items: [{ product_variant_id: "", qty_ordered: "1", unit_price: "0", discount_amount: "0" }],
  });

  const formatCustomerAddress = (c?: Customer) =>
    c
      ? [c.address, c.subdistrict, c.city, c.province, c.postal_code].filter(Boolean).join(", ")
      : "";

  const applySelectedCustomer = (custId: string, custList: Customer[]) => {
    const cust = custList.find((c) => String(c.id) === custId);
    if (!cust) return {};
    return {
      customer_id: custId,
      customer_name: cust.name,
      customer_phone: cust.phone || "",
      customer_address: formatCustomerAddress(cust),
      doctor_name: /^dr\b/i.test(cust.name) ? cust.name : "",
      term_days: String(cust.default_term_days || 30),
    };
  };

  useEffect(() => {
    setPageTitle("Buat Transaksi Penjualan");
    Promise.all([customersApi.getAll(), variantsApi.getAll()])
      .then(([custRes, varRes]) => {
        const cList = (custRes.data?.data || []).filter((c) => c.is_active);
        const vList = varRes.data?.data || [];
        setCustomers(cList);
        setVariants(vList);
        const firstAvailable = vList.find((v) => (v.stock_count ?? 0) > 0) || vList[0];
        setForm((prev) => ({
          ...prev,
          items: firstAvailable
            ? [
              {
                product_variant_id: String(firstAvailable.id),
                qty_ordered: "1",
                unit_price: String(firstAvailable.sell_price || 0),
                discount_amount: "0",
              },
            ]
            : prev.items,
        }));
      })
      .catch(() => { });
  }, []);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: c.name,
        sublabel: `${c.code}${c.phone ? ` • ${c.phone}` : ""}${c.city ? ` • ${c.city}` : ""}`,
        keywords: `${c.code} ${c.phone || ""} ${c.city || ""} ${c.address || ""}`,
      })),
    [customers]
  );

  const variantOptions = useMemo(
    () =>
      variants.map((v) => {
        const stock = v.stock_count ?? 0;
        return {
          value: String(v.id),
          label: `${formatVariantDisplayName(v)} (${v.sku})`,
          sublabel: `Jual: ${formatIDR(v.sell_price)} • Stok Ready: ${stock} • Beli: ${formatIDR(v.buy_price)}`,
          keywords: `${v.sku} ${v.product?.alternative_name || ""} ${v.barcode || ""}`,
          badge: stock <= 0 ? "Stok Kosong" : `Stok: ${stock}`,
          badgeVariant: (stock <= 0 ? "danger" : "success") as "danger" | "success",
        };
      }),
    [variants]
  );

  const addItemRow = () => {
    const defaultVar = variants.find((v) => (v.stock_count ?? 0) > 0) || variants[0];
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_variant_id: defaultVar ? String(defaultVar.id) : "",
          qty_ordered: "1",
          unit_price: defaultVar ? String(defaultVar.sell_price || 0) : "0",
          discount_amount: "0",
        },
      ],
    }));
  };

  const updateItemRow = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "product_variant_id") {
        const v = variants.find((item) => String(item.id) === value);
        if (v) next[idx].unit_price = String(v.sell_price || 0);
      }
      return { ...prev, items: next };
    });
  };

  const calcEstFee = (variantId: string, qty: number, lineSub: number) => {
    const v = variants.find((item) => String(item.id) === variantId);
    if (!v || !v.fee_product_value) return 0;
    if (String(v.fee_product_type || "").toLowerCase() === "percent") {
      return lineSub * (v.fee_product_value / 100);
    }
    return v.fee_product_value * qty;
  };

  const subtotalItems = form.items.reduce(
    (sum, it) => sum + Math.max(0, Number(it.qty_ordered || 0) * Number(it.unit_price || 0) - Number(it.discount_amount || 0)),
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
    if (!form.customer_id) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih pelanggan dari Master Pelanggan terlebih dahulu." });
      return;
    }
    if (form.items.some((it) => !it.product_variant_id)) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih produk/variasi untuk setiap baris item." });
      return;
    }
    setLoading(true);
    try {
      const res = await salesApi.create({
        invoice_number: form.invoice_number,
        customer_id: Number(form.customer_id),
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_address: form.customer_address,
        doctor_name: form.doctor_name,
        sale_date: form.sale_date,
        payment_type: form.payment_type,
        term_days: form.payment_type === "cash" ? 0 : Number(form.term_days || 0),
        discount_amount: notaDiscount,
        tax_amount: notaTax,
        pay_immediately: form.payment_type === "cash",
        payment_method: "cash",
        notes: form.notes,
        items: form.items.map((it) => ({
          product_variant_id: Number(it.product_variant_id),
          qty_ordered: Number(it.qty_ordered || 1),
          unit_price: Number(it.unit_price || 0),
          discount_amount: Number(it.discount_amount || 0),
        })),
      });
      toast({ variant: "success", title: "Sukses!", description: "Transaksi penjualan berhasil dibuat." });
      const createdId = res.data?.data?.id;
      setTimeout(() => navigate(createdId ? `/sales/${createdId}` : "/sales"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal membuat penjualan.") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full pb-8">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/sales")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Receipt className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Buat Transaksi Penjualan</h1>
              <p className="text-[11px] text-neutral-500 font-mono">Input invoice penjualan (Cash atau Termin) sebelum Scan Out barang keluar</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">No. Invoice *</label>
                <Input required value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Pelanggan / RS / Klinik *</label>
                <SearchableSelect
                  options={customerOptions}
                  value={form.customer_id}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      ...applySelectedCustomer(val, customers),
                    }))
                  }
                  placeholder="Pilih pelanggan..."
                  searchPlaceholder="Cari nama, kode, kota, atau no. HP..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Nama Dokter (Opsional)</label>
                <Input value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} placeholder="dr. ..." className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">No. Telepon / HP</label>
                <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="08..." className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Tanggal Penjualan *</label>
                <Input type="date" required value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Metode Bayar</label>
                <select
                  value={form.payment_type}
                  onChange={(e) => {
                    const nextType = e.target.value as "cash" | "termin" | "consignment";
                    setForm({
                      ...form,
                      payment_type: nextType,
                      term_days: nextType === "consignment" ? "0" : nextType === "termin" ? (form.term_days === "0" ? "30" : form.term_days) : "0",
                    });
                  }}
                  className="w-full h-8 px-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs rounded-none"
                >
                  <option value="termin">Termin (Piutang AR)</option>
                  <option value="cash">Cash (Lunas)</option>
                  <option value="consignment">Konsinyasi (Bayar Setelah Terpakai)</option>
                </select>
              </div>
              {form.payment_type !== "cash" && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">
                    {form.payment_type === "consignment" ? "Tenor Setelah Dipakai (Hari)" : "Tenor Termin (Hari)"}
                  </label>
                  <ThousandInput allowDecimal={false} value={form.term_days} onValueChange={(v) => setForm({ ...form, term_days: v })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
                </div>
              )}
              <div className={form.payment_type !== "cash" ? "" : "lg:col-span-2"}>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Alamat Customer</label>
                <Input value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} placeholder="Alamat pengiriman / penagihan..." className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Catatan</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan penjualan..." className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
            </div>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">Rincian Item Penjualan</h2>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow} className="h-7 text-xs rounded-none gap-1">
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
                    <TableHead className="w-40">Harga Jual (Rp)</TableHead>
                    <TableHead className="w-36">Diskon Item (Rp)</TableHead>
                    <TableHead className="w-32 text-right">Est. Fee</TableHead>
                    <TableHead className="w-40 text-right">Subtotal</TableHead>
                    <TableHead className="w-12 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.items.map((it, idx) => {
                    const qty = Number(it.qty_ordered || 0);
                    const lineSub = Math.max(0, qty * Number(it.unit_price || 0) - Number(it.discount_amount || 0));
                    const estFee = calcEstFee(it.product_variant_id, qty, lineSub);
                    const selectedVar = variants.find((v) => String(v.id) === it.product_variant_id);
                    const isEmptyStock = selectedVar ? (selectedVar.stock_count ?? 0) <= 0 : false;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-center font-mono text-neutral-500">{idx + 1}</TableCell>
                        <TableCell className="min-w-[260px]">
                          <SearchableSelect
                            options={variantOptions}
                            value={it.product_variant_id}
                            onValueChange={(val) => updateItemRow(idx, "product_variant_id", val)}
                            placeholder="Pilih produk / variasi..."
                            searchPlaceholder="Cari nama produk, variasi, atau SKU..."
                            className={isEmptyStock ? "border-rose-300 dark:border-rose-800" : undefined}
                          />
                        </TableCell>
                        <TableCell>
                          <ThousandInput
                            allowDecimal={false}
                            required
                            value={it.qty_ordered}
                            onValueChange={(v) => updateItemRow(idx, "qty_ordered", v)}
                            className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900"
                          />
                        </TableCell>
                        <TableCell>
                          <ThousandInput
                            required
                            value={it.unit_price}
                            onValueChange={(v) => updateItemRow(idx, "unit_price", v)}
                            className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900"
                          />
                        </TableCell>
                        <TableCell>
                          <ThousandInput
                            value={it.discount_amount}
                            onValueChange={(v) => updateItemRow(idx, "discount_amount", v)}
                            className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-neutral-500 whitespace-nowrap">
                          {formatIDR(estFee)}
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
                    <TableCell colSpan={6} className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      Subtotal Item
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                      {formatIDR(subtotalItems)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
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
                    <TableCell colSpan={6} className="text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      <span className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleTogglePPN11}
                          className={`text-[10px] font-mono px-1.5 py-0.5 border cursor-pointer transition-colors ${autoPPN
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
                    <TableCell colSpan={6} className="text-right text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                      Total Penjualan
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

          <div className="p-5 bg-white dark:bg-neutral-950 flex justify-between border-t border-neutral-200 dark:border-neutral-800">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/sales")} className="h-8 rounded-none text-xs px-3">Batal</Button>
            <Button type="submit" size="sm" disabled={loading} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3.5 gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Penjualan</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
