import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { usePermission } from '@/hooks/usePermission';
import { dashboardApi, type DashboardData } from '@/lib/api';
import { formatIDR, formatDateID, formatVariantDisplayName, getEDBadgeInfo } from '@/lib/format';
import {
  LayoutGrid,
  RefreshCw,
  Plus,
  ChevronRight,
  Warehouse,
  AlertTriangle,
  Receipt,
  ShoppingBag,
  Users,
  Truck,
  Package,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { setPageTitle } from '@/lib/page-title';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const salePaymentBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'Lunas', variant: 'default' },
  partial: { label: 'Sebagian', variant: 'secondary' },
  unpaid: { label: 'Belum Bayar', variant: 'outline' },
  overdue: { label: 'Jatuh Tempo', variant: 'destructive' },
  waiting_usage: { label: 'Menunggu Dipakai', variant: 'outline' },
};

const purchasePaymentBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'Lunas', variant: 'default' },
  partial: { label: 'Sebagian', variant: 'secondary' },
  unpaid: { label: 'Belum Bayar', variant: 'outline' },
  overdue: { label: 'Jatuh Tempo', variant: 'destructive' },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { hasPermission } = usePermission();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getSummary();
      setData(res.data?.data || null);
      setLastUpdated(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch {
      // ignore initial error toast noise if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPageTitle('Dashboard');
    loadDashboardData();
  }, [loadDashboardData]);

  const inv = data?.inventory;
  const sales = data?.sales;
  const purchases = data?.purchases;
  const partners = data?.partners;
  const criticalCount = (inv?.ed_expired_units || 0) + (inv?.ed_critical_units || 0);

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Top Executive Container */}
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        {/* Header Bar */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <LayoutGrid className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                DASHBOARD OPERASIONAL &amp; INVENTORY ALKES
              </h1>
              <p className="text-xs text-neutral-500 font-mono flex items-center gap-1.5 mt-0.5">
                <span>Ringkasan Stok, Monitoring ED (FEFO), Pembelian &amp; Penjualan</span>
                {lastUpdated && (
                  <>
                    <span>•</span>
                    <span>Update: {lastUpdated}</span>
                  </>
                )}
                {loading && <RefreshCw className="size-3 animate-spin text-neutral-400 ml-1" />}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              disabled={loading}
              className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none"
              title="Segarkan Data Dashboard"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            </Button>

            {hasPermission('purchases.create') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/purchases/create')}
                className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs font-semibold gap-1.5 shadow-none px-3"
              >
                <Plus className="size-3.5 text-neutral-500" />
                <span>Buat Pembelian</span>
              </Button>
            )}

            {hasPermission('sales.create') && (
              <Button
                size="sm"
                onClick={() => navigate('/sales/create')}
                className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 rounded-none h-8 px-3 text-xs font-semibold gap-1.5 shadow-none"
              >
                <Plus className="size-3.5" />
                <span>Buat Penjualan</span>
              </Button>
            )}
          </div>
        </div>

        {/* KPI Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
          <div className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>STOK READY GUDANG</span>
              <Warehouse className="size-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-neutral-900 dark:text-white">
                {inv?.units_in_stock ?? 0} Unit
              </span>
              {(inv?.units_consignment || 0) > 0 && (
                <Badge variant="secondary" className="rounded-none text-[10px] font-mono">
                  {inv?.units_consignment} Titip
                </Badge>
              )}
            </div>
            <p className="text-[11px] font-mono text-neutral-500">
              {inv?.total_products ?? 0} Produk • {inv?.total_variants ?? 0} Variasi ({inv?.out_of_stock_variants ?? 0} Kosong)
            </p>
          </div>

          <div className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>PERINGATAN ED (FEFO)</span>
              <AlertTriangle className={cn('size-3.5', criticalCount > 0 ? 'text-rose-500' : 'text-emerald-500')} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-xl font-bold font-mono', criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                {criticalCount} Unit Kritis
              </span>
              {(inv?.ed_expired_units || 0) > 0 && (
                <Badge variant="destructive" className="rounded-none text-[10px] font-mono">
                  Expired: {inv?.ed_expired_units}
                </Badge>
              )}
            </div>
            <p className="text-[11px] font-mono text-neutral-500">
              &le;30 hr: {inv?.ed_critical_units ?? 0} • 31-90 hr: {inv?.ed_warning_units ?? 0} • Aman: {inv?.ed_safe_units ?? 0}
            </p>
          </div>

          <div className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>PENJUALAN &amp; TAGIHAN AKTIF</span>
              <Receipt className="size-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-neutral-900 dark:text-white">
                {formatIDR(sales?.total_billed)}
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-500">
              {sales?.total_count ?? 0} Invoice • {sales?.waiting_usage_count ?? 0} Konsinyasi Menunggu
            </p>
          </div>

          <div className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>PEMBELIAN SUPPLIER</span>
              <ShoppingBag className="size-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-neutral-900 dark:text-white">
                {formatIDR(purchases?.total_amount)}
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-500">
              {purchases?.total_count ?? 0} PO • Dibayar: {formatIDR(purchases?.total_paid)}
            </p>
          </div>
        </div>

        {/* Financial & Partner Sub-Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 dark:divide-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-xs">
          <div className="px-4 py-3 space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">NILAI ASET STOK READY</span>
            <span className="font-mono font-bold text-neutral-900 dark:text-white">{formatIDR(inv?.inventory_value)}</span>
          </div>
          <div className="px-4 py-3 space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">BARANG TITIP (KONSINYASI)</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {formatIDR(sales?.consignment_total)} ({inv?.units_consignment ?? 0} unit)
            </span>
          </div>
          <div className="px-4 py-3 space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">SISA PIUTANG CUSTOMER (AR)</span>
            <span className="font-mono font-bold text-amber-600">{formatIDR(sales?.outstanding_ar)}</span>
          </div>
          <div className="px-4 py-3 space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">SISA HUTANG SUPPLIER (AP)</span>
            <span className="font-mono font-bold text-rose-600">{formatIDR(purchases?.outstanding_ap)}</span>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left 8 Columns: FEFO Batches, Recent Sales, Recent Purchases */}
        <div className="lg:col-span-8 space-y-4">
          {/* FEFO Priority Batches */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Monitoring Batch Prioritas FEFO (ED Terdekat)</h2>
              </div>
              {hasPermission('inventory.view') && (
                <Link to="/inventory" className="text-xs font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white inline-flex items-center gap-0.5">
                  <span>Semua Inventory</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-neutral-500 font-semibold uppercase text-[11px]">
                    <th className="px-4 py-2.5 text-left">Produk &amp; Variasi</th>
                    <th className="px-4 py-2.5 text-left">No. Batch</th>
                    <th className="px-4 py-2.5 text-left">Expired Date</th>
                    <th className="px-4 py-2.5 text-center">Stok Ready</th>
                    <th className="px-4 py-2.5 text-right">Status ED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {!data?.expiring_batches || data.expiring_batches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center font-mono text-neutral-400">
                        Belum ada batch dengan stok tersedia.
                      </td>
                    </tr>
                  ) : (
                    data.expiring_batches.map((b) => {
                      const edInfo = getEDBadgeInfo(b.ed_status, b.days_to_expiry);
                      return (
                        <tr key={b.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-900/30">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {formatVariantDisplayName(b.product_variant)}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-400">
                              {b.product_variant?.sku}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-neutral-700 dark:text-neutral-300">{b.batch_number}</td>
                          <td className="px-4 py-2.5 font-mono">{formatDateID(b.expired_date)}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold">{b.qty_available}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`inline-block text-[10px] px-1.5 py-0.5 border font-medium ${edInfo.className}`}>
                              {edInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-neutral-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Penjualan &amp; Konsinyasi Terbaru</h2>
              </div>
              {hasPermission('sales.view') && (
                <Link to="/sales" className="text-xs font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white inline-flex items-center gap-0.5">
                  <span>Semua Penjualan</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-neutral-500 font-semibold uppercase text-[11px]">
                    <th className="px-4 py-2.5 text-left">Invoice</th>
                    <th className="px-4 py-2.5 text-left">Pelanggan</th>
                    <th className="px-4 py-2.5 text-center">Scan Out</th>
                    <th className="px-4 py-2.5 text-right">Tagihan</th>
                    <th className="px-4 py-2.5 text-center">Status Bayar</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {!data?.recent_sales || data.recent_sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center font-mono text-neutral-400">
                        Belum ada transaksi penjualan.
                      </td>
                    </tr>
                  ) : (
                    data.recent_sales.map((s) => {
                      const items = s.items || [];
                      const ord = items.reduce((sum, it) => sum + (it.qty_ordered || 0), 0);
                      const out = items.reduce((sum, it) => sum + (it.qty_scanned_out || 0), 0);
                      const billable = s.payment_type === 'consignment' ? (s.billable_amount || 0) : s.total_amount;
                      const pBadge = salePaymentBadge[s.payment_status] || { label: s.payment_status, variant: 'outline' as const };
                      return (
                        <tr key={s.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-900/30">
                          <td className="px-4 py-2.5">
                            <div className="font-mono font-bold text-neutral-900 dark:text-white">{s.invoice_number}</div>
                            <div className="text-[10px] font-mono text-neutral-400 uppercase">{s.payment_type}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">{s.customer_name}</div>
                            <div className="text-[10px] font-mono text-neutral-400">{formatDateID(s.sale_date)}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold">
                            <span className={out >= ord && ord > 0 ? 'text-emerald-600' : 'text-amber-600'}>
                              {out} / {ord}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">
                            <div>{formatIDR(billable)}</div>
                            {s.payment_type === 'consignment' && (
                              <div className="text-[10px] font-normal text-neutral-400">Titip: {formatIDR(s.total_amount)}</div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant={pBadge.variant} className="rounded-none text-[10px] uppercase">
                              {pBadge.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-none"
                              onClick={() => navigate(`/sales/${s.id}`)}
                              title="Detail Penjualan"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-neutral-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Pembelian Supplier Terbaru</h2>
              </div>
              {hasPermission('purchases.view') && (
                <Link to="/purchases" className="text-xs font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white inline-flex items-center gap-0.5">
                  <span>Semua Pembelian</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-neutral-500 font-semibold uppercase text-[11px]">
                    <th className="px-4 py-2.5 text-left">No. PO / Invoice</th>
                    <th className="px-4 py-2.5 text-left">Supplier</th>
                    <th className="px-4 py-2.5 text-center">Scan In</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-center">Status Bayar</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {!data?.recent_purchases || data.recent_purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center font-mono text-neutral-400">
                        Belum ada transaksi pembelian.
                      </td>
                    </tr>
                  ) : (
                    data.recent_purchases.map((p) => {
                      const items = p.items || [];
                      const ord = items.reduce((sum, it) => sum + (it.qty_ordered || 0), 0);
                      const scanned = items.reduce((sum, it) => sum + (it.qty_scanned_in || 0), 0);
                      const pBadge = purchasePaymentBadge[p.payment_status] || { label: p.payment_status, variant: 'outline' as const };
                      return (
                        <tr key={p.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-900/30">
                          <td className="px-4 py-2.5 font-mono font-bold text-neutral-900 dark:text-white">{p.invoice_number}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">{p.supplier?.name || '—'}</div>
                            <div className="text-[10px] font-mono text-neutral-400">{formatDateID(p.purchase_date)}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold">
                            <span className={scanned >= ord && ord > 0 ? 'text-emerald-600' : 'text-amber-600'}>
                              {scanned} / {ord}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold">{formatIDR(p.total_amount)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant={pBadge.variant} className="rounded-none text-[10px] uppercase">
                              {pBadge.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-none"
                              onClick={() => navigate(`/purchases/${p.id}`)}
                              title="Detail Pembelian"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Inventory Health & Quick Actions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">KESEHATAN STOK &amp; MITRA</span>
              <Badge variant={criticalCount > 0 ? 'destructive' : 'default'} className="rounded-none text-[10px] font-mono uppercase">
                {criticalCount > 0 ? 'PERLU CEK ED' : 'TERKENDALI'}
              </Badge>
            </div>
            <div className="p-4 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Unit Expired (&lt;0 hr):</span>
                <span className={cn('font-bold', (inv?.ed_expired_units || 0) > 0 ? 'text-rose-600' : 'text-neutral-900 dark:text-white')}>
                  {inv?.ed_expired_units ?? 0} Unit
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Unit Kritis (&le;30 hr):</span>
                <span className={cn('font-bold', (inv?.ed_critical_units || 0) > 0 ? 'text-orange-600' : 'text-neutral-900 dark:text-white')}>
                  {inv?.ed_critical_units ?? 0} Unit
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Unit Waspada (31-90 hr):</span>
                <span className="font-bold text-amber-600">{inv?.ed_warning_units ?? 0} Unit</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Unit Aman (&gt;90 hr):</span>
                <span className="font-bold text-emerald-600">{inv?.ed_safe_units ?? 0} Unit</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-500">Variasi Stok Kosong:</span>
                <span className="font-bold text-rose-600">{inv?.out_of_stock_variants ?? 0} Variasi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Master Pelanggan:</span>
                <span className="font-bold">{partners?.total_customers ?? 0} Pelanggan</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Master Supplier:</span>
                <span className="font-bold">{partners?.total_suppliers ?? 0} Supplier</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500">
                Operator: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{user?.full_name || user?.username}</span>
              </div>
            </div>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-bold uppercase tracking-wider">AKSES CEPAT OPERASIONAL</span>
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {hasPermission('sales.view') && (
                <button
                  type="button"
                  onClick={() => navigate('/sales')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="size-4 text-neutral-500" />
                    <div>
                      <div className="text-xs font-semibold">Penjualan &amp; Konsinyasi</div>
                      <div className="text-[11px] text-neutral-400 font-mono">Scan Out, Pemakaian &amp; Pembayaran</div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400" />
                </button>
              )}

              {hasPermission('purchases.view') && (
                <button
                  type="button"
                  onClick={() => navigate('/purchases')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="size-4 text-neutral-500" />
                    <div>
                      <div className="text-xs font-semibold">Pembelian &amp; Scan In</div>
                      <div className="text-[11px] text-neutral-400 font-mono">PO Supplier, Batch ED &amp; Hutang (AP)</div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400" />
                </button>
              )}

              {hasPermission('inventory.view') && (
                <button
                  type="button"
                  onClick={() => navigate('/inventory')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Warehouse className="size-4 text-neutral-500" />
                    <div>
                      <div className="text-xs font-semibold">Inventory &amp; Monitoring ED</div>
                      <div className="text-[11px] text-neutral-400 font-mono">Stok per Batch, QR Unit &amp; Histori</div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400" />
                </button>
              )}

              {hasPermission('customers.view') && (
                <button
                  type="button"
                  onClick={() => navigate('/customers')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Users className="size-4 text-neutral-500" />
                    <div>
                      <div className="text-xs font-semibold">Master Pelanggan</div>
                      <div className="text-[11px] text-neutral-400 font-mono">{partners?.total_customers ?? 0} Dokter / Klinik / RS</div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400" />
                </button>
              )}

              {hasPermission('suppliers.view') && (
                <button
                  type="button"
                  onClick={() => navigate('/suppliers')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Truck className="size-4 text-neutral-500" />
                    <div>
                      <div className="text-xs font-semibold">Master Supplier</div>
                      <div className="text-[11px] text-neutral-400 font-mono">{partners?.total_suppliers ?? 0} Distributor Alkes</div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400" />
                </button>
              )}

              {hasPermission('products.view') && (
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Package className="size-4 text-neutral-500" />
                    <div>
                      <div className="text-xs font-semibold">Master Produk &amp; Variasi</div>
                      <div className="text-[11px] text-neutral-400 font-mono">{inv?.total_products ?? 0} Produk • {inv?.total_variants ?? 0} Variasi</div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
