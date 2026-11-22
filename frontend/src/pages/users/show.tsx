import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { 
  ArrowLeft, 
  Loader2, 
  Edit3, 
  Trash2, 
  User, 
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { setPageTitle } from '@/lib/page-title';

function formatDateTime(dateValue?: string) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle('Detail Pengguna');
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const response = await usersApi.getById(Number(id));
      setUser(response.data.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Gagal memuat data pengguna.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteDialogOpen(false);
    try {
      await usersApi.delete(parseInt(id!));
      toast({
        variant: "success",
        title: "Sukses!",
        description: "Pengguna berhasil dihapus.",
      });
      setTimeout(() => navigate('/users'), 500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.response?.data?.error || "Gagal menghapus pengguna.",
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
        Memuat detail pengguna...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">User tidak ditemukan</p>
        <p className="mt-1 text-xs text-neutral-500 font-mono">Data pengguna tidak tersedia atau sudah dihapus.</p>
        <Button onClick={() => navigate('/users')} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">
          Kembali ke Daftar Pengguna
        </Button>
      </div>
    );
  }

  const permissions = user.role?.permissions || [];

  return (
    <div className="w-full max-w-full">
      {/* ─── Satu Kontainer Card Utuh (Single Unified Card Container persis Jurnal) ──── */}
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        
        {/* 1. Header Bar: Icon-Only Back Button + Square Black Badge + Uppercase Title + Monospace Subtitle + Action Toolbar */}
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/users')}
              className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              title="Kembali ke Daftar User"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <User className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                    {user.full_name}
                  </h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
                    ID #{user.id}
                  </span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 border inline-flex items-center gap-1 ${
                    user.is_active
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                  }`}>
                    {user.is_active ? (
                      <>
                        <CheckCircle2 className="size-3" />
                        ACTIVE
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3" />
                        INACTIVE
                      </>
                    )}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 uppercase">
                    {user.role?.name || 'TANPA ROLE'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  Username Login: @{user.username} • {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar on Right */}
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission('users.update') && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none text-neutral-700 dark:text-neutral-300"
              >
                <Link to={`/users/${id}/edit`}>
                  <Edit3 className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Edit User</span>
                </Link>
              </Button>
            )}

            {hasPermission('users.delete') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 shadow-none"
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                <span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        {/* 2. Metadata Parameter Strip (Shaded 4-col KPI) */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                USERNAME (LOGIN):
              </span>
              <span className="font-mono text-neutral-900 dark:text-white font-bold text-xs">
                @{user.username}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                ROLE / HAK AKSES:
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white uppercase">
                {user.role?.name || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                ALAMAT EMAIL:
              </span>
              <span className="font-mono text-neutral-800 dark:text-neutral-200">
                {user.email || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                TANGGAL DIBUAT:
              </span>
              <span className="font-mono text-neutral-800 dark:text-neutral-200">
                {formatDateTime(user.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Subheader: Permissions Matrix Inside Same Card */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              RINCIAN HAK AKSES (PERMISSIONS) DARI ROLE
            </span>
            <p className="text-[11px] text-neutral-500 font-mono">
              {permissions.length} Hak Akses Terdaftar
            </p>
          </div>
        </div>

        {/* 4. Table of Permissions */}
        <div className="overflow-x-auto">
          {permissions.length > 0 ? (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/80 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-left w-12">No</th>
                  <th className="py-2.5 px-3 text-left w-64">Kode Permission</th>
                  <th className="py-2.5 px-3 text-left">Deskripsi Fitur</th>
                  <th className="py-2.5 px-3 text-right w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {permissions.map((perm: any, idx: number) => (
                  <tr key={perm.id || idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                    <td className="py-2.5 px-3 font-mono text-neutral-500 text-center">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      <span className="px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        {perm.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                      {perm.description || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        GRANTED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-neutral-500 font-mono">
              Pengguna ini belum memiliki hak akses dari role terkait.
            </div>
          )}
        </div>

        {/* 5. Footer Bar */}
        <div className="p-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/users')}
            className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 shadow-none text-neutral-700 dark:text-neutral-300"
          >
            Kembali ke Daftar User
          </Button>
          <div className="text-[11px] text-neutral-500 font-mono">
            Sistem Manajemen Pengguna &amp; Akses
          </div>
        </div>
      </div>

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
