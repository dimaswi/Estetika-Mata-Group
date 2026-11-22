import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { salesApi, type Sale } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Receipt, Plus, RefreshCw } from "lucide-react";
import { createSaleColumns } from "./columns";
import { cn } from "@/lib/utils";
import { setPageTitle } from "@/lib/page-title";

export default function SalesIndex() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle("Transaksi Penjualan");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesApi.getAll();
      setSales(res.data?.data || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat data penjualan.") });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await salesApi.delete(deleteId);
      toast({ variant: "success", title: "Sukses!", description: "Transaksi penjualan dihapus." });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus penjualan.") });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const columns = useMemo(
    () =>
      createSaleColumns({
        onView: (id) => navigate(`/sales/${id}`),
        onEdit: (id) => navigate(`/sales/${id}/edit`),
        onDelete: (id) => {
          setDeleteId(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission("sales.view"),
        hasEditPermission: hasPermission("sales.update"),
        hasDeletePermission: hasPermission("sales.delete"),
      }),
    [hasPermission, navigate]
  );

  const filteredData = useMemo(() => {
    return sales.filter((s) => {
      if (paymentFilter !== "all" && s.payment_status !== paymentFilter) return false;
      if (deliveryFilter !== "all" && s.delivery_status !== deliveryFilter) return false;
      return true;
    });
  }, [sales, paymentFilter, deliveryFilter]);

  const filterSlot = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
          STATUS BAYAR
        </label>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none cursor-pointer font-medium"
        >
          <option value="all">Semua Status Bayar</option>
          <option value="waiting_usage">Menunggu Pemakaian</option>
          <option value="unpaid">Belum Bayar</option>
          <option value="partial">Sebagian</option>
          <option value="paid">Lunas</option>
          <option value="overdue">Jatuh Tempo</option>
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
          STATUS SCAN OUT
        </label>
        <select
          value={deliveryFilter}
          onChange={(e) => setDeliveryFilter(e.target.value)}
          className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none cursor-pointer font-medium"
        >
          <option value="all">Semua Status Scan Out</option>
          <option value="draft">Draft (Belum Scan Out)</option>
          <option value="partial_scanned">Sebagian Ter-Scan</option>
          <option value="completed">Selesai (Lengkap)</option>
        </select>
      </div>
    </div>
  );

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={loadData}
        disabled={loading}
        className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
      {hasPermission("sales.create") && (
        <Button
          size="sm"
          onClick={() => navigate("/sales/create")}
          className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3 gap-1.5 shadow-none"
        >
          <Plus className="size-3.5" />
          <span>Buat Penjualan</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={filteredData}
        cardTitle="TRANSAKSI PENJUALAN & SCAN OUT"
        cardSubtitle="Daftar invoice penjualan customer/RS, tracking piutang (AR), dan progres scan out barang keluar (FEFO)"
        cardIcon={<Receipt className="size-4" />}
        searchPlaceholder="Cari berdasarkan no. invoice, customer/RS, atau nama dokter..."
        searchLabel="CARI PENJUALAN"
        entityName="Penjualan"
        filterSlot={filterSlot}
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        hasActiveFilters={paymentFilter !== "all" || deliveryFilter !== "all"}
        onResetFilters={() => {
          setPaymentFilter("all");
          setDeliveryFilter("all");
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Transaksi Penjualan"
        description="Hanya invoice dengan status Draft (belum Scan Out) dan tanpa riwayat pembayaran yang dapat dihapus. Lanjutkan?"
        variant="destructive"
      />
    </div>
  );
}
