import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi, rolesApi, type User, type Role } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Users, Plus, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createUserColumns } from './columns';
import { cn } from '@/lib/utils';
import { setPageTitle } from '@/lib/page-title';

export default function UsersPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Confirm delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  useEffect(() => {
    setPageTitle('Pengguna');
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.getAll(),
        rolesApi.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setUsers(usersRes.data?.data || []);
      setRoles(rolesRes.data?.data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error!',
        description: error instanceof Error ? error.message : 'Gagal memuat data pengguna.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReset = () => {
    setStatusFilter('all');
    setRoleFilter('all');
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await usersApi.delete(userToDelete);
      toast({
        variant: 'success',
        title: 'Sukses!',
        description: 'Pengguna berhasil dihapus.',
      });
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error!',
        description: error instanceof Error ? error.message : 'Gagal menghapus pengguna.',
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const columns = useMemo(
    () =>
      createUserColumns({
        onView: (id) => navigate(`/users/${id}`),
        onEdit: (id) => navigate(`/users/${id}/edit`),
        onDelete: (id) => {
          setUserToDelete(id);
          setDeleteDialogOpen(true);
        },
        hasViewPermission: hasPermission('users.view'),
        hasEditPermission: hasPermission('users.update'),
        hasDeletePermission: hasPermission('users.delete'),
      }),
    [hasPermission, navigate]
  );

  // Custom filter for status and role
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        if (u.is_active !== isActive) return false;
      }
      if (roleFilter !== 'all') {
        if (u.role?.name?.toLowerCase() !== roleFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [users, statusFilter, roleFilter]);

  const hasActiveFilters = statusFilter !== 'all' || roleFilter !== 'all';

  const filterSlot = (
    <>
      <div>
        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
          STATUS AKUN
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 rounded-none shadow-none outline-none cursor-pointer font-medium"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Tidak Aktif</option>
        </select>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
          ROLE / PERAN
        </label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 rounded-none shadow-none outline-none cursor-pointer font-medium"
        >
          <option value="all">Semua Role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    </>
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
      {hasPermission('users.create') && (
        <Button
          size="sm"
          onClick={() => navigate('/users/create')}
          className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3 gap-1.5 shadow-none"
        >
          <Plus className="size-3.5" />
          <span>Tambah Pengguna</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full">
      <DataTable
        columns={columns}
        data={filteredUsers}
        cardTitle="DAFTAR PENGGUNA SISTEM"
        cardSubtitle="Kredensial login username & penetapan wewenang"
        cardIcon={<Users className="size-4" />}
        searchPlaceholder="Cari pengguna berdasarkan username, nama lengkap, atau email..."
        searchLabel="CARI USERNAME / NAMA"
        entityName="Pengguna"
        filterSlot={filterSlot}
        toolbarActions={toolbarActions}
        loading={loading}
        onRefresh={loadData}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleReset}
        onRowClick={(user) => navigate(`/users/${user.id}`)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Hapus Pengguna"
        description="Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
      />
    </div>
  );
}
