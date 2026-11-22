import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { categoriesApi, type Category } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FolderTree, Plus, RefreshCw } from "lucide-react";
import { createCategoryColumns } from "./columns";
import { cn } from "@/lib/utils";
import { setPageTitle } from "@/lib/page-title";

export default function CategoriesIndex() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle("Kategori Produk");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesApi.getAll();
      setCategories(res.data?.data || []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: getApiErrorMessage(err, "Gagal memuat data kategori."),
      });
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
      await categoriesApi.delete(deleteId);
      toast({ variant: "success", title: "Sukses!", description: "Kategori berhasil dihapus." });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus kategori.") });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const columns = useMemo(
    () =>
      createCategoryColumns({
        onView: (id) => navigate(`/categories/${id}`),
        onEdit: (id) => navigate(`/categories/${id}/edit`),
        onDelete: (id) => {
          setDeleteId(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission("categories.view"),
        hasEditPermission: hasPermission("categories.update"),
        hasDeletePermission: hasPermission("categories.delete"),
      }),
    [hasPermission, navigate]
  );

  const filteredData = useMemo(() => {
    return categories.filter((c) => {
      if (statusFilter === "active") return c.is_active;
      if (statusFilter === "inactive") return !c.is_active;
      return true;
    });
  }, [categories, statusFilter]);

  const filterSlot = (
    <div>
      <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
        STATUS KATEGORI
      </label>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 rounded-none shadow-none outline-none cursor-pointer font-medium"
      >
        <option value="all">Semua Status</option>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
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
        className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none text-neutral-700 dark:text-neutral-300"
        title="Muat Ulang Data"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
      {hasPermission("categories.create") && (
        <Button
          size="sm"
          onClick={() => navigate("/categories/create")}
          className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3 gap-1.5 shadow-none"
        >
          <Plus className="size-3.5" />
          <span>Tambah Kategori</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={filteredData}
        cardTitle="KATEGORI PRODUK"
        cardSubtitle="Pengelompokan utama produk"
        cardIcon={<FolderTree className="size-4" />}
        searchPlaceholder="Cari kategori berdasarkan kode atau nama..."
        searchLabel="CARI KATEGORI"
        entityName="Kategori"
        filterSlot={filterSlot}
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        hasActiveFilters={statusFilter !== "all"}
        onResetFilters={() => setStatusFilter("all")}
        onRowClick={(cat) => navigate(`/categories/${cat.id}`)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Kategori"
        description="Kategori yang masih memiliki produk tidak dapat dihapus. Lanjutkan?"
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
      />
    </div>
  );
}
