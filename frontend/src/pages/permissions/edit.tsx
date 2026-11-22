import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { setPageTitle } from "@/lib/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { permissionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, ArrowLeft, Save } from "lucide-react";

export default function PermissionEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    module: "",
    category: "",
    description: "",
    action: "view",
  });

  const actionOptions = [
    { id: 'view', label: 'View (Melihat/Membaca Data)' },
    { id: 'create', label: 'Create (Membuat Data Baru)' },
    { id: 'update', label: 'Update (Mengubah Data)' },
    { id: 'delete', label: 'Delete (Menghapus Data)' },
    { id: 'assign', label: 'Assign (Memberikan Wewenang)' },
  ];

  useEffect(() => {
    setPageTitle("Edit Hak Akses");
    loadPermission();
  }, [id]);

  const loadPermission = async () => {
    try {
      const response = await permissionsApi.getById(Number(id));
      const permission = response.data.data;
      
      let action = "view";
      if (permission.actions) {
        try {
          const parsed = JSON.parse(permission.actions);
          action = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : permission.actions;
        } catch {
          action = permission.actions;
        }
      }

      setFormData({
        name: permission.name || "",
        module: permission.module || "",
        category: permission.category || "",
        description: permission.description || "",
        action: action,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Gagal memuat data permission.",
      });
      navigate("/permissions");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        actions: JSON.stringify([formData.action])
      };
      delete (submitData as any).action;

      await permissionsApi.update(Number(id), submitData);
      toast({
        variant: "success",
        title: "Sukses!",
        description: "Permission berhasil diperbarui.",
      });
      setTimeout(() => navigate(id ? `/permissions/${id}` : "/permissions"), 500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.response?.data?.error || "Gagal memperbarui permission.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2 text-neutral-400" />
        Memuat data permission...
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
              onClick={() => navigate(id ? `/permissions/${id}` : '/permissions')}
              className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              title="Kembali ke Detail Permission"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <KeyRound className="size-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white font-mono">
                  Edit Permission: {formData.name}
                </h1>
                <p className="text-[11px] text-neutral-500 font-mono">
                  ID #{id} • Pembaruan konfigurasi modul dan deskripsi hak akses
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
              {/* Nama Permission (Key) */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  System Permission Key <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="name"
                  required
                  placeholder="e.g., users.create"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
                  autoFocus
                />
              </div>

              {/* Modul Target */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Modul Sistem <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="module"
                  required
                  value={formData.module}
                  onChange={e => setFormData({ ...formData, module: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none"
                />
              </div>

              {/* Action Wewenang */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Jenis Tindakan (Action) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.action}
                  onChange={e => setFormData({ ...formData, action: e.target.value })}
                  className="h-8 w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-900 dark:text-neutral-100 rounded-none shadow-none cursor-pointer"
                >
                  {actionOptions.map(action => (
                    <option key={action.id} value={action.id}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Kategori & Deskripsi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Kategori Wewenang
                </label>
                <Input
                  id="category"
                  placeholder="Contoh: master_data / transactions"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Deskripsi Hak Akses
                </label>
                <Input
                  id="description"
                  placeholder="Jelaskan cakupan fitur yang dilindungi hak akses ini..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Footer Submission Bar */}
          <div className="p-4 bg-white dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(id ? `/permissions/${id}` : '/permissions')}
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
