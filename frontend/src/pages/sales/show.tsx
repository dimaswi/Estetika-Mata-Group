import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThousandInput } from "@/components/ui/thousand-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { salesApi, inventoryApi, type Sale, type StockUnit } from "@/lib/api";
import { formatIDR, formatDateID, formatDateInput, formatVariantDisplayName, getApiErrorMessage, getEDBadgeInfo } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  Receipt,
  ScanLine,
  CreditCard,
  Plus,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  RotateCcw,
  ClipboardCheck,
} from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

interface ScannedOutEntry {
  unit_code: string;
  batch_number?: string;
  expired_date?: string;
  ed_status?: string;
  days_to_expiry?: number;
  location?: string;
}

export default function SaleShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();

  const [sale, setSale] = useState<Sale | null>(null);
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

  // Consignment Usage & Return modals
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageDate, setUsageDate] = useState(formatDateInput());
  const [usageTermDays, setUsageTermDays] = useState("0");
  const [usageNotes, setUsageNotes] = useState("");
  const [selectedUsageCodes, setSelectedUsageCodes] = useState<string[]>([]);
  const [usageSubmitting, setUsageSubmitting] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [selectedReturnCodes, setSelectedReturnCodes] = useState<string[]>([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // Scan Out modal
  const [scanOpen, setScanOpen] = useState(false);
  const [scanItemId, setScanItemId] = useState("");
  const [scanNotes, setScanNotes] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [scannedUnits, setScannedUnits] = useState<ScannedOutEntry[]>([]);
  const [availableUnits, setAvailableUnits] = useState<StockUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [scanning, setScanning] = useState(false);

  const loadSale = useCallback(async () => {
    try {
      const res = await salesApi.getById(Number(id));
      const s = res.data.data;
      setSale(s);
      const pendingItem = s.items?.find((it) => it.qty_scanned_out < it.qty_ordered) || s.items?.[0];
      if (pendingItem) {
        setScanItemId((prev) => prev || String(pendingItem.id));
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail penjualan.") });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    setPageTitle("Detail Penjualan & Scan Out");
    loadSale();
  }, [loadSale]);

  const selectedScanItem = useMemo(
    () => sale?.items?.find((it) => String(it.id) === scanItemId),
    [sale?.items, scanItemId]
  );

  // Load FEFO available stock units for selected sale item while modal is open
  useEffect(() => {
    if (!scanOpen || !selectedScanItem?.product_variant_id) {
      return;
    }
    setLoadingUnits(true);
    inventoryApi
      .getUnits({ variant_id: selectedScanItem.product_variant_id, status: "in_stock" })
      .then((res) => {
        const list = res.data?.data || [];
        list.sort((a, b) => {
          const da = a.product_batch?.expired_date ? new Date(a.product_batch.expired_date).getTime() : Number.MAX_SAFE_INTEGER;
          const db = b.product_batch?.expired_date ? new Date(b.product_batch.expired_date).getTime() : Number.MAX_SAFE_INTEGER;
          return da - db;
        });
        setAvailableUnits(list);
      })
      .catch(() => setAvailableUnits([]))
      .finally(() => setLoadingUnits(false));
  }, [scanOpen, selectedScanItem?.product_variant_id]);

  const scanItemOptions = useMemo(
    () =>
      (sale?.items || []).map((it) => ({
        value: String(it.id),
        label: `[${it.product_variant?.sku}] ${formatVariantDisplayName(it.product_variant)} (Sudah Scan Out: ${it.qty_scanned_out}/${it.qty_ordered})`,
        sublabel: `Sisa order: ${Math.max(0, it.qty_ordered - it.qty_scanned_out)} unit • Harga Jual: ${formatIDR(it.unit_price)}`,
        keywords: `${it.product_variant?.sku || ""} ${it.product_variant?.product?.alternative_name || ""}`,
      })),
    [sale?.items]
  );

  const openScanModal = (itemId?: number) => {
    const defaultItem =
      (itemId ? sale?.items?.find((it) => it.id === itemId) : undefined) ||
      sale?.items?.find((it) => it.qty_scanned_out < it.qty_ordered) ||
      sale?.items?.[0];
    setScanItemId(defaultItem ? String(defaultItem.id) : "");
    setScanNotes("");
    setScannedUnits([]);
    setScanInput("");
    setScanOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await salesApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Transaksi penjualan dihapus." });
      setTimeout(() => navigate("/sales"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus penjualan.") });
    }
  };

  const openPay = () => {
    if (!sale) return;
    const baseTotal = sale.payment_type === "consignment" ? (sale.billable_amount || 0) : sale.total_amount;
    const sisa = Math.max(0, baseTotal + sale.penalty_amount - sale.paid_amount);
    setPayForm({
      payment_date: formatDateInput(),
      amount: String(sisa),
      payment_method: "transfer",
      reference_no: "",
      notes: "",
    });
    setPayOpen(true);
  };

  const openUsageModal = () => {
    if (!sale) return;
    setUsageDate(formatDateInput());
    setUsageTermDays(String(sale.term_days || 0));
    setUsageNotes("");
    setSelectedUsageCodes([]);
    setUsageOpen(true);
  };

  const handleConfirmUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || selectedUsageCodes.length === 0) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih minimal 1 unit yang dipakai pelanggan." });
      return;
    }
    setUsageSubmitting(true);
    try {
      await salesApi.confirmUsage(sale.id, {
        usage_date: usageDate,
        unit_codes: selectedUsageCodes,
        term_days: Number(usageTermDays || 0),
        notes: usageNotes || `Konfirmasi pemakaian ${selectedUsageCodes.length} unit`,
      });
      toast({ variant: "success", title: "Pemakaian Dikonfirmasi!", description: `${selectedUsageCodes.length} unit ditandai terpakai dan masuk tagihan.` });
      setUsageOpen(false);
      await loadSale();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal mengkonfirmasi pemakaian.") });
    } finally {
      setUsageSubmitting(false);
    }
  };

  const openReturnModal = () => {
    setReturnNotes("");
    setSelectedReturnCodes([]);
    setReturnOpen(true);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || selectedReturnCodes.length === 0) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih minimal 1 unit yang diretur ke gudang." });
      return;
    }
    setReturnSubmitting(true);
    try {
      await salesApi.returnUnits(sale.id, {
        unit_codes: selectedReturnCodes,
        notes: returnNotes || `Retur konsinyasi ${sale.invoice_number}`,
      });
      toast({ variant: "success", title: "Retur Berhasil!", description: `${selectedReturnCodes.length} unit dikembalikan ke stok gudang.` });
      setReturnOpen(false);
      await loadSale();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memproses retur barang.") });
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    try {
      await salesApi.addPayment(sale.id, { ...payForm, amount: Number(payForm.amount) });
      toast({ variant: "success", title: "Sukses!", description: "Pembayaran piutang customer tercatat." });
      setPayOpen(false);
      loadSale();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal mencatat pembayaran.") });
    }
  };

  const selectedRemaining = selectedScanItem
    ? Math.max(0, selectedScanItem.qty_ordered - selectedScanItem.qty_scanned_out)
    : 0;

  const tryAddUnitEntry = (entry: ScannedOutEntry, earlierBatchNumber?: string | null) => {
    if (selectedRemaining <= 0) {
      toast({ variant: "destructive", title: "Sudah Penuh", description: "Item penjualan ini sudah penuh di-scan keluar." });
      return false;
    }
    if (scannedUnits.length >= selectedRemaining) {
      toast({
        variant: "destructive",
        title: "Batas Kuota Tercapai",
        description: `Total Scan Out tidak boleh melebihi sisa order (${selectedRemaining} unit).`,
      });
      return false;
    }
    if (scannedUnits.some((u) => u.unit_code === entry.unit_code)) {
      toast({ variant: "destructive", title: "Duplikat", description: `Barcode ${entry.unit_code} sudah ada di daftar Scan Out.` });
      return false;
    }
    if (entry.ed_status === "expired") {
      toast({
        variant: "destructive",
        title: "Unit Expired Diblokir",
        description: `Unit ${entry.unit_code} (${entry.batch_number || "-"}) sudah expired dan tidak boleh keluar.`,
      });
      return false;
    }
    setScannedUnits((prev) => [...prev, entry]);
    if (earlierBatchNumber && earlierBatchNumber !== entry.batch_number) {
      toast({
        title: "Peringatan FEFO",
        description: `Masih tersedia batch ${earlierBatchNumber} yang tanggal ED-nya lebih dekat.`,
      });
    }
    return true;
  };

  const handleAddBarcode = async () => {
    const code = scanInput.trim().toUpperCase();
    if (!code || !selectedScanItem) return;

    if (selectedRemaining <= 0) {
      toast({ variant: "destructive", title: "Sudah Penuh", description: "Item penjualan ini sudah penuh di-scan keluar." });
      setScanInput("");
      return;
    }
    if (scannedUnits.length >= selectedRemaining) {
      toast({
        variant: "destructive",
        title: "Batas Kuota Tercapai",
        description: `Total Scan Out tidak boleh melebihi sisa order (${selectedRemaining} unit).`,
      });
      setScanInput("");
      return;
    }
    if (scannedUnits.some((u) => u.unit_code === code)) {
      toast({ variant: "destructive", title: "Duplikat", description: `Barcode ${code} sudah ada di daftar Scan Out.` });
      setScanInput("");
      return;
    }

    setValidatingCode(true);
    try {
      const res = await inventoryApi.lookupUnit(code);
      const { unit, ed_status, days_to_expiry, fefo_earlier_batch } = res.data.data;

      if (unit.status !== "in_stock") {
        toast({
          variant: "destructive",
          title: "Unit Tidak Tersedia",
          description: `Unit ${code} berstatus "${unit.status}" (bukan in_stock).`,
        });
        return;
      }
      if (unit.product_variant_id !== selectedScanItem.product_variant_id) {
        toast({
          variant: "destructive",
          title: "Produk / Variasi Salah",
          description: `Unit ${code} bukan milik variasi ${formatVariantDisplayName(selectedScanItem.product_variant)}.`,
        });
        return;
      }
      if (ed_status === "expired") {
        toast({
          variant: "destructive",
          title: "Unit Expired Diblokir",
          description: `Unit ${code} (Batch ${unit.product_batch?.batch_number || "-"}) sudah expired.`,
        });
        return;
      }

      tryAddUnitEntry(
        {
          unit_code: unit.unit_code,
          batch_number: unit.product_batch?.batch_number,
          expired_date: unit.product_batch?.expired_date,
          ed_status,
          days_to_expiry,
          location: unit.location,
        },
        fefo_earlier_batch?.batch_number
      );
      setScanInput("");
    } catch (err) {
      toast({ variant: "destructive", title: "Barcode Tidak Valid", description: getApiErrorMessage(err, `Unit ${code} tidak ditemukan.`) });
    } finally {
      setValidatingCode(false);
    }
  };

  const handleClickAvailableUnit = (unit: StockUnit) => {
    const edStatus = unit.product_batch?.ed_status;
    if (edStatus === "expired") {
      toast({
        variant: "destructive",
        title: "Unit Expired Diblokir",
        description: `Unit ${unit.unit_code} sudah expired dan diblokir untuk Scan Out.`,
      });
      return;
    }
    // Check if there is an earlier non-expired batch among availableUnits not yet fully chosen
    const selectedSet = new Set(scannedUnits.map((s) => s.unit_code));
    const earlierAvail = availableUnits.find(
      (u) =>
        !selectedSet.has(u.unit_code) &&
        u.product_batch?.ed_status !== "expired" &&
        u.product_batch?.expired_date &&
        unit.product_batch?.expired_date &&
        new Date(u.product_batch.expired_date).getTime() < new Date(unit.product_batch.expired_date).getTime()
    );

    tryAddUnitEntry(
      {
        unit_code: unit.unit_code,
        batch_number: unit.product_batch?.batch_number,
        expired_date: unit.product_batch?.expired_date,
        ed_status: unit.product_batch?.ed_status,
        days_to_expiry: unit.product_batch?.days_to_expiry,
        location: unit.location,
      },
      earlierAvail?.product_batch?.batch_number
    );
  };

  const handleScanOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || !selectedScanItem) {
      toast({ variant: "destructive", title: "Validasi", description: "Pilih item penjualan terlebih dahulu." });
      return;
    }
    if (selectedRemaining <= 0) {
      toast({ variant: "destructive", title: "Sudah Penuh", description: "Item penjualan ini sudah penuh di-scan keluar." });
      return;
    }
    if (scannedUnits.length === 0) {
      toast({ variant: "destructive", title: "Validasi", description: "Scan atau pilih minimal 1 unit produk untuk Scan Out." });
      return;
    }
    if (scannedUnits.length > selectedRemaining) {
      toast({
        variant: "destructive",
        title: "Melebihi Sisa Order",
        description: `Total Scan Out (${scannedUnits.length} unit) melebihi sisa order (${selectedRemaining} unit).`,
      });
      return;
    }

    setScanning(true);
    try {
      const res = await inventoryApi.scanOut({
        unit_codes: scannedUnits.map((u) => u.unit_code),
        movement_type: "scan_out",
        reference_type: "sale",
        reference_id: sale.id,
        sale_id: sale.id,
        sale_item_id: selectedScanItem.id,
        notes: scanNotes || `Penjualan ${sale.invoice_number}`,
      });
      const count = res.data.data.processed_count;
      toast({ variant: "success", title: "Scan Out Berhasil!", description: `${count} unit berhasil di-scan keluar dari gudang.` });
      setScannedUnits([]);
      setScanNotes("");
      setScanOpen(false);
      await loadSale();
    } catch (err) {
      toast({ variant: "destructive", title: "Error Scan Out!", description: getApiErrorMessage(err, "Gagal memproses Scan Out.") });
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 gap-2 text-xs font-mono text-neutral-500"><Loader2 className="size-4 animate-spin" /><span>MEMUAT DETAIL PENJUALAN...</span></div>;
  }
  if (!sale) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-mono text-neutral-500">Data penjualan tidak ditemukan.</p>
        <Button onClick={() => navigate("/sales")} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">Kembali</Button>
      </div>
    );
  }

  const isConsignment = sale.payment_type === "consignment";
  const effectiveTotal = isConsignment ? (sale.billable_amount || 0) : sale.total_amount;
  const sisaPiutang = Math.max(0, effectiveTotal + sale.penalty_amount - sale.paid_amount);
  const canScanOut = hasPermission("inventory.scan_out") && sale.delivery_status !== "completed";
  const scannedCodeSet = new Set(scannedUnits.map((u) => u.unit_code));

  const consignmentUnits = (sale.items || []).flatMap((it) => {
    const perUnitNet = it.qty_ordered > 0 ? it.subtotal / it.qty_ordered : it.unit_price;
    return (it.units || [])
      .filter((u) => u.status === "consignment")
      .map((u) => ({
        ...u,
        itemName: formatVariantDisplayName(it.product_variant),
        sku: it.product_variant?.sku || "",
        unitPriceNet: perUnitNet,
      }));
  });

  const estUsagePreview = consignmentUnits
    .filter((u) => selectedUsageCodes.includes(u.unit_code))
    .reduce((sum, u) => sum + u.unitPriceNet, 0);

  return (
    <div className="w-full max-w-full pb-8 space-y-4">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/sales")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <Receipt className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight font-mono">{sale.invoice_number}</h1>
                  <Badge variant={sale.payment_status === "paid" ? "default" : sale.payment_status === "overdue" ? "destructive" : "secondary"} className="rounded-none text-[10px] uppercase">
                    {sale.payment_status}
                  </Badge>
                  <Badge variant={sale.delivery_status === "completed" ? "default" : "outline"} className="rounded-none text-[10px] uppercase">
                    {sale.delivery_status}
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  Customer: {sale.customer_name}{sale.doctor_name ? ` • dr. ${sale.doctor_name}` : ""} • Tgl: {formatDateID(sale.sale_date)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canScanOut && (
              <Button type="button" size="sm" onClick={() => openScanModal()} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3 gap-1.5 shadow-none">
                <ScanLine className="size-3.5" /><span>Scan Out Produk</span>
              </Button>
            )}
            {isConsignment && consignmentUnits.length > 0 && hasPermission("sales.pay") && (
              <Button type="button" variant="outline" size="sm" onClick={openUsageModal} className="h-8 rounded-none border border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs px-3 gap-1.5 shadow-none">
                <ClipboardCheck className="size-3.5" /><span>Konfirmasi Pemakaian ({consignmentUnits.length})</span>
              </Button>
            )}
            {isConsignment && consignmentUnits.length > 0 && hasPermission("inventory.scan_in") && (
              <Button type="button" variant="outline" size="sm" onClick={openReturnModal} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <RotateCcw className="size-3.5 text-amber-600" /><span>Retur ke Stok</span>
              </Button>
            )}
            {hasPermission("sales.pay") && effectiveTotal > 0 && sisaPiutang > 0 && (
              <Button variant="outline" size="sm" onClick={openPay} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <CreditCard className="size-3.5 text-emerald-600" /><span>Terima Pembayaran</span>
              </Button>
            )}
            {hasPermission("sales.update") && sale.delivery_status === "draft" && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/sales/${id}/edit`}><Edit3 className="size-3.5 text-blue-600" /><span>Edit</span></Link>
              </Button>
            )}
            {hasPermission("sales.delete") && sale.delivery_status === "draft" && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 shadow-none">
                <Trash2 className="size-3.5" /><span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">METODE &amp; TERMIN:</span>
              <span className="font-mono font-bold uppercase">
                {isConsignment
                  ? `KONSINYASI${sale.term_days > 0 ? ` (${sale.term_days} hr stlh pakai)` : " (Bayar stlh pakai)"}`
                  : `${sale.payment_type}${sale.payment_type === "termin" ? ` (${sale.term_days} hr · JT ${formatDateID(sale.due_date)})` : ""}`}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                {isConsignment ? "TAGIHAN TERPAKAI (AKTIF):" : "TOTAL TAGIHAN:"}
              </span>
              <span className="font-mono font-bold">{formatIDR(effectiveTotal)}</span>
              {isConsignment && (
                <span className="block text-[10px] font-mono text-neutral-500">
                  Nilai Order Titip: {formatIDR(sale.total_amount)}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">SUDAH DIBAYAR:</span>
              <span className="font-mono font-bold text-emerald-600">{formatIDR(sale.paid_amount)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">SISA PIUTANG (AR):</span>
              <span className="font-mono font-bold text-amber-600">{formatIDR(sisaPiutang)}</span>
            </div>
          </div>

          {(sale.customer_phone || sale.customer_address || sale.notes) && (
            <div className="pt-2 border-t border-neutral-200/70 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono text-neutral-500">
              <div>Telp: <span className="text-neutral-800 dark:text-neutral-200">{sale.customer_phone || "—"}</span></div>
              <div>Alamat: <span className="text-neutral-800 dark:text-neutral-200">{sale.customer_address || "—"}</span></div>
              <div>Catatan: <span className="text-neutral-800 dark:text-neutral-200">{sale.notes || "—"}</span></div>
            </div>
          )}
        </div>

        {/* Item & Payments Tables */}
        <div className="p-5 sm:p-6 space-y-8">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">Rincian Item Penjualan</h2>
            <div className="border border-neutral-200 dark:border-neutral-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 dark:bg-neutral-900/50">
                    <TableHead className="text-xs font-bold uppercase">SKU</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Produk &amp; Variasi</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Order / Scanned Out</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Harga Jual</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">Fee Produk</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">Subtotal</TableHead>
                    {canScanOut && <TableHead className="text-xs font-bold uppercase text-right w-28">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sale.items || []).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs">{it.product_variant?.sku}</TableCell>
                      <TableCell className="text-xs font-semibold">{formatVariantDisplayName(it.product_variant)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        <span className={it.qty_scanned_out >= it.qty_ordered ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                          {it.qty_scanned_out} / {it.qty_ordered}
                        </span>
                        {isConsignment && it.qty_scanned_out > 0 && (
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            {it.qty_used || 0} dipakai · {it.qty_returned || 0} retur ·{" "}
                            {Math.max(0, it.qty_scanned_out - (it.qty_used || 0) - (it.qty_returned || 0))} titip
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{formatIDR(it.unit_price)}</TableCell>
                      <TableCell className="text-xs font-mono text-right text-neutral-500">{formatIDR(it.fee_amount)}</TableCell>
                      <TableCell className="text-xs font-mono font-bold text-right">{formatIDR(it.subtotal)}</TableCell>
                      {canScanOut && (
                        <TableCell className="text-right">
                          {it.qty_scanned_out < it.qty_ordered ? (
                            <Button type="button" variant="outline" size="sm" onClick={() => openScanModal(it.id)} className="h-7 rounded-none text-[11px] px-2.5 gap-1">
                              <ScanLine className="size-3" /><span>Scan Out</span>
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
                    <TableCell colSpan={5} className="text-right text-[11px] font-semibold uppercase text-neutral-500">Subtotal Item</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatIDR(sale.subtotal)}</TableCell>
                    {canScanOut && <TableCell />}
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-[11px] font-semibold uppercase text-neutral-500">Diskon Nota</TableCell>
                    <TableCell className="text-right font-mono text-xs text-rose-600">- {formatIDR(sale.discount_amount)}</TableCell>
                    {canScanOut && <TableCell />}
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-[11px] font-semibold uppercase text-neutral-500">Pajak / PPN</TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600">+ {formatIDR(sale.tax_amount)}</TableCell>
                    {canScanOut && <TableCell />}
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-xs font-bold uppercase text-neutral-900 dark:text-white">Total Penjualan</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-neutral-900 dark:text-white">{formatIDR(sale.total_amount)}</TableCell>
                    {canScanOut && <TableCell />}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">
              Riwayat Pembayaran Customer ({sale.payments?.length || 0})
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
                  {!sale.payments || sale.payments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-neutral-500 font-mono">Belum ada pembayaran tercatat.</TableCell></TableRow>
                  ) : (
                    sale.payments.map((pmt) => (
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

      {/* Scan Out Modal */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="rounded-none max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/60 flex items-center gap-3">
            <div className="size-9 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0">
              <ScanLine className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold uppercase tracking-tight">
                Scan Out Produk Keluar Gudang (FEFO)
              </DialogTitle>
              <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                Invoice: {sale.invoice_number} • Customer: {sale.customer_name}
              </p>
            </div>
          </div>

          <form onSubmit={handleScanOutSubmit}>
            {/* Item Target & Progress Bar */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-7">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 block mb-1.5">
                  Item Penjualan yang Di-Scan Keluar <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  usePortal={false}
                  options={scanItemOptions}
                  value={scanItemId}
                  onValueChange={(val) => {
                    setScanItemId(val);
                    setScannedUnits([]);
                    setScanInput("");
                  }}
                  placeholder="Pilih item penjualan..."
                  searchPlaceholder="Cari SKU, produk, atau variasi..."
                  className="h-9"
                />
              </div>

              <div className="lg:col-span-5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 px-3.5 py-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-500">
                    Order: <b className="text-neutral-900 dark:text-white">{selectedScanItem?.qty_ordered ?? 0}</b> • Sudah Keluar:{" "}
                    <b className="text-emerald-600">{selectedScanItem?.qty_scanned_out ?? 0}</b>
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
                          ? (selectedScanItem.qty_scanned_out / selectedScanItem.qty_ordered) * 100
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
                          ? (scannedUnits.length / selectedScanItem.qty_ordered) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2-Column Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800">
              {/* Left: FEFO Available Units */}
              <div className="lg:col-span-5 p-6 space-y-3 bg-neutral-50/40 dark:bg-neutral-900/20 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      1. Stok Ready (Urut FEFO / ED Terdekat)
                    </span>
                    <Badge variant="secondary" className="rounded-none text-[10px] font-mono">
                      {availableUnits.length} Ready
                    </Badge>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 h-[220px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                    {loadingUnits ? (
                      <div className="h-full flex items-center justify-center gap-2 text-xs font-mono text-neutral-400">
                        <Loader2 className="size-3.5 animate-spin" /> Memuat unit stok...
                      </div>
                    ) : availableUnits.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-400 space-y-1">
                        <AlertTriangle className="size-6 opacity-50" />
                        <p className="text-xs font-mono">Tidak ada unit in_stock untuk variasi ini</p>
                      </div>
                    ) : (
                      availableUnits.map((u) => {
                        const edStatus = u.product_batch?.ed_status;
                        const edBadge = getEDBadgeInfo(edStatus, u.product_batch?.days_to_expiry);
                        const isExpired = edStatus === "expired";
                        const isPicked = scannedCodeSet.has(u.unit_code);
                        const quotaFull = selectedRemaining <= 0 || scannedUnits.length >= selectedRemaining;
                        const disabled = isExpired || isPicked || quotaFull;

                        return (
                          <button
                            key={u.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleClickAvailableUnit(u)}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                              isPicked
                                ? "bg-emerald-50/70 dark:bg-emerald-950/30 opacity-75"
                                : isExpired
                                ? "bg-rose-50/40 dark:bg-rose-950/20 opacity-60 cursor-not-allowed"
                                : quotaFull
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-xs font-semibold truncate text-neutral-900 dark:text-neutral-100">
                                {u.unit_code}
                              </div>
                              <div className="text-[10px] font-mono text-neutral-500 mt-0.5 truncate">
                                Batch: {u.product_batch?.batch_number || "—"} • ED: {formatDateID(u.product_batch?.expired_date)} • {u.location || "Gudang"}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[10px] px-1.5 py-0.5 border font-medium ${edBadge.className}`}>
                                {edBadge.label}
                              </span>
                              {isPicked && <PackageCheck className="size-3.5 text-emerald-600" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5">Catatan Pengiriman (Opsional)</label>
                  <Input
                    value={scanNotes}
                    onChange={(e) => setScanNotes(e.target.value)}
                    placeholder="Contoh: Kirim via kurir / diambil dokter..."
                    className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                  />
                </div>
              </div>

              {/* Right: Barcode Scanner & Picked List */}
              <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white dark:bg-neutral-950 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      2. Scan Barcode / QR Unit Keluar
                    </span>
                    <div className="flex items-center gap-2">
                      {scannedUnits.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setScannedUnits([])}
                          className="text-[11px] font-mono text-rose-600 hover:underline cursor-pointer"
                        >
                          Hapus Semua
                        </button>
                      )}
                      <Badge variant="secondary" className="rounded-none text-[10px] font-mono">
                        {scannedUnits.length} / {selectedRemaining} Dipilih
                      </Badge>
                    </div>
                  </div>

                  {selectedRemaining <= 0 ? (
                    <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Item ini sudah penuh di-scan keluar ({selectedScanItem?.qty_scanned_out}/{selectedScanItem?.qty_ordered} unit). Pilih item lain jika masih ada sisa order.</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ScanLine className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <Input
                          autoFocus
                          disabled={scannedUnits.length >= selectedRemaining || validatingCode}
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddBarcode();
                            }
                          }}
                          placeholder={
                            scannedUnits.length >= selectedRemaining
                              ? `Kuota sisa (${selectedRemaining} unit) sudah terpenuhi`
                              : "Scan barcode/QR unit atau klik stok ready di panel kiri..."
                          }
                          className="h-9 pl-9 text-xs rounded-none font-mono"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={scannedUnits.length >= selectedRemaining || validatingCode}
                        onClick={handleAddBarcode}
                        className="h-9 rounded-none text-xs px-3.5"
                      >
                        {validatingCode ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Plus className="size-3.5 mr-1" />}
                        Tambah
                      </Button>
                    </div>
                  )}

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/20 min-h-[215px] max-h-[245px] overflow-y-auto p-3">
                    {scannedUnits.length === 0 ? (
                      <div className="h-[190px] flex flex-col items-center justify-center text-center text-neutral-400 space-y-1.5">
                        <ScanLine className="size-7 opacity-40" />
                        <p className="text-xs font-mono">Belum ada barcode unit yang dipilih untuk Scan Out</p>
                        <p className="text-[11px]">
                          Scan barcode kemasan satuan di atas atau klik unit pada daftar <b>Stok Ready (FEFO)</b> di kiri.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {scannedUnits.map((u, idx) => (
                          <div
                            key={u.unit_code}
                            className="flex items-center justify-between text-xs px-2.5 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                  #{String(idx + 1).padStart(2, "0")}
                                </span>
                                <span className="font-mono font-semibold truncate">{u.unit_code}</span>
                              </div>
                              <div className="text-[10px] font-mono text-neutral-500 mt-1 truncate">
                                {u.batch_number || "—"} • ED {formatDateID(u.expired_date)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setScannedUnits((prev) => prev.filter((item) => item.unit_code !== u.unit_code))}
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
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                Total unit siap scan keluar:{" "}
                <span className="font-bold text-neutral-900 dark:text-white">{scannedUnits.length} unit</span>
                {selectedScanItem && scannedUnits.length > selectedRemaining && (
                  <span className="ml-2 text-rose-600 font-semibold">(melebihi sisa order)</span>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setScanOpen(false)} className="h-9 rounded-none px-4 text-xs">
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={scanning || selectedRemaining <= 0 || scannedUnits.length <= 0 || scannedUnits.length > selectedRemaining}
                  className="h-9 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 text-xs gap-1.5"
                >
                  {scanning ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>{scanning ? "Memproses..." : `Simpan Scan Out (${scannedUnits.length} Unit)`}</span>
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Payment Modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">Terima Pembayaran ({sale.invoice_number})</DialogTitle>
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
                <Input value={payForm.reference_no} onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })} className="rounded-none h-8 text-xs font-mono" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1">Catatan</label>
              <Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="rounded-none h-8 text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setPayOpen(false)} className="rounded-none h-8 text-xs">Batal</Button>
              <Button type="submit" size="sm" className="rounded-none h-8 text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">Simpan Pembayaran</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Consignment Usage Modal */}
      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="rounded-none max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">Konfirmasi Pemakaian Produk ({sale.invoice_number})</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConfirmUsageSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase block mb-1">Tanggal Pemakaian *</label>
                <Input type="date" required value={usageDate} onChange={(e) => setUsageDate(e.target.value)} className="rounded-none h-8 text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase block mb-1">Tenor Bayar Setelah Dipakai (Hari)</label>
                <ThousandInput allowDecimal={false} value={usageTermDays} onValueChange={setUsageTermDays} className="rounded-none h-8 text-xs" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase">Pilih Unit Titipan yang Sudah Dipakai ({consignmentUnits.length} unit tersedia)</label>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedUsageCodes(
                      selectedUsageCodes.length === consignmentUnits.length
                        ? []
                        : consignmentUnits.map((u) => u.unit_code)
                    )
                  }
                  className="text-[11px] font-mono text-blue-600 hover:underline cursor-pointer"
                >
                  {selectedUsageCodes.length === consignmentUnits.length ? "Batal Pilih Semua" : "Pilih Semua"}
                </button>
              </div>
              <div className="border border-neutral-200 dark:border-neutral-800 max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {consignmentUnits.map((u) => {
                  const checked = selectedUsageCodes.includes(u.unit_code);
                  return (
                    <label key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedUsageCodes((prev) =>
                              e.target.checked ? [...prev, u.unit_code] : prev.filter((c) => c !== u.unit_code)
                            )
                          }
                          className="accent-neutral-900"
                        />
                        <div className="min-w-0">
                          <div className="font-mono font-semibold truncate">{u.unit_code}</div>
                          <div className="text-[10px] font-mono text-neutral-500 truncate">
                            {u.itemName} • Batch {u.product_batch?.batch_number || "—"} • ED {formatDateID(u.product_batch?.expired_date)}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-white shrink-0">{formatIDR(u.unitPriceNet)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1">Catatan Pemakaian (Opsional)</label>
              <Input value={usageNotes} onChange={(e) => setUsageNotes(e.target.value)} placeholder="Contoh: Dipakai operasi dr. ... tanggal ..." className="rounded-none h-8 text-xs" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs font-mono">
              <span>Dipilih: <b>{selectedUsageCodes.length} unit</b> (Est. Tagihan: <b>{formatIDR(estUsagePreview)}</b>)</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setUsageOpen(false)} className="rounded-none h-8 text-xs">Batal</Button>
                <Button type="submit" size="sm" disabled={usageSubmitting || selectedUsageCodes.length === 0} className="rounded-none h-8 text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                  {usageSubmitting ? "Memproses..." : `Konfirmasi Terpakai (${selectedUsageCodes.length})`}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Consignment Units Modal */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="rounded-none max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">Retur Barang Titipan ke Stok Gudang ({sale.invoice_number})</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase">Pilih Unit yang Tidak Jadi Dipakai ({consignmentUnits.length} unit)</label>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedReturnCodes(
                      selectedReturnCodes.length === consignmentUnits.length
                        ? []
                        : consignmentUnits.map((u) => u.unit_code)
                    )
                  }
                  className="text-[11px] font-mono text-blue-600 hover:underline cursor-pointer"
                >
                  {selectedReturnCodes.length === consignmentUnits.length ? "Batal Pilih Semua" : "Pilih Semua"}
                </button>
              </div>
              <div className="border border-neutral-200 dark:border-neutral-800 max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {consignmentUnits.map((u) => {
                  const checked = selectedReturnCodes.includes(u.unit_code);
                  return (
                    <label key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedReturnCodes((prev) =>
                              e.target.checked ? [...prev, u.unit_code] : prev.filter((c) => c !== u.unit_code)
                            )
                          }
                          className="accent-neutral-900"
                        />
                        <div className="min-w-0">
                          <div className="font-mono font-semibold truncate">{u.unit_code}</div>
                          <div className="text-[10px] font-mono text-neutral-500 truncate">
                            {u.itemName} • Batch {u.product_batch?.batch_number || "—"} • ED {formatDateID(u.product_batch?.expired_date)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-none text-[10px] font-mono">Kembali ke Stok</Badge>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase block mb-1">Catatan Retur (Opsional)</label>
              <Input value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Alasan retur ke gudang..." className="rounded-none h-8 text-xs" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs font-mono">
              <span>Akan dikembalikan ke stok ready: <b>{selectedReturnCodes.length} unit</b></span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setReturnOpen(false)} className="rounded-none h-8 text-xs">Batal</Button>
                <Button type="submit" size="sm" disabled={returnSubmitting || selectedReturnCodes.length === 0} className="rounded-none h-8 text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                  {returnSubmitting ? "Memproses..." : `Retur ke Stok (${selectedReturnCodes.length})`}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Transaksi Penjualan"
        description="Hanya invoice dengan status Draft (belum Scan Out) dan tanpa pembayaran yang dapat dihapus. Lanjutkan?"
        variant="destructive"
      />
    </div>
  );
}
