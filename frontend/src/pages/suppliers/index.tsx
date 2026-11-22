import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { suppliersApi, type Supplier } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Truck, Plus, RefreshCw } from "lucide-react";
import { createSupplierColumns } from "./columns";
import { cn } from "@/lib/utils";
import { setPageTitle } from "@/lib/page-title";

export default function SuppliersIndex() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle("Master Supplier");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.getAll();
      setSuppliers(res.data?.data || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat data supplier.") });
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
      await suppliersApi.delete(deleteId);
      toast({ variant: "success", title: "Sukses!", description: "Supplier dihapus." });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus supplier.") });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const columns = useMemo(
    () =>
      createSupplierColumns({
        onView: (id) => navigate(`/suppliers/${id}`),
        onEdit: (id) => navigate(`/suppliers/${id}/edit`),
        onDelete: (id) => {
          setDeleteId(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission("suppliers.view"),
        hasEditPermission: hasPermission("suppliers.update"),
        hasDeletePermission: hasPermission("suppliers.delete"),
      }),
    [hasPermission, navigate]
  );

  const filteredData = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter === "has_debt") return (s.outstanding_ap || 0) > 0;
      if (statusFilter === "active") return s.is_active;
      return true;
    });
  }, [suppliers, statusFilter]);

  const filterSlot = (
    <div>
      <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
        FILTER SUPPLIER
      </label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none cursor-pointer font-medium"
      >
        <option value="all">Semua Supplier</option>
        <option value="has_debt">Memiliki Hutang (AP)</option>
        <option value="active">Aktif</option>
      </select>
    </div>
  );

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
      {hasPermission("suppliers.create") && (
        <Button size="sm" onClick={() => navigate("/suppliers/create")} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3 gap-1.5 shadow-none">
          <Plus className="size-3.5" />
          <span>Tambah Supplier</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={filteredData}
        cardTitle="MASTER SUPPLIER "
        cardSubtitle="Data distributor/principal, termin pembayaran default, dan ringkasan hutang (AP)"
        cardIcon={<Truck className="size-4" />}
        searchPlaceholder="Cari supplier berdasarkan kode, nama, PIC, atau telepon..."
        searchLabel="CARI SUPPLIER"
        entityName="Supplier"
        filterSlot={filterSlot}
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        hasActiveFilters={statusFilter !== "all"}
        onResetFilters={() => setStatusFilter("all")}
        onRowClick={(s) => navigate(`/suppliers/${s.id}`)}
      />

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Supplier" description="Supplier yang sudah memiliki transaksi pembelian tidak dapat dihapus. Lanjutkan?" variant="destructive" />
    </div>
  );
}
