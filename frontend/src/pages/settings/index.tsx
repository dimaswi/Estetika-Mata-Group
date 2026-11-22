import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Upload, FileImage, SlidersHorizontal, RefreshCw } from "lucide-react";
import { settingsApi } from "@/lib/api";

const getBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  return apiUrl.replace(/\/api$/, '');
};
const BASE_URL = getBaseUrl();

export default function SettingsPage() {
  const { toast } = useToast();
  const [appName, setAppName] = useState("DimsKits");
  const [appSubtitle, setAppSubtitle] = useState("Dims Webs");
  const [appLogo, setAppLogo] = useState("");
  const [appFavicon, setAppFavicon] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [fetching, setFetching] = useState(true);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedAppName = localStorage.getItem("appName") || "DimsKits";
    document.title = `Settings - ${savedAppName}`;
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setFetching(true);
    try {
      const response = await settingsApi.getAll();
      const settings = response.data?.data || {};

      if (settings.app_name) {
        setAppName(settings.app_name);
        localStorage.setItem("appName", settings.app_name);
      }
      if (settings.app_subtitle) {
        setAppSubtitle(settings.app_subtitle);
        localStorage.setItem("appSubtitle", settings.app_subtitle);
      }
      if (settings.app_logo) {
        setAppLogo(settings.app_logo);
        localStorage.setItem("appLogo", settings.app_logo);
      }
      if (settings.app_favicon) {
        setAppFavicon(settings.app_favicon);
        localStorage.setItem("appFavicon", settings.app_favicon);
        updateFavicon(settings.app_favicon);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setFetching(false);
    }
  };

  const updateFavicon = (faviconUrl: string) => {
    const fullUrl = faviconUrl.startsWith('http') ? faviconUrl : `${BASE_URL}${faviconUrl}`;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = fullUrl;
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const response = await settingsApi.uploadLogo(file, 'logo');
      const url = response.data.url;
      setAppLogo(url);
      localStorage.setItem("appLogo", url);
      window.dispatchEvent(new Event("storage"));
      toast({
        variant: "success",
        title: "Sukses!",
        description: "Logo berhasil diupload.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Gagal mengupload logo.",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUploadFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFavicon(true);
    try {
      const response = await settingsApi.uploadLogo(file, 'favicon');
      const url = response.data.url;
      setAppFavicon(url);
      localStorage.setItem("appFavicon", url);
      updateFavicon(url);
      window.dispatchEvent(new Event("storage"));
      toast({
        variant: "success",
        title: "Sukses!",
        description: "Favicon berhasil diupload.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Gagal mengupload favicon.",
      });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSaveAppSettings = async () => {
    setLoading(true);
    try {
      await settingsApi.update({
        app_name: appName,
        app_subtitle: appSubtitle,
      });

      localStorage.setItem("appName", appName);
      localStorage.setItem("appSubtitle", appSubtitle);
      window.dispatchEvent(new Event("storage"));

      toast({
        variant: "success",
        title: "Sukses!",
        description: "Pengaturan aplikasi berhasil disimpan.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Gagal menyimpan pengaturan.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLogoPreviewUrl = () => {
    if (appLogo && !appLogo.includes('1.png')) {
      if (appLogo.startsWith('http://') || appLogo.startsWith('https://') || appLogo.startsWith('data:')) {
        return appLogo;
      }
      return `${BASE_URL}${appLogo}`;
    }
    return '/logo.png';
  };

  const getFaviconPreviewUrl = () => {
    if (appFavicon) {
      if (appFavicon.startsWith('http://') || appFavicon.startsWith('https://') || appFavicon.startsWith('data:')) {
        return appFavicon;
      }
      return `${BASE_URL}${appFavicon}`;
    }
    return '';
  };

  return (
    <div className="w-full max-w-full">
      {/* ─── Satu Kontainer Card Utuh (Single Unified Card Container persis Jurnal) ──── */}
      <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-950 overflow-hidden shadow-none">

        {/* 1. Header Bar: Black Badge + Uppercase Title + Monospace Subtitle */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shrink-0">
              <SlidersHorizontal className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-tight text-neutral-900 dark:text-white">
                PREFERENSI &amp; IDENTITAS SISTEM
              </h1>
              <p className="text-[11px] text-neutral-500 font-mono flex items-center gap-1.5">
                <span>Konfigurasi nama aplikasi, subteks sidebar, logo branding, dan favicon browser</span>
                {fetching && <RefreshCw className="size-3 animate-spin text-neutral-400 ml-1" />}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Shaded Parameter Strip: Identitas Aplikasi */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                Nama Aplikasi
              </label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="DimsKits"
                className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-medium"
              />
              <p className="text-[10px] text-neutral-500 font-mono mt-1">
                Tampil sebagai judul utama pada header sidebar dan tab browser
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
                Subteks Aplikasi
              </label>
              <Input
                value={appSubtitle}
                onChange={(e) => setAppSubtitle(e.target.value)}
                placeholder="Dims Webs"
                className="h-8 text-xs rounded-none border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none font-medium"
              />
              <p className="text-[10px] text-neutral-500 font-mono mt-1">
                Tampil tepat di bawah nama aplikasi pada header sidebar
              </p>
            </div>
          </div>
        </div>

        {/* 3. Subheader: Asset Visual & Branding */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              ASSET VISUAL &amp; LOGO BRANDING
            </span>
            <p className="text-[11px] text-neutral-500 font-mono">
              Kelola file visual logo sidebar dan favicon tab browser
            </p>
          </div>
        </div>

        {/* 4. Asset Upload Section */}
        <div className="p-4 bg-white dark:bg-neutral-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Logo Upload Box */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/40 dark:bg-neutral-900/40 rounded-none">
              <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                Logo Aplikasi (Sidebar Header)
              </span>
              <div className="flex items-center gap-3">
                <div className="size-14 border border-neutral-200 dark:border-neutral-700 rounded-none flex items-center justify-center bg-white dark:bg-neutral-900 p-1 shrink-0 overflow-hidden">
                  <img
                    src={getLogoPreviewUrl()}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="h-7 rounded-none border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium px-2.5 shadow-none gap-1.5 hover:bg-neutral-100"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Upload className="size-3" />
                    )}
                    <span>Pilih Logo Baru</span>
                  </Button>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    PNG, JPG, atau SVG. Maksimal 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Favicon Upload Box */}
            <div className="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/40 dark:bg-neutral-900/40 rounded-none">
              <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block mb-2">
                Favicon Browser (Tab Icon)
              </span>
              <div className="flex items-center gap-3">
                <div className="size-14 border border-neutral-200 dark:border-neutral-700 rounded-none flex items-center justify-center bg-white dark:bg-neutral-900 p-1 shrink-0 overflow-hidden">
                  {getFaviconPreviewUrl() ? (
                    <img
                      src={getFaviconPreviewUrl()}
                      alt="Favicon"
                      className="size-7 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <FileImage className="size-6 text-neutral-400" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/x-icon,image/png,image/svg+xml"
                    onChange={handleUploadFavicon}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingFavicon}
                    className="h-7 rounded-none border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium px-2.5 shadow-none gap-1.5 hover:bg-neutral-100"
                  >
                    {uploadingFavicon ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Upload className="size-3" />
                    )}
                    <span>Pilih Favicon</span>
                  </Button>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    ICO, PNG, atau SVG (Rekomendasi 32x32).
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 5. Footer Submission Bar */}
        <div className="p-4 bg-white dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-end gap-3 border-t border-neutral-200 dark:border-neutral-800">
          <Button
            type="button"
            onClick={handleSaveAppSettings}
            disabled={loading}
            className="h-8 rounded-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 text-xs px-3.5 gap-1.5 shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
