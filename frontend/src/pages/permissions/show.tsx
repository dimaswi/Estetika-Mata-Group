import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { setPageTitle } from '@/lib/page-title';
import { Button } from '@/components/ui/button';
import { permissionsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  KeyRound,
  Layers
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

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

export default function PermissionShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [permission, setPermission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle('Detail Hak Akses');
    loadPermission();
  }, [id]);

  const loadPermission = async () => {
    try {
      const response = await permissionsApi.getById(Number(id));
      setPermission(response.data.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Gagal memuat data permission.",
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
      await permissionsApi.delete(parseInt(id!));
      toast({
        variant: "success",
        title: "Sukses!",
        description: "Permission berhasil dihapus.",
      });
      setTimeout(() => navigate('/permissions'), 500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.response?.data?.error || "Gagal menghapus permission.",
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
        Memuat detail permission...
      </div>
    );
  }

  if (!permission) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Permission tidak ditemukan</p>
        <p className="mt-1 text-xs text-neutral-500 font-mono">Data permission ini tidak tersedia atau sudah dihapus.</p>
        <Button onClick={() => navigate('/permissions')} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">
          Kembali ke Daftar Permission
        </Button>
      </div>
    );
  }

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
              onClick={() => navigate('/permissions')}
              className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              title="Kembali ke Daftar Permission"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <KeyRound className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white font-mono">
                    {permission.name}
                  </h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
                    ID #{permission.id}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 uppercase">
                    MODUL: {permission.module || 'UMUM'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  {permission.description || 'Definisi kunci otorisasi kontrol akses fitur'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar on Right */}
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission('permissions.update') && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none text-neutral-700 dark:text-neutral-300"
              >
                <Link to={`/permissions/${id}/edit`}>
                  <Edit3 className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Edit Permission</span>
                </Link>
              </Button>
            )}

            {hasPermission('permissions.delete') && (
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
                SYSTEM PERMISSION KEY:
              </span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100 font-bold">
                {permission.name}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                MODUL SISTEM:
              </span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                {permission.module || 'Umum'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                KATEGORI:
              </span>
              <span className="font-mono text-neutral-800 dark:text-neutral-200">
                {permission.category || '—'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                TANGGAL DIBUAT:
              </span>
              <span className="font-mono text-neutral-800 dark:text-neutral-200">
                {formatDateTime(permission.created_at)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 text-xs">
            <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block mb-0.5">
              Deskripsi Fitur / Kegunaan:
            </span>
            <p className="text-neutral-800 dark:text-neutral-200">
              {permission.description || 'Tidak ada deskripsi rinci untuk hak akses ini.'}
            </p>
          </div>
        </div>

        {/* 3. Subheader: Info Integrasi */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Layers className="size-3.5 text-neutral-600" />
              Informasi Pemanggilan Programatik
            </span>
            <p className="text-[11px] text-neutral-500 font-mono">
              Gunakan kunci permission ini pada middleware router backend maupun guard frontend
            </p>
          </div>
        </div>

        {/* 4. Code Sample Box */}
        <div className="p-4 bg-white dark:bg-neutral-950 space-y-3">
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-none p-3 bg-neutral-50/50 dark:bg-neutral-900/40">
            <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block mb-1">
              Contoh Pengecekan di Frontend (React):
            </span>
            <pre className="font-mono text-xs text-neutral-800 dark:text-neutral-200 overflow-x-auto bg-neutral-100 dark:bg-neutral-900 p-2 border border-neutral-200 dark:border-neutral-800">
              {`const { hasPermission } = usePermission();\nif (hasPermission('${permission.name}')) {\n  // Akses diizinkan\n}`}
            </pre>
          </div>
        </div>

        {/* 5. Footer Bar */}
        <div className="p-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/permissions')}
            className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 shadow-none text-neutral-700 dark:text-neutral-300"
          >
            Kembali ke Daftar Permission
          </Button>
          <div className="text-[11px] text-neutral-500 font-mono">
            Sistem Registry Hak Akses &amp; Otorisasi
          </div>
        </div>
      </div>

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
