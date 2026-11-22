import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { usersApi, rolesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, ArrowLeft, Save } from 'lucide-react';
import { setPageTitle } from '@/lib/page-title';

export default function UserEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    role_id: '',
    is_active: true,
  });

  useEffect(() => {
    setPageTitle('Edit User');
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [userRes, rolesRes] = await Promise.all([
        usersApi.getById(Number(id)),
        rolesApi.getAll(),
      ]);
      const user = userRes.data.data;
      setFormData({
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role_id: String(user.role_id),
        is_active: user.is_active,
      });
      setRoles(rolesRes.data.data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Gagal memuat data pengguna.",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await usersApi.update(Number(id), {
        full_name: formData.full_name,
        role_id: parseInt(formData.role_id),
        is_active: formData.is_active,
      });
      toast({
        variant: "success",
        title: "Sukses!",
        description: "Pengguna berhasil diperbarui.",
      });
      setTimeout(() => navigate('/users'), 500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.response?.data?.error || "Gagal memperbarui pengguna.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
        Memuat data pengguna...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      {/* ─── Satu Kontainer Card Utuh (Single Unified Card Container persis Jurnal) ──── */}
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        
        {/* 1. Header Bar: Icon-Only Back Button + Square Black Badge + Uppercase Title + Monospace Subtitle */}
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/users')}
              className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              title="Kembali ke Daftar Pengguna"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <User className="size-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                  Edit Pengguna: {formData.full_name}
                </h1>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Username Login: @{formData.username} • {formData.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit}>
          {/* 2. Shaded Parameter Strip */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Username (Readonly) */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Username Login (Tetap)
                </label>
                <Input
                  disabled
                  value={formData.username}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 shadow-none font-mono opacity-80"
                />
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="full_name"
                  required
                  placeholder="Masukkan nama lengkap"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none"
                  autoFocus
                />
              </div>

              {/* Email (Readonly) */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Alamat Email (Tetap)
                </label>
                <Input
                  disabled
                  value={formData.email}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 shadow-none font-mono opacity-80"
                />
              </div>

              {/* Peran / Role */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Peran / Role Pengguna <span className="text-rose-500">*</span>
                </label>
                <select
                  id="role_id"
                  required
                  value={formData.role_id}
                  onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                  className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 rounded-none shadow-none cursor-pointer"
                >
                  <option value="">Pilih role pengguna...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Akun Aktif Baris Penuh */}
            <div className="mt-3 flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-none p-3 bg-white dark:bg-neutral-900">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block uppercase tracking-wide">Status Otorisasi Akun</span>
                <p className="text-[11px] text-neutral-500 font-mono">
                  {formData.is_active ? 'Akun aktif dan diizinkan login ke dalam sistem aplikasi' : 'Akun nonaktif dan diblokir dari akses sistem'}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          {/* 3. Footer Submission Bar */}
          <div className="p-4 bg-white dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/users')}
              className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 shadow-none text-neutral-700 dark:text-neutral-300"
            >
              Batal
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3.5 gap-1.5 shadow-none"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span>Simpan Perubahan</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
