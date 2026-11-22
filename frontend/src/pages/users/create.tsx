import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usersApi, rolesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function UserCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
    role_id: "",
  });

  useEffect(() => {
    setPageTitle("Tambah Pengguna");
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await rolesApi.getAll();
      setRoles(response.data.data || []);
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role_id) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Silakan pilih role pengguna.",
      });
      return;
    }

    setLoading(true);

    try {
      await usersApi.create({
        ...formData,
        role_id: parseInt(formData.role_id, 10),
      });
      toast({
        variant: "success",
        title: "Sukses!",
        description: "Pengguna berhasil ditambahkan.",
      });
      setTimeout(() => navigate("/users"), 400);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error!",
        description:
          error instanceof Error ? error.message : "Gagal membuat pengguna.",
      });
    } finally {
      setLoading(false);
    }
  };

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
                  Tambah Pengguna Baru
                </h1>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Registrasi kredensial username login dan penetapan hak akses role
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
              {/* Username Login */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Username Login <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="username"
                  required
                  placeholder="Contoh: dimas.wisnu"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
                  autoFocus
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
                  placeholder="Contoh: Dimas Wisnu Wirawan"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Kata Sandi (Password) <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Minimal 6 karakter..."
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Alamat Email <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="dimas@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                Peran / Role Otoritas <span className="text-rose-500">*</span>
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
                <span>Simpan Pengguna</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
