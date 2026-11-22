import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { customersApi, type Customer } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Users, Plus, RefreshCw } from "lucide-react";
import { createCustomerColumns } from "./columns";
import { cn } from "@/lib/utils";
import { setPageTitle } from "@/lib/page-title";

export default function CustomersIndex() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle("Master Pelanggan");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersApi.getAll();
      setCustomers(res.data?.data || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat data pelanggan.") });
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
      await customersApi.delete(deleteId);
      toast({ variant: "success", title: "Sukses!", description: "Pelanggan dihapus." });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus pelanggan.") });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const columns = useMemo(
    () =>
      createCustomerColumns({
        onView: (id) => navigate(`/customers/${id}`),
        onEdit: (id) => navigate(`/customers/${id}/edit`),
        onDelete: (id) => {
          setDeleteId(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission("customers.view"),
        hasEditPermission: hasPermission("customers.update"),
        hasDeletePermission: hasPermission("customers.delete"),
      }),
    [hasPermission, navigate]
  );

  const filteredData = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === "has_debt") return (c.outstanding_ar || 0) > 0;
      if (statusFilter === "active") return c.is_active;
      return true;
    });
  }, [customers, statusFilter]);

  const filterSlot = (
    <div>
      <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
        FILTER PELANGGAN
      </label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none cursor-pointer font-medium"
      >
        <option value="all">Semua Pelanggan</option>
        <option value="has_debt">Memiliki Piutang (AR)</option>
        <option value="active">Aktif</option>
      </select>
    </div>
  );

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
      {hasPermission("customers.create") && (
        <Button size="sm" onClick={() => navigate("/customers/create")} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3 gap-1.5 shadow-none">
          <Plus className="size-3.5" />
          <span>Tambah Pelanggan</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={filteredData}
        cardTitle="MASTER PELANGGAN"
        cardSubtitle="Data dokter, klinik, rumah sakit, termin default, dan ringkasan piutang (AR)"
        cardIcon={<Users className="size-4" />}
        searchPlaceholder="Cari pelanggan berdasarkan kode, nama, telepon, atau kota..."
        searchLabel="CARI PELANGGAN"
        entityName="Pelanggan"
        filterSlot={filterSlot}
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        hasActiveFilters={statusFilter !== "all"}
        onResetFilters={() => setStatusFilter("all")}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Pelanggan"
        description="Pelanggan yang sudah memiliki transaksi penjualan tidak dapat dihapus. Lanjutkan?"
        variant="destructive"
      />
    </div>
  );
}
