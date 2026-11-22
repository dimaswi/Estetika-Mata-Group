import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suppliersApi } from "@/lib/api";
import { generateAutoCode, getApiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function SupplierCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: generateAutoCode("SUP"),
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    npwp: "",
    default_term_days: "30",
  });

  useEffect(() => {
    setPageTitle("Tambah Supplier");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await suppliersApi.create({
        ...form,
        default_term_days: Number(form.default_term_days || 30),
      });
      toast({ variant: "success", title: "Sukses!", description: "Supplier berhasil ditambahkan." });
      setTimeout(() => navigate("/suppliers"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menambah supplier.") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/suppliers")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Truck className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Tambah Supplier Baru</h1>
              <p className="text-[11px] text-neutral-500 font-mono">Registrasi distributor alkes dan termin pembayaran default</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Kode Supplier *</label>
                <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SUP-001" className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" autoFocus />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Nama Supplier *</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="PT Distribusi Alkes Nusantara" className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
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

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Alamat Lengkap</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-950 flex justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/suppliers")} className="h-8 rounded-none text-xs px-3">Batal</Button>
            <Button type="submit" size="sm" disabled={loading} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3.5 gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Supplier</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
