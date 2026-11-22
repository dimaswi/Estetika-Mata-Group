import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThousandInput } from "@/components/ui/thousand-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { purchasesApi, inventoryApi, type Purchase } from "@/lib/api";
import { formatIDR, formatDateID, formatDateInput, formatVariantDisplayName, generateBatchCode, getApiErrorMessage, getEDBadgeInfo } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  ShoppingBag,
  ScanLine,
  CreditCard,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function PurchaseShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_date: formatDateInput(),
    amount: "0",
    payment_method: "transfer",
    reference_no: "",
    notes: "",
  });

  // Scan In modal
  const [scanOpen, setScanOpen] = useState(false);
  const [scanForm, setScanForm] = useState({
    purchase_item_id: "",
    batch_number: generateBatchCode(),
    expired_date: formatDateInput(),
    location: "Gudang Utama",
    auto_generate_count: "0",
    notes: "",
  });
  const [scanInput, setScanInput] = useState("");
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);

  const loadPurchase = useCallback(async () => {
    try {
      const res = await purchasesApi.getById(Number(id));
      const p = res.data.data;
      setPurchase(p);
      const pendingItem = p.items?.find((it) => it.qty_scanned_in < it.qty_ordered) || p.items?.[0];
      if (pendingItem) {
        setScanForm((prev) => ({
          ...prev,
          purchase_item_id: prev.purchase_item_id || String(pendingItem.id),
        }));
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail pembelian.") });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    setPageTitle("Detail Pembelian & Scan In");
    loadPurchase();
  }, [loadPurchase]);

  const scanItemOptions = useMemo(
    () =>
      (purchase?.items || []).map((it) => ({
        value: String(it.id),
        label: `[${it.product_variant?.sku}] ${formatVariantDisplayName(it.product_variant)} (Sudah Scan: ${it.qty_scanned_in}/${it.qty_ordered})`,
        sublabel: `Sisa order: ${Math.max(0, it.qty_ordered - it.qty_scanned_in)} unit • Harga Beli: ${formatIDR(it.unit_cost)}`,
        keywords: `${it.product_variant?.sku || ""} ${it.product_variant?.product?.alternative_name || ""}`,
      })),
    [purchase?.items]
  );

  const openScanModal = (itemId?: number) => {
    const defaultItem =
      (itemId ? purchase?.items?.find((it) => it.id === itemId) : undefined) ||
      purchase?.items?.find((it) => it.qty_scanned_in < it.qty_ordered) ||
      purchase?.items?.[0];
    setScanForm((prev) => ({
      ...prev,
      purchase_item_id: defaultItem ? String(defaultItem.id) : prev.purchase_item_id,
      batch_number: generateBatchCode(),
      auto_generate_count: "0",
    }));
    setScannedCodes([]);
    setScanInput("");
    setScanOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await purchasesApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Pembelian dihapus." });
      setTimeout(() => navigate("/purchases"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus pembelian.") });
    }
  };

  const openPay = () => {
    if (!purchase) return;
    const sisa = Math.max(0, purchase.total_amount + purchase.penalty_amount - purchase.paid_amount);
    setPayForm({
      payment_date: formatDateInput(),
      amount: String(sisa),
      payment_method: "transfer",
      reference_no: "",
      notes: "",
    });
    setPayOpen(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchase) return;
    try {
      await purchasesApi.addPayment(purchase.id, { ...payForm, amount: Number(payForm.amount) });
      toast({ variant: "success", title: "Sukses!", description: "Pembayaran hutang supplier tercatat." });
      setPayOpen(false);
      loadPurchase();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal mencatat pembayaran.") });
    }
  };

  const handleAddBarcode = () => {
    const code = scanInput.trim();
    if (!code) return;
    const currentItem = purchase?.items?.find((it) => String(it.id) === scanForm.purchase_item_id);
    const remaining = currentItem ? Math.max(0, currentItem.qty_ordered - currentItem.qty_scanned_in) : 0;
    const autoQty = Number(scanForm.auto_generate_count || 0);
    if (remaining <= 0) {
      toast({ variant: "destructive", title: "Sudah Penuh", description: "Item pembelian ini sudah penuh di-scan masuk." });
      setScanInput("");
      return;
    }
    if (scannedCodes.length + autoQty >= remaining) {
      toast({
        variant: "destructive",
        title: "Batas Kuota Tercapai",
        description: `Total scan tidak boleh melebihi sisa order (${remaining} unit).`,
      });
      setScanInput("");
      return;
    }
    if (scannedCodes.includes(code)) {
      toast({ variant: "destructive", title: "Duplikat", description: `Barcode ${code} sudah ada di daftar scan.` });
      setScanInput("");
      return;
    }
    setScannedCodes((prev) => [...prev, code]);
    setScanInput("");
  };

  const handleScanInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchase) return;
    const selectedItem = purchase.items?.find((it) => String(it.id) === scanForm.purchase_item_id);
    if (!selectedItem) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih item pembelian terlebih dahulu." });
      return;
    }
    const remaining = Math.max(0, selectedItem.qty_ordered - selectedItem.qty_scanned_in);
    if (remaining <= 0) {
      toast({ variant: "destructive", title: "Sudah Penuh", description: "Item pembelian ini sudah penuh di-scan masuk." });
      return;
    }
    const autoCount = Number(scanForm.auto_generate_count || 0);
    if (scannedCodes.length === 0 && autoCount <= 0) {
      toast({ variant: "destructive", title: "Validasi", description: "Scan minimal 1 barcode unit atau isi Auto-Generate QR." });
      return;
    }
    if (scannedCodes.length + autoCount > remaining) {
      toast({
        variant: "destructive",
        title: "Melebihi Sisa Order",
        description: `Total unit masuk (${scannedCodes.length + autoCount}) melebihi sisa order (${remaining} unit).`,
      });
      return;
    }

    setScanning(true);
    try {
      const res = await inventoryApi.scanIn({
        product_variant_id: selectedItem.product_variant_id,
        supplier_id: purchase.supplier_id,
        purchase_id: purchase.id,
        purchase_item_id: selectedItem.id,
        batch_number: scanForm.batch_number,
        expired_date: scanForm.expired_date,
        unit_cost: selectedItem.unit_cost,
        location: scanForm.location,
        unit_codes: scannedCodes,
        auto_generate_count: autoCount,
        notes: scanForm.notes || `Scan In dari ${purchase.invoice_number}`,
      });
      const units = res.data?.data?.units || [];
      setScannedCodes([]);
      setScanForm((prev) => ({ ...prev, auto_generate_count: "0" }));
      setScanOpen(false);
      toast({
        variant: "success",
        title: "Scan In Berhasil!",
        description: `${units.length} unit masuk stok & dikelompokkan ke ${formatVariantDisplayName(selectedItem.product_variant)}.`,
      });
      loadPurchase();
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal Scan In", description: getApiErrorMessage(err, "Gagal memproses scan in.") });
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat detail pembelian...
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Transaksi pembelian tidak ditemukan</p>
        <Button onClick={() => navigate("/purchases")} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">Kembali</Button>
      </div>
    );
  }

  const sisa = Math.max(0, purchase.total_amount + purchase.penalty_amount - purchase.paid_amount);
  const canScanIn = hasPermission("inventory.scan_in") && purchase.receive_status !== "completed";

  const selectedScanItem = purchase.items?.find((it) => String(it.id) === scanForm.purchase_item_id);
  const selectedRemaining = selectedScanItem
    ? Math.max(0, selectedScanItem.qty_ordered - selectedScanItem.qty_scanned_in)
    : 0;
  const autoGenQty = Number(scanForm.auto_generate_count || 0);
  const totalIncomingQty = scannedCodes.length + autoGenQty;

  const previewED = (() => {
    if (!scanForm.expired_date) return null;
    const d = new Date(scanForm.expired_date);
    if (Number.isNaN(d.getTime())) return null;
    const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const status = diffDays < 0 ? "expired" : diffDays <= 30 ? "critical_30" : diffDays <= 90 ? "warning_90" : "safe";
    return getEDBadgeInfo(status, diffDays);
  })();

  return (
    <div className="w-full max-w-full pb-8 space-y-4">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/purchases")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <ShoppingBag className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight font-mono">{purchase.invoice_number}</h1>
                  <Badge variant={purchase.payment_status === "paid" ? "default" : purchase.payment_status === "overdue" ? "destructive" : "secondary"} className="rounded-none text-[10px] uppercase">
                    {purchase.payment_status}
                  </Badge>
                  <Badge variant={purchase.receive_status === "completed" ? "default" : "outline"} className="rounded-none text-[10px] uppercase">
                    {purchase.receive_status}
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  Supplier: {purchase.supplier?.name} • Tgl: {formatDateID(purchase.purchase_date)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canScanIn && (
              <Button type="button" size="sm" onClick={() => openScanModal()} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3 gap-1.5 shadow-none">
                <ScanLine className="size-3.5" /><span>Scan In Produk</span>
              </Button>
            )}
            {hasPermission("purchases.pay") && purchase.payment_status !== "paid" && (
              <Button variant="outline" size="sm" onClick={openPay} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <CreditCard className="size-3.5 text-emerald-600" /><span>Bayar Hutang</span>
              </Button>
            )}
            {hasPermission("purchases.update") && purchase.receive_status === "draft" && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/purchases/${id}/edit`}><Edit3 className="size-3.5 text-blue-600" /><span>Edit</span></Link>
              </Button>
            )}
            {hasPermission("purchases.delete") && purchase.receive_status === "draft" && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 shadow-none">
                <Trash2 className="size-3.5" /><span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">METODE &amp; TERMIN:</span>
              <span className="font-mono font-bold uppercase">{purchase.payment_type} {purchase.payment_type === "termin" ? `(${purchase.term_days} hr · JT ${formatDateID(purchase.due_date)})` : ""}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL TAGIHAN:</span>
              <span className="font-mono font-bold">{formatIDR(purchase.total_amount)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">SUDAH DIBAYAR:</span>
              <span className="font-mono font-bold text-emerald-600">{formatIDR(purchase.paid_amount)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">SISA HUTANG (AP):</span>
              <span className="font-mono font-bold text-amber-600">{formatIDR(sisa)}</span>
            </div>
          </div>
        </div>

        {/* Item & Payments Tables */}
        <div className="p-5 sm:p-6 space-y-8">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">Rincian Item Pembelian</h2>
            <div className="border border-neutral-200 dark:border-neutral-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 dark:bg-neutral-900/50">
                    <TableHead className="text-xs font-bold uppercase">SKU</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Produk &amp; Variasi</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Order / Scanned In</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Harga Beli</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">Subtotal</TableHead>
                    {canScanIn && <TableHead className="text-xs font-bold uppercase text-right w-28">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(purchase.items || []).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs">{it.product_variant?.sku}</TableCell>
                      <TableCell className="text-xs font-semibold">{formatVariantDisplayName(it.product_variant)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        <span className={it.qty_scanned_in >= it.qty_ordered ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                          {it.qty_scanned_in} / {it.qty_ordered}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{formatIDR(it.unit_cost)}</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-right">{formatIDR(it.subtotal)}</TableCell>
                      {canScanIn && (
                        <TableCell className="text-right">
                          {it.qty_scanned_in < it.qty_ordered ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => openScanModal(it.id)} className="h-7 rounded-none text-[11px] px-2.5 gap-1">
                              <ScanLine className="size-3" /><span>Scan In</span>
                            </Button>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-600 uppercase font-semibold">Selesai</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right text-[11px] font-semibold uppercase text-neutral-500">Subtotal Item</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatIDR(purchase.subtotal)}</TableCell>
                    {canScanIn && <TableCell />}
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right text-[11px] font-semibold uppercase text-neutral-500">Diskon Nota</TableCell>
                    <TableCell className="text-right font-mono text-xs text-rose-600">- {formatIDR(purchase.discount_amount)}</TableCell>
                    {canScanIn && <TableCell />}
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right text-[11px] font-semibold uppercase text-neutral-500">Pajak / PPN</TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600">+ {formatIDR(purchase.tax_amount)}</TableCell>
                    {canScanIn && <TableCell />}
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right text-xs font-bold uppercase text-neutral-900 dark:text-white">Total Pembelian</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-neutral-900 dark:text-white">{formatIDR(purchase.total_amount)}</TableCell>
                    {canScanIn && <TableCell />}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">
              Riwayat Pembayaran ke Supplier ({purchase.payments?.length || 0})
            </h2>
            <div className="border border-neutral-200 dark:border-neutral-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 dark:bg-neutral-900/50">
                    <TableHead className="text-xs font-bold uppercase">Tanggal</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Metode</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Referensi</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Catatan</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!purchase.payments || purchase.payments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-neutral-500 font-mono">Belum ada pembayaran tercatat.</TableCell></TableRow>
                  ) : (
                    purchase.payments.map((pmt) => (
                      <TableRow key={pmt.id}>
                        <TableCell className="text-xs">{formatDateID(pmt.payment_date)}</TableCell>
                        <TableCell className="text-xs uppercase font-mono">{pmt.payment_method}</TableCell>
                        <TableCell className="text-xs font-mono">{pmt.reference_no || "—"}</TableCell>
                        <TableCell className="text-xs text-neutral-500">{pmt.notes || "—"}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-right text-emerald-600">{formatIDR(pmt.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Scan In Modal */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="rounded-none max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/60 flex items-center gap-3">
            <div className="size-9 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0">
              <ScanLine className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold uppercase tracking-tight">
                Scan In Produk Masuk ke Gudang
              </DialogTitle>
              <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                Invoice: {purchase.invoice_number} • Supplier: {purchase.supplier?.name}
              </p>
            </div>
          </div>

          <form onSubmit={handleScanInSubmit}>
            {/* Item Target & Progress Bar */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-7">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 block mb-1.5">
                  Item Pembelian yang Di-Scan Masuk <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  usePortal={false}
                  options={scanItemOptions}
                  value={scanForm.purchase_item_id}
                  onValueChange={(val) => {
                    const target = purchase.items?.find((it) => String(it.id) === val);
                    const rem = target ? Math.max(0, target.qty_ordered - target.qty_scanned_in) : 0;
                    const clampedAuto = Math.min(Number(scanForm.auto_generate_count || 0), Math.max(0, rem - scannedCodes.length));
                    setScanForm({ ...scanForm, purchase_item_id: val, auto_generate_count: String(clampedAuto) });
                    if (rem < scannedCodes.length) {
                      setScannedCodes((prev) => prev.slice(0, rem));
                    }
                  }}
                  placeholder="Pilih item pembelian..."
                  searchPlaceholder="Cari SKU, produk, atau variasi..."
                  className="h-9"
                />
              </div>

              <div className="lg:col-span-5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 px-3.5 py-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-500">
                    Order: <b className="text-neutral-900 dark:text-white">{selectedScanItem?.qty_ordered ?? 0}</b> • Sudah Scan:{" "}
                    <b className="text-emerald-600">{selectedScanItem?.qty_scanned_in ?? 0}</b>
                  </span>
                  <span className="text-amber-600 font-bold">Sisa: {selectedRemaining} unit</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-600 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        selectedScanItem?.qty_ordered
                          ? (selectedScanItem.qty_scanned_in / selectedScanItem.qty_ordered) * 100
                          : 0
                      )}%`,
                    }}
                  />
                  <div
                    className="h-full bg-neutral-900 dark:bg-white transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        selectedScanItem?.qty_ordered
                          ? (totalIncomingQty / selectedScanItem.qty_ordered) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2-Column Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800">
              {/* Left: Batch, ED, Rack, Auto-QR */}
              <div className="lg:col-span-5 p-6 space-y-4 bg-neutral-50/40 dark:bg-neutral-900/20">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  1. Informasi Batch &amp; Penyimpanan
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5">No. Batch / Lot *</label>
                  <Input
                    required
                    value={scanForm.batch_number}
                    onChange={(e) => setScanForm({ ...scanForm, batch_number: e.target.value })}
                    placeholder="LOT-2026-A1"
                    className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider">Expired Date (ED) *</label>
                    {previewED && (
                      <span className={`text-[10px] px-1.5 py-0.5 border font-medium ${previewED.className}`}>
                        {previewED.label}
                      </span>
                    )}
                  </div>
                  <Input
                    type="date"
                    required
                    value={scanForm.expired_date}
                    onChange={(e) => setScanForm({ ...scanForm, expired_date: e.target.value })}
                    className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5">Lokasi Rak</label>
                    <Input
                      value={scanForm.location}
                      onChange={(e) => setScanForm({ ...scanForm, location: e.target.value })}
                      className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider">Auto QR (Qty)</label>
                      {selectedRemaining > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setScanForm({
                              ...scanForm,
                              auto_generate_count: String(Math.max(0, selectedRemaining - scannedCodes.length)),
                            })
                          }
                          className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Isi Sisa ({Math.max(0, selectedRemaining - scannedCodes.length)})
                        </button>
                      )}
                    </div>
                    <ThousandInput
                      allowDecimal={false}
                      disabled={selectedRemaining <= 0}
                      value={scanForm.auto_generate_count}
                      onValueChange={(v) => {
                        const maxAuto = Math.max(0, selectedRemaining - scannedCodes.length);
                        const num = Number(v || 0);
                        if (num > maxAuto) {
                          setScanForm({ ...scanForm, auto_generate_count: String(maxAuto) });
                          toast({
                            variant: "destructive",
                            title: "Melebihi Sisa Order",
                            description: `Maksimal Auto QR yang bisa dibuat adalah ${maxAuto} unit.`,
                          });
                        } else {
                          setScanForm({ ...scanForm, auto_generate_count: v });
                        }
                      }}
                      className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5">Catatan Batch (Opsional)</label>
                  <Input
                    value={scanForm.notes}
                    onChange={(e) => setScanForm({ ...scanForm, notes: e.target.value })}
                    placeholder="Keterangan penerimaan..."
                    className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                  />
                </div>
              </div>

              {/* Right: Barcode Scanner & List */}
              <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white dark:bg-neutral-950 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      2. Scan Barcode / QR Unit
                    </span>
                    <div className="flex items-center gap-2">
                      {scannedCodes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setScannedCodes([])}
                          className="text-[11px] font-mono text-rose-600 hover:underline cursor-pointer"
                        >
                          Hapus Semua
                        </button>
                      )}
                      <Badge variant="secondary" className="rounded-none text-[10px] font-mono">
                        {scannedCodes.length} Manual • {autoGenQty} Auto QR
                      </Badge>
                    </div>
                  </div>

                  {selectedRemaining <= 0 ? (
                    <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Item ini sudah penuh di-scan masuk ({selectedScanItem?.qty_scanned_in}/{selectedScanItem?.qty_ordered} unit). Pilih item lain jika masih ada sisa order.</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ScanLine className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <Input
                          autoFocus
                          disabled={totalIncomingQty >= selectedRemaining}
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddBarcode();
                            }
                          }}
                          placeholder={
                            totalIncomingQty >= selectedRemaining
                              ? `Kuota sisa (${selectedRemaining} unit) sudah terpenuhi`
                              : "Arahkan scanner ke barcode unit atau ketik lalu tekan Enter..."
                          }
                          className="h-9 pl-9 text-xs rounded-none font-mono"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={totalIncomingQty >= selectedRemaining}
                        onClick={handleAddBarcode}
                        className="h-9 rounded-none text-xs px-3.5"
                      >
                        <Plus className="size-3.5 mr-1" /> Tambah
                      </Button>
                    </div>
                  )}

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/20 min-h-[210px] max-h-[235px] overflow-y-auto p-3">
                    {scannedCodes.length === 0 ? (
                      <div className="h-[184px] flex flex-col items-center justify-center text-center text-neutral-400 space-y-1.5">
                        <ScanLine className="size-7 opacity-40" />
                        <p className="text-xs font-mono">Belum ada barcode unit yang di-scan manual</p>
                        <p className="text-[11px]">
                          Scan barcode kemasan satuan di atas, atau isi <b>Auto QR (Qty)</b> di panel kiri.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {scannedCodes.map((code, idx) => (
                          <div
                            key={code}
                            className="flex items-center justify-between text-xs px-2.5 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                #{String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="font-mono font-semibold truncate">{code}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setScannedCodes((prev) => prev.filter((c) => c !== code))}
                              className="text-neutral-400 hover:text-rose-600 ml-2 shrink-0"
                              title="Hapus"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {autoGenQty > 0 && (
                  <div className="text-[11px] font-mono px-3 py-2 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300">
                    + Akan dibuat otomatis <b>{autoGenQty}</b> kode QR unit unik saat disimpan.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                Total unit siap masuk stok:{" "}
                <span className="font-bold text-neutral-900 dark:text-white">{totalIncomingQty} unit</span>
                {selectedScanItem && totalIncomingQty > selectedRemaining && (
                  <span className="ml-2 text-amber-600 font-semibold">(melebihi sisa order)</span>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setScanOpen(false)} className="h-9 rounded-none px-4 text-xs">
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={scanning || selectedRemaining <= 0 || totalIncomingQty <= 0 || totalIncomingQty > selectedRemaining}
                  className="h-9 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 text-xs gap-1.5"
                >
                  {scanning ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>{scanning ? "Memproses..." : `Simpan Scan In (${totalIncomingQty} Unit)`}</span>
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Debt Modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">Bayar Hutang ({purchase.invoice_number})</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1">Tanggal Bayar *</label>
              <Input type="date" required value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} className="rounded-none h-8 text-xs" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1">Jumlah Bayar (Rp) *</label>
              <ThousandInput required value={payForm.amount} onValueChange={(v) => setPayForm({ ...payForm, amount: v })} className="rounded-none h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase block mb-1">Metode</label>
                <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className="w-full h-8 px-2 border border-neutral-200 dark:border-neutral-800 bg-background text-xs rounded-none">
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Cash</option>
                  <option value="giro">Giro</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase block mb-1">No. Referensi</label>
                <Input value={payForm.reference_no} onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })} className="rounded-none h-8 text-xs" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1">Catatan</label>
              <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="rounded-none h-8 text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setPayOpen(false)} className="rounded-none">Batal</Button>
              <Button type="submit" size="sm" className="rounded-none bg-neutral-900 text-white">Simpan Pembayaran</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Pembelian" description="Yakin ingin menghapus draft pembelian ini?" variant="destructive" />
    </div>
  );
}
