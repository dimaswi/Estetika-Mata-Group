import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import {
  inventoryApi,
  categoriesApi,
  variantsApi,
  type InventorySummaryRow,
  type ProductBatch,
  type StockUnit,
  type StockMovement,
  type Category,
  type ProductVariant,
} from '@/lib/api';
import {
  formatDateID,
  formatDateInput,
  formatIDR,
  formatVariantDisplayName,
  generateBatchCode,
  getApiErrorMessage,
  getEDBadgeInfo,
} from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { setPageTitle } from '@/lib/page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThousandInput } from '@/components/ui/thousand-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Warehouse,
  RefreshCw,
  ShoppingBag,
  Search,
  AlertTriangle,
  ArrowUpDown,
  SlidersHorizontal,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ScanLine,
  Loader2,
} from 'lucide-react';

export default function InventoryPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const navigate = useNavigate();
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [summary, setSummary] = useState<InventorySummaryRow[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [units, setUnits] = useState<StockUnit[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Stock Adjustment Modal State
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<'add' | 'subtract'>('add');
  const [adjustVariantId, setAdjustVariantId] = useState('');
  const [adjustForm, setAdjustForm] = useState({
    batch_number: generateBatchCode(),
    expired_date: formatDateInput(),
    location: 'Gudang Utama',
    unit_cost: '0',
    auto_generate_count: '0',
    qty: '0',
    reason: 'opname_plus',
    notes: '',
  });
  const [adjustScanInput, setAdjustScanInput] = useState('');
  const [adjustCodes, setAdjustCodes] = useState<string[]>([]);
  const [adjustReadyUnits, setAdjustReadyUnits] = useState<StockUnit[]>([]);
  const [loadingReadyUnits, setLoadingReadyUnits] = useState(false);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [edFilter, setEdFilter] = useState('all');
  const [unitStatusFilter, setUnitStatusFilter] = useState('in_stock');

  useEffect(() => {
    setPageTitle('Inventory, Batch & Monitoring ED');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, varRes, sumRes, batchRes, unitRes, mvRes] = await Promise.all([
        categoriesApi.getAll(),
        variantsApi.getAll(),
        inventoryApi.getSummary({ category_id: catFilter ? Number(catFilter) : undefined, search: search || undefined }),
        inventoryApi.getBatches({ ed_status: edFilter !== 'all' ? edFilter : undefined }),
        inventoryApi.getUnits({ status: unitStatusFilter !== 'all' ? unitStatusFilter : undefined, search: search || undefined }),
        inventoryApi.getMovements(),
      ]);
      setCategories(catRes.data?.data || []);
      setVariants(varRes.data?.data || []);
      setSummary(sumRes.data?.data || []);
      setBatches(batchRes.data?.data || []);
      setUnits(unitRes.data?.data || []);
      setMovements(mvRes.data?.data || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: getApiErrorMessage(err, 'Gagal memuat inventory') });
    } finally {
      setLoading(false);
    }
  }, [catFilter, search, edFilter, unitStatusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!adjustOpen || adjustMode !== 'subtract' || !adjustVariantId) {
      setAdjustReadyUnits([]);
      return;
    }
    setLoadingReadyUnits(true);
    inventoryApi
      .getUnits({ variant_id: Number(adjustVariantId), status: 'in_stock' })
      .then((res) => {
        const list = res.data?.data || [];
        list.sort((a, b) => {
          const da = a.product_batch?.expired_date ? new Date(a.product_batch.expired_date).getTime() : Number.MAX_SAFE_INTEGER;
          const db = b.product_batch?.expired_date ? new Date(b.product_batch.expired_date).getTime() : Number.MAX_SAFE_INTEGER;
          return da - db;
        });
        setAdjustReadyUnits(list);
      })
      .catch(() => setAdjustReadyUnits([]))
      .finally(() => setLoadingReadyUnits(false));
  }, [adjustOpen, adjustMode, adjustVariantId]);

  const variantOptions = useMemo(
    () =>
      variants.map((v) => {
        const stock = v.stock_count ?? 0;
        return {
          value: String(v.id),
          label: `${formatVariantDisplayName(v)} (${v.sku})`,
          sublabel: `Stok: ${stock} ${v.product?.unit_name || 'unit'} • HPP: ${formatIDR(v.buy_price)}`,
          keywords: `${v.sku} ${v.product?.alternative_name || ''} ${v.barcode || ''}`,
          badge: stock <= 0 ? 'Stok Kosong' : `Stok: ${stock}`,
          badgeVariant: (stock <= 0 ? 'danger' : 'success') as 'danger' | 'success',
        };
      }),
    [variants]
  );

  const openAdjustModal = (variantId?: number, initialMode: 'add' | 'subtract' = 'add') => {
    const targetVar = (variantId ? variants.find((v) => v.id === variantId) : undefined) || variants[0];
    setAdjustMode(initialMode);
    setAdjustVariantId(targetVar ? String(targetVar.id) : '');
    setAdjustForm({
      batch_number: generateBatchCode(),
      expired_date: formatDateInput(),
      location: 'Gudang Utama',
      unit_cost: targetVar ? String(targetVar.buy_price || 0) : '0',
      auto_generate_count: '0',
      qty: '0',
      reason: initialMode === 'add' ? 'opname_plus' : 'opname_minus',
      notes: '',
    });
    setAdjustCodes([]);
    setAdjustScanInput('');
    setAdjustOpen(true);
  };

  const handleAddAdjustCode = () => {
    const code = adjustScanInput.trim();
    if (!code) return;
    if (adjustCodes.includes(code)) {
      toast({ variant: 'destructive', title: 'Duplikat', description: `Kode ${code} sudah ada di daftar.` });
      setAdjustScanInput('');
      return;
    }
    if (adjustMode === 'subtract') {
      const matched = adjustReadyUnits.find((u) => u.unit_code.toLowerCase() === code.toLowerCase());
      if (!matched) {
        toast({ variant: 'destructive', title: 'Tidak Ditemukan', description: `Unit ${code} tidak ada dalam stok ready variasi ini.` });
        return;
      }
      setAdjustCodes((prev) => [...prev, matched.unit_code]);
      setAdjustScanInput('');
      return;
    }
    setAdjustCodes((prev) => [...prev, code]);
    setAdjustScanInput('');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustVariantId) {
      toast({ variant: 'destructive', title: 'Validasi', description: 'Pilih produk / variasi terlebih dahulu.' });
      return;
    }
    const autoCount = Number(adjustForm.auto_generate_count || 0);
    const subQty = Number(adjustForm.qty || 0);

    if (adjustMode === 'add' && adjustCodes.length === 0 && autoCount <= 0) {
      toast({ variant: 'destructive', title: 'Validasi', description: 'Scan minimal 1 barcode unit atau isi Auto QR (Qty).' });
      return;
    }
    if (adjustMode === 'subtract' && adjustCodes.length === 0 && subQty <= 0) {
      toast({ variant: 'destructive', title: 'Validasi', description: 'Pilih/scan unit yang dikurangi atau isi Qty Cepat > 0.' });
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await inventoryApi.adjustStock({
        mode: adjustMode,
        product_variant_id: Number(adjustVariantId),
        batch_number: adjustMode === 'add' ? adjustForm.batch_number : undefined,
        expired_date: adjustMode === 'add' ? adjustForm.expired_date : undefined,
        location: adjustMode === 'add' ? adjustForm.location : undefined,
        unit_cost: adjustMode === 'add' ? Number(adjustForm.unit_cost || 0) : undefined,
        unit_codes: adjustCodes,
        auto_generate_count: adjustMode === 'add' ? autoCount : 0,
        qty: adjustMode === 'subtract' && adjustCodes.length === 0 ? subQty : 0,
        reason: adjustForm.reason,
        notes: adjustForm.notes,
      });
      toast({
        variant: 'success',
        title: 'Penyesuaian Stok Berhasil!',
        description: `${res.data.data.processed_count} unit berhasil ${adjustMode === 'add' ? 'ditambahkan ke stok' : 'dikurangi dari stok'}.`,
      });
      setAdjustOpen(false);
      await loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Gagal Penyesuaian', description: getApiErrorMessage(err, 'Gagal memproses penyesuaian stok.') });
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const expiredOrCriticalCount = batches.filter((b) => b.qty_available > 0 && (b.ed_status === 'expired' || b.ed_status === 'critical_30')).length;
  const totalUnitsInStock = summary.reduce((s, r) => s + r.in_stock_count, 0);

  const summaryColumns = useMemo<ColumnDef<InventorySummaryRow>[]>(
    () => [
      {
        id: 'no',
        meta: { className: 'w-12 text-center' },
        header: () => <span className="block text-center">NO</span>,
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          return <span className="font-mono text-neutral-500 text-xs">{pageIndex * pageSize + row.index + 1}</span>;
        },
      },
      {
        accessorKey: 'category_name',
        header: () => <span>KATEGORI</span>,
        cell: ({ row }) => <span className="text-xs">{row.original.category_name}</span>,
      },
      {
        accessorKey: 'product_name',
        header: ({ column }) => (
          <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
            <span>PRODUK &amp; VARIASI (WADAH KELOMPOK)</span>
            <ArrowUpDown className="size-3 text-neutral-400" />
          </button>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="text-xs">
              <div className="font-semibold">
                {r.has_variants === false || r.is_default ? r.product_name : `${r.product_name} — ${r.variant_name}`}
              </div>
              {r.brand && <div className="text-[11px] text-neutral-500">{r.brand}</div>}
            </div>
          );
        },
      },
      {
        accessorKey: 'sku',
        header: ({ column }) => (
          <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
            <span>SKU</span>
            <ArrowUpDown className="size-3 text-neutral-400" />
          </button>
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.sku}</span>,
      },
      {
        accessorKey: 'in_stock_count',
        header: ({ column }) => (
          <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-[11px]">
            <span>STOK TERSEDIA</span>
            <ArrowUpDown className="size-3 text-neutral-400" />
          </button>
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <Badge variant={r.is_low_stock ? 'destructive' : 'default'} className="rounded-none text-[10px] font-mono">
              {r.in_stock_count} {r.unit_name} ({r.batches_count} batch)
            </Badge>
          );
        },
      },
      {
        accessorKey: 'nearest_ed',
        header: () => <span>ED TERDEKAT (FEFO)</span>,
        cell: ({ row }) => {
          const r = row.original;
          const ed = getEDBadgeInfo(r.ed_status, r.days_to_expiry);
          return (
            <div>
              <div className="text-xs">{formatDateID(r.nearest_ed)}</div>
              <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 border ${ed.className}`}>{ed.label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'sell_price',
        meta: { className: 'text-right' },
        header: () => <span className="block text-right">HARGA JUAL</span>,
        cell: ({ row }) => <span className="text-xs font-mono font-medium block text-right">{formatIDR(row.original.sell_price)}</span>,
      },
    ],
    []
  );

  const batchColumns = useMemo<ColumnDef<ProductBatch>[]>(
    () => [
      {
        accessorKey: 'batch_number',
        header: () => <span>NO. BATCH</span>,
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.batch_number}</span>,
      },
      {
        id: 'variant',
        header: () => <span>PRODUK &amp; VARIASI</span>,
        cell: ({ row }) => <span className="text-xs">{formatVariantDisplayName(row.original.product_variant)}</span>,
      },
      {
        id: 'supplier',
        header: () => <span>SUPPLIER</span>,
        cell: ({ row }) => <span className="text-xs">{row.original.supplier?.name || '-'}</span>,
      },
      {
        accessorKey: 'expired_date',
        header: () => <span>EXPIRED DATE</span>,
        cell: ({ row }) => <span className="text-xs">{formatDateID(row.original.expired_date)}</span>,
      },
      {
        id: 'ed_status',
        header: () => <span>STATUS ED</span>,
        cell: ({ row }) => {
          const ed = getEDBadgeInfo(row.original.ed_status, row.original.days_to_expiry);
          return <span className={`text-[10px] px-1.5 py-0.5 border font-medium ${ed.className}`}>{ed.label}</span>;
        },
      },
      {
        id: 'qty',
        header: () => <span>SISA / AWAL</span>,
        cell: ({ row }) => <span className="text-xs font-mono font-semibold">{row.original.qty_available} / {row.original.qty_initial}</span>,
      },
      {
        accessorKey: 'unit_cost',
        meta: { className: 'text-right' },
        header: () => <span className="block text-right">HPP UNIT</span>,
        cell: ({ row }) => <span className="text-xs font-mono block text-right">{formatIDR(row.original.unit_cost)}</span>,
      },
    ],
    []
  );

  const unitColumns = useMemo<ColumnDef<StockUnit>[]>(
    () => [
      {
        accessorKey: 'unit_code',
        header: () => <span>KODE BARCODE / QR UNIT</span>,
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.unit_code}</span>,
      },
      {
        id: 'variant',
        header: () => <span>PRODUK &amp; VARIASI</span>,
        cell: ({ row }) => <span className="text-xs">{formatVariantDisplayName(row.original.product_variant)}</span>,
      },
      {
        id: 'batch_ed',
        header: () => <span>BATCH &amp; ED</span>,
        cell: ({ row }) => (
          <span className="text-xs">
            <span className="font-mono">{row.original.product_batch?.batch_number}</span> · {formatDateID(row.original.product_batch?.expired_date)}
          </span>
        ),
      },
      {
        accessorKey: 'location',
        header: () => <span>LOKASI</span>,
        cell: ({ row }) => <span className="text-xs">{row.original.location || '-'}</span>,
      },
      {
        accessorKey: 'status',
        header: () => <span>STATUS</span>,
        cell: ({ row }) => (
          <Badge variant={row.original.status === 'in_stock' ? 'default' : 'secondary'} className="rounded-none text-[10px] font-mono">
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'scanned_in_at',
        header: () => <span>WAKTU SCAN IN</span>,
        cell: ({ row }) => <span className="text-xs">{formatDateID(row.original.scanned_in_at)}</span>,
      },
    ],
    []
  );

  const movementColumns = useMemo<ColumnDef<StockMovement>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: () => <span>WAKTU</span>,
        cell: ({ row }) => <span className="text-xs">{new Date(row.original.created_at).toLocaleString('id-ID')}</span>,
      },
      {
        accessorKey: 'movement_type',
        header: () => <span>TIPE</span>,
        cell: ({ row }) => (
          <Badge variant={row.original.movement_type === 'scan_in' ? 'default' : 'secondary'} className="rounded-none text-[10px] font-mono">
            {row.original.movement_type}
          </Badge>
        ),
      },
      {
        id: 'unit_code',
        header: () => <span>KODE UNIT</span>,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.stock_unit?.unit_code || '-'}</span>,
      },
      {
        id: 'variant',
        header: () => <span>PRODUK &amp; VARIASI</span>,
        cell: ({ row }) => <span className="text-xs">{formatVariantDisplayName(row.original.product_variant)}</span>,
      },
      {
        id: 'batch',
        header: () => <span>BATCH</span>,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.product_batch?.batch_number || '-'}</span>,
      },
      {
        accessorKey: 'notes',
        header: () => <span>CATATAN</span>,
        cell: ({ row }) => <span className="text-xs text-neutral-500">{row.original.notes || '-'}</span>,
      },
    ],
    []
  );

  return (
    <div className="w-full space-y-4">
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0">
              <Warehouse className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Inventory, Batch &amp; Monitoring ED (FEFO)</h1>
              <p className="text-xs text-neutral-500">Total stok per variasi, pengelompokan unit fisik hasil scan, serta kontrol Expired Date</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="rounded-none h-8 text-xs">
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            {hasPermission('inventory.manage') && (
              <Button variant="outline" size="sm" onClick={() => openAdjustModal()} className="rounded-none h-8 text-xs">
                <SlidersHorizontal className="size-3.5 mr-1.5" /> Penyesuaian Stok
              </Button>
            )}
            <Button asChild size="sm" className="rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 h-8 text-xs">
              <Link to="/purchases">
                <ShoppingBag className="size-3.5 mr-1.5" /> Pembelian
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
          <div className="p-3">
            <div className="text-[11px] uppercase text-neutral-500">Total Variasi</div>
            <div className="text-lg font-bold">{summary.length}</div>
          </div>
          <div className="p-3">
            <div className="text-[11px] uppercase text-neutral-500">Total Unit In-Stock</div>
            <div className="text-lg font-bold">{totalUnitsInStock}</div>
          </div>
          <div className="p-3">
            <div className="text-[11px] uppercase text-neutral-500">Batch Aktif</div>
            <div className="text-lg font-bold">{batches.filter((b) => b.qty_available > 0).length}</div>
          </div>
          <div className="p-3">
            <div className="text-[11px] uppercase text-red-600 flex items-center gap-1">
              <AlertTriangle className="size-3" /> Batch Kritis / ED
            </div>
            <div className="text-lg font-bold text-red-600">{expiredOrCriticalCount}</div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="px-3 pt-2 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 bg-neutral-50/50 dark:bg-neutral-900/30">
            <TabsList className="rounded-none bg-transparent p-0 h-9 gap-1">
              <TabsTrigger value="summary" className="rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 dark:data-[state=active]:border-white">
                Stok per Variasi / Kelompok
              </TabsTrigger>
              <TabsTrigger value="batches" className="rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 dark:data-[state=active]:border-white">
                Batch &amp; Monitoring ED (FEFO)
              </TabsTrigger>
              <TabsTrigger value="units" className="rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 dark:data-[state=active]:border-white">
                Daftar Unit Barcode/QR
              </TabsTrigger>
              <TabsTrigger value="movements" className="rounded-none text-xs data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 dark:data-[state=active]:border-white">
                Log Scan In / Out
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 pb-2">
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk, variasi, kode unit..." className="pl-8 h-7 text-xs rounded-none w-52" />
              </div>
              {tab === 'summary' && (
                <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="h-7 px-2 border border-neutral-200 dark:border-neutral-800 bg-background text-xs">
                  <option value="">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              {tab === 'batches' && (
                <select value={edFilter} onChange={(e) => setEdFilter(e.target.value)} className="h-7 px-2 border border-neutral-200 dark:border-neutral-800 bg-background text-xs">
                  <option value="all">Semua Status ED</option>
                  <option value="expired">Expired</option>
                  <option value="critical_30">Kritis (≤ 30 hari)</option>
                  <option value="warning_90">Mendekati ED (≤ 90 hari)</option>
                  <option value="safe">Aman</option>
                </select>
              )}
              {tab === 'units' && (
                <select value={unitStatusFilter} onChange={(e) => setUnitStatusFilter(e.target.value)} className="h-7 px-2 border border-neutral-200 dark:border-neutral-800 bg-background text-xs">
                  <option value="in_stock">In Stock</option>
                  <option value="consignment">Titipan Konsinyasi</option>
                  <option value="sold">Terjual (Sold)</option>
                  <option value="adjusted_out">Penyesuaian Keluar</option>
                  <option value="expired">Expired</option>
                  <option value="damaged">Rusak</option>
                  <option value="all">Semua Status</option>
                </select>
              )}
            </div>
          </div>

          <TabsContent value="summary" className="m-0">
            <DataTable
              embedded
              showHeader={false}
              showSearch={false}
              columns={summaryColumns}
              data={summary}
              entityName="Stok Variasi"
              loading={loading}
              pageSize={10}
              onRowClick={(r) =>
                navigate(
                  r.has_variants === false || r.is_default
                    ? `/products/${r.product_id}`
                    : `/products/${r.product_id}/variants/${r.variant_id}`
                )
              }
            />
          </TabsContent>

          <TabsContent value="batches" className="m-0">
            <DataTable
              embedded
              showHeader={false}
              showSearch={false}
              columns={batchColumns}
              data={batches}
              entityName="Batch"
              loading={loading}
              pageSize={10}
            />
          </TabsContent>

          <TabsContent value="units" className="m-0">
            <DataTable
              embedded
              showHeader={false}
              showSearch={false}
              columns={unitColumns}
              data={units}
              entityName="Unit"
              loading={loading}
              pageSize={10}
            />
          </TabsContent>

          <TabsContent value="movements" className="m-0">
            <DataTable
              embedded
              showHeader={false}
              showSearch={false}
              columns={movementColumns}
              data={movements}
              entityName="Log Scan"
              loading={loading}
              pageSize={10}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Stock Adjustment Modal */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="rounded-none max-w-5xl w-[95vw] p-0 gap-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/60 flex items-center gap-3">
            <div className="size-9 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold uppercase tracking-tight">
                Penyesuaian Stok Gudang (Stock Opname / Koreksi)
              </DialogTitle>
              <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                Catat penambahan stok awal/opname lebih atau pengurangan barang rusak, kadaluarsa, &amp; selisih
              </p>
            </div>
          </div>

          <form onSubmit={handleAdjustSubmit}>
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-7">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 block mb-1.5">
                  Produk / Variasi yang Disesuaikan <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  usePortal={false}
                  options={variantOptions}
                  value={adjustVariantId}
                  onValueChange={(val) => {
                    const v = variants.find((item) => String(item.id) === val);
                    setAdjustVariantId(val);
                    setAdjustCodes([]);
                    setAdjustForm((prev) => ({
                      ...prev,
                      unit_cost: v ? String(v.buy_price || 0) : prev.unit_cost,
                    }));
                  }}
                  placeholder="Pilih produk / variasi..."
                  searchPlaceholder="Cari nama produk, variasi, atau SKU..."
                  className="h-9"
                />
              </div>

              <div className="lg:col-span-5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 block mb-1.5">
                  Jenis Penyesuaian
                </label>
                <div className="grid grid-cols-2 border border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustMode('add');
                      setAdjustCodes([]);
                      setAdjustForm((prev) => ({ ...prev, reason: 'opname_plus', qty: '0' }));
                    }}
                    className={`h-9 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      adjustMode === 'add'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-white dark:bg-neutral-950 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Plus className="size-3.5" /> Tambah Stok (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustMode('subtract');
                      setAdjustCodes([]);
                      setAdjustForm((prev) => ({ ...prev, reason: 'opname_minus', auto_generate_count: '0' }));
                    }}
                    className={`h-9 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      adjustMode === 'subtract'
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-white dark:bg-neutral-950 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Minus className="size-3.5" /> Kurangi Stok (-)
                  </button>
                </div>
              </div>
            </div>

            {adjustMode === 'add' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800">
                <div className="lg:col-span-5 p-6 space-y-3.5 bg-neutral-50/40 dark:bg-neutral-900/20">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    1. Detail Batch &amp; Alasan Penambahan
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Kategori Alasan</label>
                    <select
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      className="w-full h-9 px-2.5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs rounded-none"
                    >
                      <option value="opname_plus">Stock Opname (Lebih)</option>
                      <option value="initial_stock">Stok Awal Migrasi</option>
                      <option value="found">Barang Ditemukan Kembali</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">No. Batch / Lot *</label>
                      <Input
                        required
                        value={adjustForm.batch_number}
                        onChange={(e) => setAdjustForm({ ...adjustForm, batch_number: e.target.value })}
                        className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Expired Date (ED) *</label>
                      <Input
                        type="date"
                        required
                        value={adjustForm.expired_date}
                        onChange={(e) => setAdjustForm({ ...adjustForm, expired_date: e.target.value })}
                        className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Lokasi Rak</label>
                      <Input
                        value={adjustForm.location}
                        onChange={(e) => setAdjustForm({ ...adjustForm, location: e.target.value })}
                        className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">HPP Unit (Rp)</label>
                      <ThousandInput
                        value={adjustForm.unit_cost}
                        onValueChange={(v) => setAdjustForm({ ...adjustForm, unit_cost: v })}
                        className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Auto QR (Qty)</label>
                      <ThousandInput
                        allowDecimal={false}
                        value={adjustForm.auto_generate_count}
                        onValueChange={(v) => setAdjustForm({ ...adjustForm, auto_generate_count: v })}
                        className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Catatan Penyesuaian</label>
                    <Input
                      value={adjustForm.notes}
                      onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                      placeholder="Keterangan hasil opname / stok awal..."
                      className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                    />
                  </div>
                </div>

                <div className="lg:col-span-7 p-6 space-y-4 bg-white dark:bg-neutral-950">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      2. Scan Barcode / QR Unit Masuk
                    </span>
                    <Badge variant="secondary" className="rounded-none text-[10px] font-mono">
                      {adjustCodes.length} Manual • {Number(adjustForm.auto_generate_count || 0)} Auto QR
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ScanLine className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                      <Input
                        value={adjustScanInput}
                        onChange={(e) => setAdjustScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAdjustCode();
                          }
                        }}
                        placeholder="Scan barcode unit atau ketik lalu Enter (opsional jika pakai Auto QR)..."
                        className="h-9 pl-9 text-xs rounded-none font-mono"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddAdjustCode} className="h-9 rounded-none text-xs px-3.5">
                      <Plus className="size-3.5 mr-1" /> Tambah
                    </Button>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/20 h-[215px] overflow-y-auto p-3">
                    {adjustCodes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 space-y-1.5">
                        <ScanLine className="size-7 opacity-40" />
                        <p className="text-xs font-mono">Belum ada barcode unit yang di-scan manual</p>
                        <p className="text-[11px]">Scan barcode fisik di atas atau isi <b>Auto QR (Qty)</b> di panel kiri.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {adjustCodes.map((code, idx) => (
                          <div key={code} className="flex items-center justify-between text-xs px-2.5 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                            <span className="font-mono font-semibold truncate">#{String(idx + 1).padStart(2, '0')} {code}</span>
                            <button type="button" onClick={() => setAdjustCodes((prev) => prev.filter((c) => c !== code))} className="text-neutral-400 hover:text-rose-600 ml-2">
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800">
                <div className="lg:col-span-5 p-6 space-y-3.5 bg-neutral-50/40 dark:bg-neutral-900/20">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      1. Stok Ready Gudang (FEFO)
                    </span>
                    <Badge variant="secondary" className="rounded-none text-[10px] font-mono">
                      {adjustReadyUnits.length} Ready
                    </Badge>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 h-[175px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                    {loadingReadyUnits ? (
                      <div className="h-full flex items-center justify-center gap-2 text-xs font-mono text-neutral-400">
                        <Loader2 className="size-3.5 animate-spin" /> Memuat stok ready...
                      </div>
                    ) : adjustReadyUnits.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs font-mono text-neutral-400 p-4 text-center">
                        Tidak ada unit in_stock pada variasi ini
                      </div>
                    ) : (
                      adjustReadyUnits.map((u) => {
                        const picked = adjustCodes.includes(u.unit_code);
                        const edBadge = getEDBadgeInfo(u.product_batch?.ed_status, u.product_batch?.days_to_expiry);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            disabled={picked}
                            onClick={() => setAdjustCodes((prev) => [...prev, u.unit_code])}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 ${
                              picked ? 'bg-amber-50/70 dark:bg-amber-950/30 opacity-70' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-xs font-semibold truncate">{u.unit_code}</div>
                              <div className="text-[10px] font-mono text-neutral-500 truncate">
                                Batch: {u.product_batch?.batch_number || '—'} • ED {formatDateID(u.product_batch?.expired_date)}
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 border font-medium shrink-0 ${edBadge.className}`}>
                              {edBadge.label}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Alasan Pengurangan</label>
                      <select
                        value={adjustForm.reason}
                        onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                        className="w-full h-9 px-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs rounded-none"
                      >
                        <option value="opname_minus">Selisih Opname (Kurang)</option>
                        <option value="damaged">Barang Rusak / Cacat</option>
                        <option value="expired">Kadaluarsa / Expired</option>
                        <option value="other">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Qty Cepat (FEFO)</label>
                      <ThousandInput
                        allowDecimal={false}
                        disabled={adjustCodes.length > 0}
                        value={adjustForm.qty}
                        onValueChange={(v) => setAdjustForm({ ...adjustForm, qty: v })}
                        className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Catatan Penyesuaian</label>
                    <Input
                      value={adjustForm.notes}
                      onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                      placeholder="Keterangan selisih / kerusakan / kadaluarsa..."
                      className="h-9 text-xs rounded-none bg-white dark:bg-neutral-950"
                    />
                  </div>
                </div>

                <div className="lg:col-span-7 p-6 space-y-4 bg-white dark:bg-neutral-950">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      2. Unit yang Dikurangi dari Stok
                    </span>
                    {adjustCodes.length > 0 && (
                      <button type="button" onClick={() => setAdjustCodes([])} className="text-[11px] font-mono text-rose-600 hover:underline cursor-pointer">
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ScanLine className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                      <Input
                        value={adjustScanInput}
                        onChange={(e) => setAdjustScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAdjustCode();
                          }
                        }}
                        placeholder="Scan unit spesifik atau klik dari daftar stok ready di kiri..."
                        className="h-9 pl-9 text-xs rounded-none font-mono"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddAdjustCode} className="h-9 rounded-none text-xs px-3.5">
                      <Plus className="size-3.5 mr-1" /> Tambah
                    </Button>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/20 h-[230px] overflow-y-auto p-3">
                    {adjustCodes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 space-y-1.5">
                        <ScanLine className="size-7 opacity-40" />
                        <p className="text-xs font-mono">
                          {Number(adjustForm.qty || 0) > 0
                            ? `Mode Qty Cepat aktif: ${adjustForm.qty} unit FEFO terawal akan dikurangi otomatis.`
                            : 'Belum ada unit spesifik yang dipilih'}
                        </p>
                        <p className="text-[11px]">Klik unit di daftar kiri, scan barcode di atas, atau isi <b>Qty Cepat (FEFO)</b>.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {adjustCodes.map((code, idx) => (
                          <div key={code} className="flex items-center justify-between text-xs px-2.5 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                            <span className="font-mono font-semibold truncate">#{String(idx + 1).padStart(2, '0')} {code}</span>
                            <button type="button" onClick={() => setAdjustCodes((prev) => prev.filter((c) => c !== code))} className="text-neutral-400 hover:text-rose-600 ml-2">
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                Total penyesuaian:{" "}
                <span className="font-bold text-neutral-900 dark:text-white">
                  {adjustMode === 'add'
                    ? `+${adjustCodes.length + Number(adjustForm.auto_generate_count || 0)} unit`
                    : `-${adjustCodes.length > 0 ? adjustCodes.length : Number(adjustForm.qty || 0)} unit`}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdjustOpen(false)} className="h-9 rounded-none px-4 text-xs">
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    adjustSubmitting ||
                    (adjustMode === 'add'
                      ? adjustCodes.length + Number(adjustForm.auto_generate_count || 0) <= 0
                      : adjustCodes.length === 0 && Number(adjustForm.qty || 0) <= 0)
                  }
                  className="h-9 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 text-xs gap-1.5"
                >
                  {adjustSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>{adjustSubmitting ? 'Memproses...' : 'Simpan Penyesuaian Stok'}</span>
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
