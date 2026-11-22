import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { rolesApi, type Role } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Shield, Plus, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createRoleColumns } from './columns';
import { cn } from '@/lib/utils';
import { setPageTitle } from '@/lib/page-title';

export default function RolesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  // Confirm delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle('Role & Hak Akses');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rolesApi.getAll();
      setRoles(res.data?.data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error!',
        description: error instanceof Error ? error.message : 'Gagal memuat data peran.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      await rolesApi.delete(roleToDelete);
      toast({
        variant: 'success',
        title: 'Sukses!',
        description: 'Peran berhasil dihapus.',
      });
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error!',
        description: error instanceof Error ? error.message : 'Gagal menghapus peran.',
      });
    } finally {
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const columns = useMemo(
    () =>
      createRoleColumns({
        onView: (id) => navigate(`/roles/${id}`),
        onEdit: (id) => navigate(`/roles/${id}/edit`),
        onDelete: (id) => {
          setRoleToDelete(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission('roles.view'),
        hasEditPermission: hasPermission('roles.update'),
        hasDeletePermission: hasPermission('roles.delete'),
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
      {hasPermission('roles.create') && (
        <Button
          size="sm"
          onClick={() => navigate('/roles/create')}
          className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3 gap-1.5 shadow-none"
        >
          <Plus className="size-3.5" />
          <span>Tambah Role</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={roles}
        cardTitle="PERAN SISTEM (ROLES)"
        cardSubtitle="Manajemen hak akses otorisasi & peran"
        cardIcon={<Shield className="size-4" />}
        searchPlaceholder="Cari role berdasarkan nama atau deskripsi..."
        searchLabel="CARI ROLE"
        entityName="Role"
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        onRowClick={(role) => navigate(`/roles/${role.id}`)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Role"
        description="Apakah Anda yakin ingin menghapus role ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
      />
    </div>
  );
}
