import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  publicCatalogApi,
  settingsApi,
  type PublicCatalogData,
  type PublicProductItem,
  type PublicVariantItem,
} from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatIDR } from '@/lib/format';
import { getAppName, getAppSubtitle, resolveBackendAssetUrl, setPageTitle } from '@/lib/page-title';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Award,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  Sparkles,
  Eye,
  Package,
  ChevronRight,
  SlidersHorizontal,
  MessageSquare,
  LayoutGrid,
  LogIn,
} from 'lucide-react';

const WHATSAPP_NUMBER = '6281234567890';

function resolveLogoUrl(rawLogo?: string | null): string {
  return resolveBackendAssetUrl(rawLogo, '/logo.png');
}

function buildWhatsAppUrl(product?: PublicProductItem, variant?: PublicVariantItem) {
  let text =
    'Halo Tim PT Estetika Mata Group, saya ingin berkonsultasi mengenai produk alat kesehatan mata & kemitraan.';
  if (product && variant) {
    const varLabel =
      !product.has_variants || variant.is_default ? '' : ` —Ukuran/Variasi ${variant.variant_name}`;
    text = `Halo Tim PT Estetika Mata Group, saya ingin menanyakan informasi & penawaran untuk produk *${product.name}${varLabel}* (Kode: ${variant.sku}).`;
  } else if (product) {
    text = `Halo Tim PT Estetika Mata Group, saya ingin menanyakan spesifikasi & penawaran untuk produk *${product.name}* (${product.sku_prefix}).`;
  }
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const [catalog, setCatalog] = useState<PublicCatalogData | null>(null);
  const [loading, setLoading] = useState(true);

  const [appName, setAppName] = useState(() => {
    const stored = getAppName();
    return stored && stored !== 'StarterKits' ? stored : 'PT Estetika Mata Group';
  });
  const [appSubtitle, setAppSubtitle] = useState(() => {
    const stored = getAppSubtitle();
    return stored && stored !== 'Hospital System' ? stored : 'Estetika Mata Group';
  });
  const [logoSrc, setLogoSrc] = useState<string>(() => resolveLogoUrl(localStorage.getItem('appLogo')));

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [onlyReadyStock, setOnlyReadyStock] = useState(false);

  // Product Detail Modal
  const [activeProduct, setActiveProduct] = useState<PublicProductItem | null>(null);
  const [variantSearch, setVariantSearch] = useState('');
  const [variantOnlyReady, setVariantOnlyReady] = useState(false);

  useEffect(() => {
    setPageTitle('Profil Perusahaan & Katalog Produk');

    settingsApi
      .getAll()
      .then((res) => {
        const s = res.data?.data;
        if (s) {
          if (s.app_name && s.app_name !== 'StarterKits') {
            setAppName(s.app_name);
            localStorage.setItem('appName', s.app_name);
          }
          if (s.app_subtitle && s.app_subtitle !== 'Hospital System') {
            setAppSubtitle(s.app_subtitle);
            localStorage.setItem('appSubtitle', s.app_subtitle);
          }
          const rawLogo = s.app_logo || s.logo_path || localStorage.getItem('appLogo');
          if (rawLogo) {
            setLogoSrc(resolveLogoUrl(rawLogo));
          }
        }
      })
      .catch(() => {});

    publicCatalogApi
      .getCatalog()
      .then((res) => setCatalog(res.data?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const products = catalog?.products || [];
  const categories = catalog?.categories || [];
  const brands = catalog?.brands || [];

  const brandNames = useMemo(() => {
    const set = new Set<string>();
    brands.forEach((b) => {
      if (b.name) set.add(b.name);
    });
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [brands, products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
      if (selectedBrand !== 'all' && (p.brand || '') !== selectedBrand) return false;
      if (onlyReadyStock && p.total_stock <= 0) return false;
      if (!q) return true;
      const inProduct =
        p.name.toLowerCase().includes(q) ||
        (p.alternative_name || '').toLowerCase().includes(q) ||
        p.sku_prefix.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category_name || '').toLowerCase().includes(q) ||
        (p.akl_number || '').toLowerCase().includes(q);
      if (inProduct) return true;
      return (p.variants || []).some(
        (v) => v.variant_name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, selectedBrand, onlyReadyStock, search]);

  const filteredModalVariants = useMemo(() => {
    if (!activeProduct) return [];
    const q = variantSearch.trim().toLowerCase();
    return (activeProduct.variants || []).filter((v) => {
      if (variantOnlyReady && v.stock_count <= 0) return false;
      if (!q) return true;
      return v.variant_name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q);
    });
  }, [activeProduct, variantSearch, variantOnlyReady]);

  const openProductModal = (prod: PublicProductItem) => {
    setActiveProduct(prod);
    setVariantSearch('');
    setVariantOnlyReady(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
      {/* Top Corporate Bar */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-block size-1.5 bg-emerald-600" />
            <span>PT ESTETIKA MATA GROUP — MITRA RESMI ALAT KESEHATAN MATA &amp; BEDAH OFTALMOLOGI</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <span>Standar Medis Kemenkes RI (AKL)</span>
            <span>•</span>
            <span>Jaringan Rumah Sakit &amp; Klinik Mata Nasional</span>
          </div>
        </div>
      </div>

      {/* Sticky Minimalist Header with System Logo */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt={appName}
              className="size-9 object-contain shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.png';
              }}
            />
            <div>
              <div className="text-sm font-bold tracking-tight uppercase leading-none">
                {appName === 'PT EMG' ? 'PT Estetika Mata Group' : appName}
              </div>
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mt-1">
                {appSubtitle} • Ophthalmic Healthcare
              </div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            <a href="#profil" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Tentang Kami
            </a>
            <a href="#layanan" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Keunggulan Medis
            </a>
            <a href="#katalog" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Display Produk
            </a>
            <a href="#kemitraan" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Kontak &amp; Kemitraan
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#katalog"
              className="hidden sm:inline-flex items-center h-9 px-3.5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Katalog Produk
            </a>
            {isAuthenticated ? (
              <Button asChild size="sm" className="h-9 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3.5 gap-1.5">
                <Link to="/dashboard">
                  <LayoutGrid className="size-3.5" />
                  <span>Dashboard</span>
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="h-9 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs px-3.5 gap-1.5">
                <Link to="/login">
                  <LogIn className="size-3.5" />
                  <span>Portal Internal</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section — Corporate Medical Identity */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800">
            {/* Left 7 Columns: Company Headline */}
            <div className="lg:col-span-7 py-12 sm:py-16 lg:py-20 lg:pr-12 flex flex-col justify-between space-y-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-[11px] font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <Sparkles className="size-3 text-neutral-900 dark:text-white" />
                  <span>DEDIKASI UNTUK KESEHATAN PENGLIHATAN INDONESIA</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-neutral-900 dark:text-white">
                  Inovasi Lensa Intraokular &amp; Solusi Medis Oftalmologi untuk Hasil Bedah Mata Terbaik.
                </h1>

                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                  <b>PT Estetika Mata Group</b> adalah perusahaan penyedia alat kesehatan mata dan lensa intraokular (IOL) yang berkomitmen mendukung dokter spesialis mata (Sp.M), rumah sakit, serta klinik utama mata melalui produk berstandar klinis tinggi, kejernihan optik presisi, dan layanan kemitraan profesional.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="#katalog"
                    className="inline-flex items-center gap-2 h-11 px-6 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold uppercase tracking-wider hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                  >
                    <span>Lihat Display Produk</span>
                    <ArrowUpRight className="size-4" />
                  </a>
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 h-11 px-5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-xs font-semibold uppercase tracking-wider hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Hubungi Tim Kami</span>
                  </a>
                </div>
              </div>

              {/* Corporate Key Figures */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-neutral-200 dark:border-neutral-800 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 dark:divide-neutral-800 bg-[#FAFAFA] dark:bg-neutral-900/40">
                <div className="p-3.5">
                  <div className="text-[10px] font-mono uppercase text-neutral-500">PORTOFOLIO PRODUK</div>
                  <div className="text-lg font-bold font-mono mt-0.5">{catalog?.stats.total_products ?? '—'} Lini</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Alkes &amp; Lensa Mata</div>
                </div>
                <div className="p-3.5">
                  <div className="text-[10px] font-mono uppercase text-neutral-500">RENTANG DIOPTRI</div>
                  <div className="text-lg font-bold font-mono mt-0.5">{catalog?.stats.total_variants ?? '—'} Ukuran</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Presisi Biometri</div>
                </div>
                <div className="p-3.5">
                  <div className="text-[10px] font-mono uppercase text-neutral-500">REGULASI MEDIS</div>
                  <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">AKL Resmi</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Kemenkes RI</div>
                </div>
                <div className="p-3.5">
                  <div className="text-[10px] font-mono uppercase text-neutral-500">CAKUPAN MITRA</div>
                  <div className="text-lg font-bold font-mono mt-0.5">Nasional</div>
                  <div className="text-[10px] text-neutral-400 font-mono">RS &amp; Klinik Mata</div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Ophthalmic Optical Profile Card */}
            <div className="lg:col-span-5 py-12 lg:py-20 lg:pl-12 flex flex-col justify-between bg-[#FAFAFA]/60 dark:bg-neutral-900/20">
              <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={logoSrc}
                      alt={appName}
                      className="size-7 object-contain shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        OPHTHALMIC OPTICAL TECHNOLOGY
                      </div>
                      <div className="text-xs font-bold uppercase tracking-tight">
                        Intraocular Lens (IOL) &amp; Surgical Care
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                    ISO 11979
                  </span>
                </div>

                {/* Minimalist Geometric SVG IOL Blueprint */}
                <div className="relative border border-neutral-200 dark:border-neutral-800 bg-[#FAFAFA] dark:bg-neutral-900/50 p-6 flex items-center justify-center overflow-hidden">
                  <svg
                    viewBox="0 0 360 220"
                    className="w-full max-w-[320px] h-auto text-neutral-900 dark:text-neutral-100"
                    fill="none"
                  >
                    <line x1="0" y1="110" x2="360" y2="110" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
                    <line x1="180" y1="0" x2="180" y2="220" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
                    <circle cx="180" cy="110" r="84" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2 4" />

                    {/* IOL C-Loop Haptics */}
                    <path
                      d="M 135 80 C 90 42, 48 68, 65 128 C 72 152, 95 165, 112 158"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 225 140 C 270 178, 312 152, 295 92 C 288 68, 265 55, 248 62"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />

                    {/* Outer Optic Body */}
                    <circle
                      cx="180"
                      cy="110"
                      r="52"
                      fill="currentColor"
                      fillOpacity="0.04"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    {/* Aspheric Inner Optic Ring */}
                    <circle
                      cx="180"
                      cy="110"
                      r="36"
                      stroke="currentColor"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                    <circle cx="180" cy="110" r="16" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
                    <circle cx="180" cy="110" r="2.5" fill="currentColor" />

                    <text x="12" y="22" fill="currentColor" fillOpacity="0.5" fontSize="8" fontFamily="monospace">
                      OPTIC ZONE Ø 6.00 MM
                    </text>
                    <text x="12" y="34" fill="currentColor" fillOpacity="0.5" fontSize="8" fontFamily="monospace">
                      OVERALL LENGTH 12.50 - 13.00 MM
                    </text>
                    <text x="230" y="204" fill="currentColor" fillOpacity="0.5" fontSize="8" fontFamily="monospace">
                      POWER +0.50D — +30.0D
                    </text>
                  </svg>
                </div>

                {/* Clinical Highlights inside Card */}
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 text-xs font-mono">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-neutral-500">Spesialisasi</span>
                    <span className="font-semibold">Bedah Katarak &amp; Implan IOL</span>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-neutral-500">Kualitas Optik</span>
                    <span className="font-semibold text-emerald-600">Biokompatibel &amp; Presisi Tinggi</span>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-neutral-500">Mitra Utama</span>
                    <span className="font-semibold">Rumah Sakit, Klinik Mata &amp; Dokter Sp.M</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Profile & 3 Corporate Pillars */}
      <section id="profil" className="border-b border-neutral-200 dark:border-neutral-800 py-14 sm:py-16 bg-[#FAFAFA] dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-7 space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                01 / PROFIL PERUSAHAAN — PT ESTETIKA MATA GROUP
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Mitra Terpercaya Tenaga Medis dalam Menghadirkan Kualitas Penglihatan Pasca-Operasi yang Optimal.
              </h2>
            </div>
            <div className="lg:col-span-5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Sebagai perusahaan yang berfokus pada bidang kesehatan mata (oftalmologi), PT Estetika Mata Group memahami bahwa keberhasilan rehabilitasi penglihatan pasien sangat ditentukan oleh kualitas implan lensa dan keandalan perlengkapan bedah yang digunakan dokter.
            </div>
          </div>

          <div id="layanan" className="grid grid-cols-1 md:grid-cols-3 border border-neutral-200 dark:border-neutral-800 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
            <div className="p-6 sm:p-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-neutral-400">01 / MUTU KLINIS</span>
                <Award className="size-4 text-neutral-900 dark:text-white" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-tight">
                Kualitas Optik &amp; Biokompatibilitas
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Setiap lini produk lensa intraokular (Foldable maupun PMMA) serta penunjang bedah mata dipilih dari prinsipal berstandar medis internasional untuk memastikan keamanan jangka panjang bagi pasien.
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-neutral-400">02 / SPEKTRUM PRODUK</span>
                <Layers className="size-4 text-neutral-900 dark:text-white" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-tight">
                Kelengkapan Rentang Ukuran Dioptri
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Menyediakan pilihan power dioptri secara lengkap mulai dari ukuran rendah hingga tinggi, sehingga dokter spesialis mata selalu mendapatkan ukuran lensa yang tepat sesuai hasil biometri pasien.
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-neutral-400">03 / DEDIKASI LAYANAN</span>
                <ShieldCheck className="size-4 text-neutral-900 dark:text-white" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-tight">
                Pendampingan Rumah Sakit &amp; Klinik Mata
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Melayani kebutuhan pengadaan rutin kamar operasi, penempatan produk di rumah sakit dan klinik mata, hingga dukungan suplai untuk kegiatan bakti sosial operasi katarak di berbagai wilayah.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Product Showcase / Display */}
      <section id="katalog" className="py-14 sm:py-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                02 / DISPLAY PRODUK PT ESTETIKA MATA GROUP
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Katalog Lensa Intraokular &amp; Alat Kesehatan Mata
              </h2>
              <p className="text-xs text-neutral-500">
                Jelajahi spesifikasi produk, pilihan variasi/dioptri, dan informasi ketersediaan untuk fasilitas kesehatan Anda
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
              <span>Menampilkan</span>
              <span className="px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white">
                {filteredProducts.length}
              </span>
              <span>dari {products.length} produk</span>
            </div>
          </div>

          {/* Search & Filter Control Bar */}
          <div className="border border-neutral-200 dark:border-neutral-800 bg-[#FAFAFA] dark:bg-neutral-900/40 p-4 space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama produk, lensa IOL, brand, atau ukuran dioptri (misal: 20.00 D)..."
                  className="h-9 pl-9 text-xs rounded-none bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full h-9 px-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs rounded-none"
                >
                  <option value="all">Semua Brand / Principal</option>
                  {brandNames.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyReadyStock((prev) => !prev)}
                  className={`flex-1 h-9 px-3 border text-xs font-mono font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    onlyReadyStock
                      ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900'
                      : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <SlidersHorizontal className="size-3.5" />
                  <span>{onlyReadyStock ? 'Filter: Tersedia' : 'Semua Ketersediaan'}</span>
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-xs font-mono border shrink-0 cursor-pointer transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 font-semibold'
                    : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                }`}
              >
                Semua Kategori ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter((p) => p.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 text-xs font-mono border shrink-0 cursor-pointer transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 font-semibold'
                        : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="border border-neutral-200 dark:border-neutral-800 p-6 h-72 animate-pulse bg-neutral-50 dark:bg-neutral-900/30" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="border border-neutral-200 dark:border-neutral-800 p-12 text-center space-y-3 bg-[#FAFAFA] dark:bg-neutral-900/20">
              <Package className="size-8 mx-auto text-neutral-400" />
              <div className="text-sm font-bold uppercase">Produk Tidak Ditemukan</div>
              <p className="text-xs text-neutral-500 font-mono">
                Coba gunakan kata kunci pencarian lain atau tampilkan semua kategori.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedBrand('all');
                  setOnlyReadyStock(false);
                }}
                className="rounded-none h-8 text-xs"
              >
                Reset Filter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((prod) => {
                const variants = prod.variants || [];
                const readyVariants = variants.filter((v) => v.stock_count > 0);
                const isStandalone = !prod.has_variants || (variants.length === 1 && variants[0].is_default);
                const previewVariants = variants.slice(0, 6);

                return (
                  <div
                    key={prod.id}
                    className="group border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-900 dark:hover:border-neutral-400 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top Metadata Bar */}
                      <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-[#FAFAFA] dark:bg-neutral-900/50 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 truncate">
                          {prod.category_name || 'Alkes Mata'}
                          {prod.brand ? ` • ${prod.brand}` : ''}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 border ${
                            prod.total_stock > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                              : 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
                          }`}
                        >
                          {prod.total_stock > 0 ? 'Tersedia' : 'Pre-Order'}
                        </span>
                      </div>

                      {/* Minimalist Visual Header */}
                      <div className="px-5 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-900 flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                              {prod.sku_prefix}
                            </span>
                            {prod.akl_number && (
                              <span className="font-mono text-[10px] text-neutral-400 truncate">
                                AKL {prod.akl_number}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white pt-1 group-hover:underline">
                            {prod.name}
                          </h3>
                          {prod.alternative_name && (
                            <p className="text-xs text-neutral-500 font-mono">{prod.alternative_name}</p>
                          )}
                        </div>

                        <div className="size-10 border border-neutral-200 dark:border-neutral-800 bg-[#FAFAFA] dark:bg-neutral-900 flex items-center justify-center shrink-0">
                          <Eye className="size-4 text-neutral-700 dark:text-neutral-300" />
                        </div>
                      </div>

                      {/* Description & Variant Pills */}
                      <div className="p-5 space-y-4">
                        {prod.description ? (
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                            {prod.description}
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-500 leading-relaxed">
                            {isStandalone
                              ? `Produk medis oftalmologi satuan (${prod.unit_name}) untuk kebutuhan fasilitas kesehatan mata.`
                              : `Tersedia dalam ${variants.length} pilihan ukuran variasi/dioptri untuk presisi tindakan medis.`}
                          </p>
                        )}

                        {!isStandalone && variants.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
                              <span>PILIHAN UKURAN / DIOPTRI ({variants.length})</span>
                              <span>{readyVariants.length} Ukuran Tersedia</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {previewVariants.map((v) => (
                                <span
                                  key={v.id}
                                  className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 border ${
                                    v.stock_count > 0
                                      ? 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-semibold'
                                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-neutral-400'
                                  }`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${
                                      v.stock_count > 0 ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
                                    }`}
                                  />
                                  {v.variant_name}
                                </span>
                              ))}
                              {variants.length > previewVariants.length && (
                                <span className="text-[10px] font-mono px-2 py-0.5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500">
                                  +{variants.length - previewVariants.length} ukuran lainnya
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-[#FAFAFA]/70 dark:bg-neutral-900/30 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-neutral-400">HARGAKATALOG</div>
                        <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                          {prod.min_price > 0
                            ? `${formatIDR(prod.min_price)} / ${prod.unit_name}`
                            : 'Hubungi Tim Kami'}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openProductModal(prod)}
                        className="h-8 rounded-none text-xs px-3 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 transition-colors gap-1"
                      >
                        <span>Lihat Spesifikasi</span>
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Medical Partnership & Contact Section */}
      <section id="kemitraan" className="py-14 sm:py-16 bg-[#FAFAFA] dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                03 / KEMITRAAN RUMAH SAKIT, KLINIK &amp; DOKTER SP.M
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Siap Mendukung Kebutuhan Layanan Bedah Mata di Institusi Kesehatan Anda.
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                PT Estetika Mata Group menjalin kerja sama jangka panjang dengan rumah sakit pemerintah maupun swasta, klinik utama mata, serta dokter spesialis mata di berbagai kota di Indonesia.
              </p>

              <div className="pt-2 space-y-2.5 text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Suplai rutin &amp; penempatan stok lensa intraokular (IOL) kamar operasi</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Konsultasi pemilihan spesifikasi produk sesuai kebutuhan klinis dokter</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Pengiriman terjaga &amp; respons cepat untuk seluruh wilayah layanan</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 sm:p-8 space-y-6">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 flex items-center gap-3">
                <img
                  src={logoSrc}
                  alt={appName}
                  className="size-9 object-contain shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                  }}
                />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                    KONTAK PERUSAHAAN
                  </div>
                  <h3 className="text-base font-bold uppercase tracking-tight">
                    Hubungi PT Estetika Mata Group
                  </h3>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <Building2 className="size-4 text-neutral-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">PT Estetika Mata Group</div>
                    <div className="text-neutral-500 font-mono mt-0.5">
                      Penyedia Alat Kesehatan Mata &amp; Lensa Intraokular (IOL)
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-neutral-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Jangkauan Layanan</div>
                    <div className="text-neutral-500 font-mono mt-0.5">
                      Jawa Timur, Jawa Tengah, Jawa Barat, Sumatera &amp; Seluruh Indonesia
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="size-4 text-neutral-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Layanan Informasi Produk &amp; Kemitraan</div>
                    <div className="text-neutral-500 font-mono mt-0.5">
                      Senin – Sabtu • Konsultasi Pengadaan RS &amp; Klinik Mata
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                >
                  <MessageSquare className="size-3.5" />
                  <span>Hubungi via WhatsApp</span>
                </a>
                <a
                  href="#katalog"
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 border border-neutral-200 dark:border-neutral-800 text-xs font-mono hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <span>Lihat Katalog Produk</span>
                  <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Company Logo */}
      <footer className="bg-white dark:bg-neutral-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div className="flex items-center gap-2.5">
            <img
              src={logoSrc}
              alt={appName}
              className="size-6 object-contain shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.png';
              }}
            />
            <span>&copy; {new Date().getFullYear()} PT Estetika Mata Group. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#profil" className="hover:text-neutral-900 dark:hover:text-white">Tentang Kami</a>
            <a href="#katalog" className="hover:text-neutral-900 dark:hover:text-white">Display Produk</a>
            <a href="#kemitraan" className="hover:text-neutral-900 dark:hover:text-white">Kontak</a>
          </div>
        </div>
      </footer>

      {/* Product Specification & Variant Modal */}
      <Dialog open={!!activeProduct} onOpenChange={(open) => !open && setActiveProduct(null)}>
        <DialogContent className="rounded-none max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden">
          {activeProduct && (
            <>
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-12">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                      {activeProduct.sku_prefix}
                    </span>
                    <span className="text-[11px] font-mono uppercase text-neutral-500">
                      {activeProduct.category_name || 'Alkes Mata'}
                      {activeProduct.brand ? ` • ${activeProduct.brand}` : ''}
                    </span>
                    {activeProduct.akl_number && (
                      <Badge variant="outline" className="rounded-none text-[10px] font-mono">
                        AKL: {activeProduct.akl_number}
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-base font-bold uppercase tracking-tight mt-1">
                    {activeProduct.name}
                  </DialogTitle>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="text-[10px] font-mono uppercase text-neutral-400">STATUS KETERSEDIAAN</div>
                  <div className="text-xs font-mono font-bold text-emerald-600">
                    {activeProduct.total_stock > 0 ? 'Tersedia untuk Pengadaan' : 'Pre-Order / Hubungi Kami'}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 bg-white dark:bg-neutral-950">
                {activeProduct.description && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed border-b border-neutral-100 dark:border-neutral-900 pb-3">
                    {activeProduct.description}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <Input
                      value={variantSearch}
                      onChange={(e) => setVariantSearch(e.target.value)}
                      placeholder="Cari ukuran variasi / dioptri (misal: 18.00 D, 21.50 D) atau kode..."
                      className="h-8 pl-8 text-xs rounded-none font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setVariantOnlyReady((v) => !v)}
                    className={`h-8 px-3 border text-xs font-mono cursor-pointer transition-colors ${
                      variantOnlyReady
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900'
                        : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600'
                    }`}
                  >
                    {variantOnlyReady ? 'Hanya Ukuran Tersedia' : 'Semua Ukuran / Variasi'}
                  </button>
                </div>

                <div className="border border-neutral-200 dark:border-neutral-800 max-h-[340px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-mono uppercase text-neutral-500">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Kode Produk</th>
                        <th className="px-4 py-2.5 text-left">Ukuran Variasi / Dioptri</th>
                        <th className="px-4 py-2.5 text-right">Harga / {activeProduct.unit_name}</th>
                        <th className="px-4 py-2.5 text-center">Ketersediaan</th>
                        <th className="px-4 py-2.5 text-right">Konsultasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {filteredModalVariants.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center font-mono text-neutral-400">
                            Tidak ada ukuran/variasi yang sesuai pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredModalVariants.map((v) => (
                          <tr key={v.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40">
                            <td className="px-4 py-2.5 font-mono text-neutral-600 dark:text-neutral-400">{v.sku}</td>
                            <td className="px-4 py-2.5 font-semibold text-neutral-900 dark:text-white">
                              {!activeProduct.has_variants || v.is_default ? activeProduct.name : v.variant_name}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold">
                              {v.sell_price > 0 ? formatIDR(v.sell_price) : 'Hubungi Kami'}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`inline-block text-[10px] font-mono font-semibold px-2 py-0.5 border ${
                                  v.stock_count > 0
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                                    : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
                                }`}
                              >
                                {v.stock_count > 0 ? 'Tersedia' : 'Indent / Pre-Order'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <a
                                href={buildWhatsAppUrl(activeProduct, v)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 transition-colors"
                              >
                                <span>Tanya</span>
                                <ArrowUpRight className="size-3" />
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-mono text-neutral-500">
                  Menampilkan <b>{filteredModalVariants.length}</b> dari {activeProduct.variants?.length || 0} pilihan ukuran
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setActiveProduct(null)} className="h-9 rounded-none px-4 text-xs">
                    Tutup
                  </Button>
                  <a
                    href={buildWhatsAppUrl(activeProduct)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>Hubungi Tim Pemasaran</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
