import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { suppliersApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function SupplierEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    code: "",
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    npwp: "",
    default_term_days: "30",
    is_active: true,
  });

  useEffect(() => {
    setPageTitle("Edit Supplier");
    suppliersApi
      .getById(Number(id))
      .then((res) => {
        const s = res.data.data;
        setForm({
          code: s.code,
          name: s.name,
          contact_person: s.contact_person || "",
          phone: s.phone || "",
          email: s.email || "",
          address: s.address || "",
          npwp: s.npwp || "",
          default_term_days: String(s.default_term_days || 30),
          is_active: s.is_active,
        });
      })
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat supplier.") }))
      .finally(() => setFetching(false));
  }, [id, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await suppliersApi.update(Number(id), {
        ...form,
        default_term_days: Number(form.default_term_days || 30),
      });
      toast({ variant: "success", title: "Sukses!", description: "Supplier diperbarui." });
      setTimeout(() => navigate(`/suppliers/${id}`), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memperbarui supplier.") });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat data supplier...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/suppliers/${id}`)} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Truck className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Edit Supplier: {form.name}</h1>
              <p className="text-[11px] text-neutral-500 font-mono">Kode: {form.code} • ID #{id}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Kode Supplier *</label>
                <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Nama Supplier *</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Termin Default (Hari)</label>
                <Input type="number" value={form.default_term_days} onChange={(e) => setForm({ ...form, default_term_days: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">PIC / Kontak</label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">No. Telepon / WA</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">NPWP</label>
                <Input value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Alamat</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div className="flex items-center justify-between h-8 px-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">Aktif</span>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/suppliers/${id}`)} className="h-8 rounded-none text-xs px-3">Batal</Button>
            <Button type="submit" size="sm" disabled={loading} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3.5 gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Perubahan</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
