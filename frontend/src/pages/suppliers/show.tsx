import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { suppliersApi, type Supplier, type Purchase } from "@/lib/api";
import { formatIDR, formatDateID, getApiErrorMessage } from "@/lib/format";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ArrowLeft, Loader2, Edit3, Trash2, Truck, Eye } from "lucide-react";
import { setPageTitle } from "@/lib/page-title";

export default function SupplierShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [supplier, setSupplier] = useState<(Supplier & { purchases?: Purchase[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setPageTitle("Detail Supplier");
    suppliersApi
      .getById(Number(id))
      .then((res) => setSupplier(res.data.data))
      .catch((err) => toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal memuat detail supplier.") }))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      await suppliersApi.delete(Number(id));
      toast({ variant: "success", title: "Sukses!", description: "Supplier berhasil dihapus." });
      setTimeout(() => navigate("/suppliers"), 400);
    } catch (err) {
      toast({ variant: "destructive", title: "Error!", description: getApiErrorMessage(err, "Gagal menghapus supplier.") });
    }
  };

  if (loading) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center text-xs text-neutral-500 font-mono">
        <Loader2 className="size-4 animate-spin inline-block mr-2" /> Memuat detail supplier...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 p-8 text-center">
        <p className="text-sm font-semibold">Supplier tidak ditemukan</p>
        <Button onClick={() => navigate("/suppliers")} className="mt-4 rounded-none h-8 text-xs bg-neutral-900 text-white">Kembali</Button>
      </div>
    );
  }

  const purchases = supplier.purchases || [];

  return (
    <div className="w-full max-w-full">
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/suppliers")} className="h-8 w-8 p-0 rounded-none border border-neutral-200 dark:border-neutral-800 shadow-none">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
                <Truck className="size-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold uppercase tracking-tight">{supplier.name}</h1>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">{supplier.code}</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  PIC: {supplier.contact_person || "—"} • {supplier.phone || "—"} • {supplier.email || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission("suppliers.update") && (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 shadow-none">
                <Link to={`/suppliers/${id}/edit`}><Edit3 className="size-3.5 text-blue-600" /><span>Edit Supplier</span></Link>
              </Button>
            )}
            {hasPermission("suppliers.delete") && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="h-8 rounded-none border border-neutral-200 dark:border-neutral-800 text-xs px-3 gap-1.5 text-rose-600 shadow-none">
                <Trash2 className="size-3.5" /><span>Hapus</span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TERMIN DEFAULT:</span>
              <span className="font-mono font-bold">{supplier.default_term_days} Hari</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL PEMBELIAN:</span>
              <span className="font-mono font-bold">{formatIDR(supplier.total_purchases)}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">TOTAL DIBAYAR:</span>
              <span className="font-mono font-bold text-emerald-600">{formatIDR(supplier.total_paid)}</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">SISA HUTANG (AP):</span>
              <span className="font-mono font-bold text-amber-600">{formatIDR(supplier.outstanding_ap)}</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">
            Riwayat Transaksi Pembelian ({purchases.length})
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
                {purchases.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-xs text-neutral-500 font-mono">Belum ada transaksi pembelian.</TableCell></TableRow>
                ) : (
                  purchases.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/purchases/${p.id}`)}>
                      <TableCell className="font-mono text-xs font-bold">{p.invoice_number}</TableCell>
                      <TableCell className="text-xs">{formatDateID(p.purchase_date)}</TableCell>
                      <TableCell className="text-xs uppercase font-mono">{p.payment_type}</TableCell>
                      <TableCell className="text-xs font-mono font-bold">{formatIDR(p.total_amount)}</TableCell>
                      <TableCell><Badge variant={p.payment_status === "paid" ? "default" : "secondary"} className="rounded-none text-[10px] uppercase">{p.payment_status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-7 rounded-none" onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${p.id}`); }}>
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

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmDelete} title="Hapus Supplier" description="Yakin ingin menghapus supplier ini?" variant="destructive" />
    </div>
  );
}
