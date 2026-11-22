import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { usersApi } from '@/lib/api';
import { User, Lock, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { setPageTitle } from '@/lib/page-title';

export default function AccountPage() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    setPageTitle('Profil Akun');
  }, []);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);

    try {
      const updateData = {
        full_name: formData.full_name,
        email: formData.email,
        username: user!.username,
        role_id: user!.role_id,
        is_active: user!.is_active,
      };

      await usersApi.update(user!.id, updateData);

      setUser({
        ...user!,
        full_name: formData.full_name,
        email: formData.email,
      });

      toast({
        variant: "success",
        title: "Sukses!",
        description: "Profil berhasil diperbarui.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.response?.data?.error || "Gagal memperbarui profil.",
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.new_password.length < 5) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Password baru minimal 5 karakter.",
      });
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Konfirmasi password baru tidak cocok.",
      });
      return;
    }

    setLoadingPassword(true);
    try {
      await usersApi.update(user!.id, {
        ...user,
        password: formData.new_password,
      });

      toast({
        variant: "success",
        title: "Sukses!",
        description: "Password berhasil diubah.",
      });

      setFormData((prev) => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.response?.data?.error || "Gagal mengubah password.",
      });
    } finally {
      setLoadingPassword(false);
    }
  };


  return (
    <div className="w-full max-w-full">
      {/* ─── Satu Kontainer Card Utuh (Single Unified Card Container persis Jurnal) ──── */}
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        
        {/* 1. Header Bar: Square Black Badge + Uppercase Title + Monospace Subtitle */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <User className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                PENGATURAN PROFIL AKUN &amp; KEAMANAN
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono">
                Informasi identitas akun pengguna, alamat email, dan pembaruan kata sandi
              </p>
            </div>
          </div>
        </div>

        {/* 2. Metadata Parameter Strip: Ringkasan Pengguna */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                NAMA LENGKAP:
              </span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {user?.full_name || 'Administrator'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                USERNAME:
              </span>
              <span className="font-mono text-neutral-800 dark:text-neutral-200 font-medium">
                @{user?.username || 'admin'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                PERAN / ROLE:
              </span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white uppercase">
                {user?.role?.name || 'Administrator'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                STATUS AKUN:
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* 3. Subheader: Form Ubah Profil */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              PERBARUI INFORMASI DASAR
            </span>
            <p className="text-[11px] text-neutral-500 font-mono">
              Ubah nama tampilan dan alamat email korespondensi
            </p>
          </div>
        </div>

        {/* 4. Form Profil Section */}
        <form onSubmit={handleUpdateProfile} className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Masukkan nama lengkap"
                required
                className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                Alamat Email <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contoh@domain.com"
                required
                className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              disabled={loadingProfile}
              className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3.5 gap-1.5 shadow-none"
            >
              {loadingProfile ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Simpan Profil</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* 5. Subheader: Form Ubah Password */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              GANTI KATA SANDI (PASSWORD)
            </span>
            <p className="text-[11px] text-neutral-500 font-mono">
              Pastikan kata sandi baru Anda minimal 5 karakter demi keamanan akun
            </p>
          </div>
        </div>

        {/* 6. Form Password Section */}
        <form onSubmit={handleChangePassword} className="p-4 bg-white dark:bg-neutral-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <Input
                type="password"
                required
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                placeholder="Minimal 5 karakter"
                className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <Input
                type="password"
                required
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                placeholder="Ulangi kata sandi baru"
                className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              disabled={loadingPassword}
              className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3.5 gap-1.5 shadow-none"
            >
              {loadingPassword ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Lock className="size-3.5" />
                  <span>Ubah Kata Sandi</span>
                </>
              )}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
