import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customersApi, type Customer, type Sale } from "@/lib/api";
import { formatIDR, formatDateID, getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ArrowLeft, Loader2, Edit3, Trash2, Users, Eye } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function CustomerShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [customer, setCustomer] = useState<(Customer & { sales?: Sale[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle("Detail Pelanggan");
    customersApi
      .getById(Number(id))
      .then((res) => setCustomer(res.data.data))
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail pelanggan.") }))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await customersApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Pelanggan berhasil dihapus." });
      setTimeout(() => navigate("/customers"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus pelanggan.") });
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat detail pelanggan...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Pelanggan tidak ditemukan</p>
        <Button onClick={() => navigate("/customers")} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">Kembali</Button>
      </div>
    );
  }

  const sales = customer.sales || [];
  const fullAddress = [customer.address, customer.subdistrict, customer.city, customer.province, customer.postal_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="w-full max-w-full pb-8">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/customers")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <Users className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight">{customer.name}</h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">{customer.code}</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  {customer.phone || "—"} • {fullAddress || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission("customers.update") && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/customers/${id}/edit`}><Edit3 className="size-3.5 text-blue-600" /><span>Edit Pelanggan</span></Link>
              </Button>
            )}
            {hasPermission("customers.delete") && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 shadow-none">
                <Trash2 className="size-3.5" /><span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TERMIN DEFAULT:</span>
              <span className="font-mono font-bold">{customer.default_term_days} Hari</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL PENJUALAN:</span>
              <span className="font-mono font-bold">{formatIDR(customer.total_sales)}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL DIBAYAR:</span>
              <span className="font-mono font-bold text-emerald-600">{formatIDR(customer.total_paid)}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">SISA PIUTANG (AR):</span>
              <span className="font-mono font-bold text-amber-600">{formatIDR(customer.outstanding_ar)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">
            Riwayat Transaksi Penjualan ({sales.length})
          </h2>
          <div className="border border-neutral-200 dark:border-neutral-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 dark:bg-neutral-900/50">
                  <TableHead className="text-xs font-bold uppercase">No. Invoice</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Tanggal</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Metode</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Total</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Status Bayar</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-xs text-neutral-500 font-mono">Belum ada transaksi penjualan.</TableCell></TableRow>
                ) : (
                  sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs font-bold">{s.invoice_number}</TableCell>
                      <TableCell className="text-xs">{formatDateID(s.sale_date)}</TableCell>
                      <TableCell className="text-xs uppercase font-mono">{s.payment_type}</TableCell>
                      <TableCell className="text-xs font-mono font-bold">{formatIDR(s.total_amount)}</TableCell>
                      <TableCell><Badge variant={s.payment_status === "paid" ? "default" : "secondary"} className="rounded-none text-[10px] uppercase">{s.payment_status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-7 rounded-none" onClick={() => navigate(`/sales/${s.id}`)}>
                          <Eye className="size-3.5 text-blue-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Pelanggan" description="Yakin ingin menghapus pelanggan ini?" variant="destructive" />
    </div>
  );
}
