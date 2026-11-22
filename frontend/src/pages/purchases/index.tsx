import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { purchasesApi, type Purchase } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ShoppingBag, Plus, RefreshCw } from "lucide-react";
import { createPurchaseColumns } from "./columns";
import { cn } from "@/lib/utils";
import { setPageTitle } from "@/lib/page-title";

export default function PurchasesIndex() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [receiveFilter, setReceiveFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle("Pembelian & Hutang Supplier");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await purchasesApi.getAll();
      setPurchases(res.data?.data || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat data pembelian.") });
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
      await purchasesApi.delete(deleteId);
      toast({ variant: "success", title: "Sukses!", description: "Pembelian dihapus." });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus pembelian.") });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const columns = useMemo(
    () =>
      createPurchaseColumns({
        onView: (id) => navigate(`/purchases/${id}`),
        onEdit: (id) => navigate(`/purchases/${id}/edit`),
        onDelete: (id) => {
          setDeleteId(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission("purchases.view"),
        hasEditPermission: hasPermission("purchases.update"),
        hasDeletePermission: hasPermission("purchases.delete"),
      }),
    [hasPermission, navigate]
  );

  const filteredData = useMemo(() => {
    return purchases.filter((p) => {
      if (paymentFilter !== "all" && p.payment_status !== paymentFilter) return false;
      if (receiveFilter !== "all" && p.receive_status !== receiveFilter) return false;
      return true;
    });
  }, [purchases, paymentFilter, receiveFilter]);

  const filterSlot = (
    <>
      <div>
        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
          STATUS BAYAR
        </label>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none cursor-pointer font-medium">
          <option value="all">Semua Status Bayar</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
          STATUS SCAN IN
        </label>
        <select value={receiveFilter} onChange={(e) => setReceiveFilter(e.target.value)} className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none cursor-pointer font-medium">
          <option value="all">Semua Status Scan</option>
          <option value="draft">Draft (Belum Scan)</option>
          <option value="partial_scanned">Partial Scanned</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </>
  );

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
      {hasPermission("purchases.create") && (
        <Button size="sm" onClick={() => navigate("/purchases/create")} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3 gap-1.5 shadow-none">
          <Plus className="size-3.5" />
          <span>Buat Pembelian</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={filteredData}
        cardTitle="PEMBELIAN & HUTANG SUPPLIER (AP)"
        cardSubtitle="Transaksi pembelian Cash/Termin, pelunasan hutang, & tracking Scan In produk masuk"
        cardIcon={<ShoppingBag className="size-4" />}
        searchPlaceholder="Cari berdasarkan no. invoice atau nama supplier..."
        searchLabel="CARI PEMBELIAN"
        entityName="Pembelian"
        filterSlot={filterSlot}
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        hasActiveFilters={paymentFilter !== "all" || receiveFilter !== "all"}
        onResetFilters={() => {
          setPaymentFilter("all");
          setReceiveFilter("all");
        }}
        onRowClick={(p) => navigate(`/purchases/${p.id}`)}
      />

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Pembelian" description="Hanya draft pembelian yang belum di-scan masuk yang dapat dihapus. Lanjutkan?" variant="destructive" />
    </div>
  );
}
