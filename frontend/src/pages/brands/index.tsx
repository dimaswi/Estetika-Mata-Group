import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { brandsApi, type Brand } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Award, Plus, RefreshCw } from "lucide-react";
import { createBrandColumns } from "./columns";
import { cn } from "@/lib/utils";
import { setPageTitle } from "@/lib/page-title";

export default function BrandsIndex() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle("Master Brand");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await brandsApi.getAll();
      setBrands(res.data?.data || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat data brand.") });
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
      await brandsApi.delete(deleteId);
      toast({ variant: "success", title: "Sukses!", description: "Brand berhasil dihapus." });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus brand.") });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const columns = useMemo(
    () =>
      createBrandColumns({
        onView: (id) => navigate(`/brands/${id}`),
        onEdit: (id) => navigate(`/brands/${id}/edit`),
        onDelete: (id) => {
          setDeleteId(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission("brands.view"),
        hasEditPermission: hasPermission("brands.update"),
        hasDeletePermission: hasPermission("brands.delete"),
      }),
    [hasPermission, navigate]
  );

  const filteredData = useMemo(() => {
    return brands.filter((b) => {
      if (statusFilter === "active") return b.is_active;
      if (statusFilter === "inactive") return !b.is_active;
      return true;
    });
  }, [brands, statusFilter]);

  const filterSlot = (
    <div>
      <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
        STATUS BRAND
      </label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs rounded-none cursor-pointer font-medium"
      >
        <option value="all">Semua Status</option>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
    </div>
  );

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
      {hasPermission("brands.create") && (
        <Button size="sm" onClick={() => navigate("/brands/create")} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3 gap-1.5 shadow-none">
          <Plus className="size-3.5" />
          <span>Tambah Brand</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={filteredData}
        cardTitle="MASTER BRAND / MERK"
        cardSubtitle="Data merk/prinsipal beserta pabrikan & negara asal"
        cardIcon={<Award className="size-4" />}
        searchPlaceholder="Cari brand berdasarkan kode, nama merk, atau pabrikan..."
        searchLabel="CARI BRAND"
        entityName="Brand"
        filterSlot={filterSlot}
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        hasActiveFilters={statusFilter !== "all"}
        onResetFilters={() => setStatusFilter("all")}
        onRowClick={(b) => navigate(`/brands/${b.id}`)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Brand"
        description="Brand yang masih digunakan oleh produk tidak dapat dihapus. Lanjutkan?"
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
      />
    </div>
  );
}
