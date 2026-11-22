import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customersApi } from "@/lib/api";
import { generateAutoCode, getApiErrorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, ArrowLeft, Save } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function CustomerCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: generateAutoCode("CUST"),
    name: "",
    customer_type: "Guest",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    subdistrict: "",
    city: "",
    province: "",
    postal_code: "",
    default_term_days: "30",
  });

  useEffect(() => {
    setPageTitle("Tambah Pelanggan");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await customersApi.create({
        ...form,
        default_term_days: Number(form.default_term_days || 30),
      });
      toast({ variant: "success", title: "Sukses!", description: "Pelanggan berhasil ditambahkan." });
      setTimeout(() => navigate("/customers"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menambah pelanggan.") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/customers")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <Users className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight">Tambah Pelanggan Baru</h1>
              <p className="text-[11px] text-neutral-500 font-mono">Registrasi dokter, klinik, rumah sakit, atau pelanggan baru</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Kode Pelanggan *</label>
                <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CUST-001" className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" autoFocus />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Nama Pelanggan / Klinik / RS *</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="dr. ... / Klinik Mata / RS ..." className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Termin Default (Hari)</label>
                <Input type="number" value={form.default_term_days} onChange={(e) => setForm({ ...form, default_term_days: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Tipe Pelanggan</label>
                <Input value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })} placeholder="Dokter / Klinik / RS / Guest" className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
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
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="lg:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Alamat Lengkap</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Kecamatan</label>
                <Input value={form.subdistrict} onChange={(e) => setForm({ ...form, subdistrict: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Kota / Kabupaten</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Provinsi</label>
                <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1">Kode Pos</label>
                <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="h-8 text-xs rounded-none bg-white dark:bg-neutral-900 font-mono" />
              </div>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-neutral-950 flex justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/customers")} className="h-8 rounded-none text-xs px-3">Batal</Button>
            <Button type="submit" size="sm" disabled={loading} className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3.5 gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>Simpan Pelanggan</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
