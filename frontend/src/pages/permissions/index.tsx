import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { permissionsApi, type Permission } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { KeyRound, Plus, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createPermissionColumns } from './columns';
import { cn } from '@/lib/utils';
import { setPageTitle } from '@/lib/page-title';

export default function PermissionsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  // Confirm delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle('Hak Akses (Permissions)');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await permissionsApi.getAll();
      setPermissions(res.data?.data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error!',
        description: error instanceof Error ? error.message : 'Gagal memuat data hak akses.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!permissionToDelete) return;
    try {
      await permissionsApi.delete(permissionToDelete);
      toast({
        variant: 'success',
        title: 'Sukses!',
        description: 'Hak akses berhasil dihapus.',
      });
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error!',
        description: error instanceof Error ? error.message : 'Gagal menghapus hak akses.',
      });
    } finally {
      setDeleteDialogOpen(false);
      setPermissionToDelete(null);
    }
  };

  const columns = useMemo(
    () =>
      createPermissionColumns({
        onView: (id) => navigate(`/permissions/${id}`),
        onEdit: (id) => navigate(`/permissions/${id}/edit`),
        onDelete: (id) => {
          setPermissionToDelete(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission('permissions.view'),
        hasEditPermission: hasPermission('permissions.update'),
        hasDeletePermission: hasPermission('permissions.delete'),
      }),
    [hasPermission, navigate]
  );

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={loadData}
        disabled={loading}
        className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        title="Muat Ulang Data"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </Button>
      {hasPermission('permissions.create') && (
        <Button
          size="sm"
          onClick={() => navigate('/permissions/create')}
          className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3 gap-1.5 shadow-none"
        >
          <Plus className="size-3.5" />
          <span>Tambah Permission</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={permissions}
        cardTitle="HAK AKSES (PERMISSIONS)"
        cardSubtitle="Rincian kode otorisasi & hak akses fitur sistem"
        cardIcon={<KeyRound className="size-4" />}
        searchPlaceholder="Cari permission atau deskripsi..."
        searchLabel="CARI KODE PERMISSION / DESKRIPSI"
        entityName="Hak Akses"
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        onRowClick={(perm) => navigate(`/permissions/${perm.id}`)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Permission"
        description="Apakah Anda yakin ingin menghapus permission ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
      />
    </div>
  );
}
