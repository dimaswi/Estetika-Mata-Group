import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '@/lib/page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rolesApi, permissionsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, ArrowLeft, Save, KeyRound } from 'lucide-react';

export default function RoleCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, any[]>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: [] as number[],
  });

  useEffect(() => {
    setPageTitle('Tambah Role');
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await permissionsApi.getAll();
      const allPermissions = response.data.data || [];
      
      const grouped = allPermissions.reduce((acc: Record<string, any[]>, permission: any) => {
        const module = permission.module || 'Umum';
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(permission);
        return acc;
      }, {});
      
      setGroupedPermissions(grouped);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Gagal memuat daftar permission.",
      });
    } finally {
      setFetching(false);
    }
  };

  const handlePermissionToggle = (permId: number) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter(id => id !== permId)
        : [...prev.permission_ids, permId]
    }));
  };

  const toggleModule = (moduleName: string) => {
    const modulePermIds = (groupedPermissions[moduleName] || []).map(p => p.id);
    const allSelected = modulePermIds.every(id => formData.permission_ids.includes(id));

    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        permission_ids: prev.permission_ids.filter(id => !modulePermIds.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permission_ids: Array.from(new Set([...prev.permission_ids, ...modulePermIds]))
      }));
    }
  };

  const allIds = Object.values(groupedPermissions).flatMap(list => list.map(p => p.id));

  const selectAll = () => {
    setFormData(prev => ({ ...prev, permission_ids: allIds }));
  };

  const deselectAll = () => {
    setFormData(prev => ({ ...prev, permission_ids: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Nama role wajib diisi.",
      });
      return;
    }

    setLoading(true);
    try {
      await rolesApi.create({
        ...formData,
        name: formData.name.trim().toLowerCase().replace(/\s+/g, '_'),
      });
      toast({
        variant: "success",
        title: "Sukses!",
        description: "Role baru berhasil ditambahkan.",
      });
      setTimeout(() => navigate('/roles'), 500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: error.response?.data?.error || "Gagal membuat role.",
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
        <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/roles')}
              className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              title="Kembali ke Daftar Role"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <Shield className="size-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                  Tambah Role Baru
                </h1>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Definisi peran sistem dan matriks pembagian hak akses (permissions)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            {/* 2. Form Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Kode Role */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  System Code Role <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="name"
                  required
                  placeholder="Contoh: manager_keuangan"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-mono"
                  autoFocus
                />
                <p className="text-[10px] text-neutral-500 font-mono mt-1">Format kode: huruf kecil tanpa spasi (gunakan underscore)</p>
              </div>

              {/* Deskripsi Wewenang */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                  Deskripsi Peran &amp; Wewenang
                </label>
                <Input
                  id="description"
                  placeholder="Deskripsi tugas dan tanggung jawab peran..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none"
                />
              </div>
            </div>

            {/* 3. Subheader: Permissions Action Strip */}
            <div className="space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-neutral-600" />
                    Penetapan Hak Akses ({formData.permission_ids.length} Dipilih)
                  </span>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    Pilih izin akses fitur sistem yang diberikan kepada peran ini
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="h-7 text-xs rounded-none border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 shadow-none px-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    Pilih Semua ({allIds.length})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                    className="h-7 text-xs rounded-none border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 shadow-none px-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>

              {/* 4. Permissions Matrix Scroll Box (Bounded Height persis Go-Akuntansi) */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 border border-neutral-200 dark:border-neutral-800 p-3 rounded-none bg-neutral-50/20">
                {Object.entries(groupedPermissions).map(([module, permissions]) => {
                  const modulePermIds = permissions.map(p => p.id);
                  const allChecked = modulePermIds.every(id => formData.permission_ids.includes(id));
                  const selectedCount = permissions.filter(p => formData.permission_ids.includes(p.id)).length;

                  return (
                    <div key={module} className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-none p-2.5 space-y-2">
                      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                            Modul: {module}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500">
                            ({selectedCount}/{permissions.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleModule(module)}
                          className="text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white underline cursor-pointer"
                        >
                          {allChecked ? 'Batal Pilih Modul' : 'Pilih Semua Modul'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {permissions.map((p: any) => {
                          const isChecked = formData.permission_ids.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-start gap-2 p-2 border text-xs cursor-pointer rounded-none transition-colors ${
                                isChecked
                                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                  : 'bg-neutral-50/50 hover:bg-neutral-100/50 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handlePermissionToggle(p.id)}
                                className="mt-0.5 rounded-none cursor-pointer"
                              />
                              <div className="leading-tight min-w-0">
                                <div className="font-semibold text-xs truncate">
                                  {p.description || p.name}
                                </div>
                                <div className={`font-mono text-[10px] ${isChecked ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-500'}`}>
                                  {p.name}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. Footer Submission Bar */}
          <div className="px-4 py-3 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/roles')}
              className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 shadow-none text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Batal
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-4 gap-1.5 shadow-none"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Role</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
