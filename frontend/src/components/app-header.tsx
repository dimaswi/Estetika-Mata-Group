import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs, type BreadcrumbItemType } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Search } from 'lucide-react';

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbItemType[];
}

export function AppHeader({ breadcrumbs: propBreadcrumbs }: AppHeaderProps) {
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      return;
    }
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const computedBreadcrumbs = useMemo<BreadcrumbItemType[]>(() => {
    if (propBreadcrumbs && propBreadcrumbs.length > 0) {
      return propBreadcrumbs;
    }

    const path = location.pathname.replace(/\/$/, '');
    if (!path || path === '/' || path === '/dashboard') {
      return [{ title: 'Dashboard' }];
    }

    const segments = path.split('/').filter(Boolean);
    const crumbs: BreadcrumbItemType[] = [];

    if (segments[0] === 'users') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Users', href: segments.length > 1 ? '/users' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Tambah User' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit User' });
      else if (segments[1]) crumbs.push({ title: 'Detail User' });
    } else if (segments[0] === 'roles') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Roles', href: segments.length > 1 ? '/roles' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Tambah Role' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Role' });
      else if (segments[1]) crumbs.push({ title: 'Detail Role' });
    } else if (segments[0] === 'permissions') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Permissions', href: segments.length > 1 ? '/permissions' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Tambah Permission' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Permission' });
      else if (segments[1]) crumbs.push({ title: 'Detail Permission' });
    } else if (segments[0] === 'account') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Profil Akun' });
    } else if (segments[0] === 'settings') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Preferensi Sistem' });
    } else if (segments[0] === 'brands') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Master Brand', href: segments.length > 1 ? '/brands' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Tambah Brand' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Brand' });
      else if (segments[1]) crumbs.push({ title: 'Detail Brand' });
    } else if (segments[0] === 'categories') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Kategori Produk', href: segments.length > 1 ? '/categories' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Tambah Kategori' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Kategori' });
      else if (segments[1]) crumbs.push({ title: 'Detail Kategori' });
    } else if (segments[0] === 'products') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Master Produk', href: segments.length > 1 ? '/products' : undefined });
      if (segments[1] === 'create') {
        crumbs.push({ title: 'Tambah Produk' });
      } else if (segments[2] === 'edit') {
        crumbs.push({ title: 'Edit Produk' });
      } else if (segments[2] === 'variants') {
        crumbs.push({ title: 'Detail Produk', href: `/products/${segments[1]}` });
        if (segments[3] === 'create') crumbs.push({ title: 'Tambah Variasi' });
        else if (segments[4] === 'edit') crumbs.push({ title: 'Edit Variasi' });
        else if (segments[3]) crumbs.push({ title: 'Detail Variasi' });
      } else if (segments[1]) {
        crumbs.push({ title: 'Detail Produk' });
      }
    } else if (segments[0] === 'product-groups') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Pengelompokan Produk', href: segments.length > 1 ? '/product-groups' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Tambah Kelompok' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Kelompok' });
      else if (segments[1]) crumbs.push({ title: 'Detail Kelompok' });
    } else if (segments[0] === 'suppliers') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Supplier', href: segments.length > 1 ? '/suppliers' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Tambah Supplier' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Supplier' });
      else if (segments[1]) crumbs.push({ title: 'Detail Supplier' });
    } else if (segments[0] === 'customers') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Pelanggan', href: segments.length > 1 ? '/customers' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Tambah Pelanggan' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Pelanggan' });
      else if (segments[1]) crumbs.push({ title: 'Detail Pelanggan' });
    } else if (segments[0] === 'purchases') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Pembelian', href: segments.length > 1 ? '/purchases' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Buat Pembelian' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Pembelian' });
      else if (segments[1]) crumbs.push({ title: 'Detail Pembelian' });
    } else if (segments[0] === 'sales') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Penjualan', href: segments.length > 1 ? '/sales' : undefined });
      if (segments[1] === 'create') crumbs.push({ title: 'Buat Penjualan' });
      else if (segments[2] === 'edit') crumbs.push({ title: 'Edit Penjualan' });
      else if (segments[1]) crumbs.push({ title: 'Detail Penjualan' });
    } else if (segments[0] === 'inventory') {
      crumbs.push({ title: 'Dashboard', href: '/dashboard' });
      crumbs.push({ title: 'Inventory & ED' });
    } else {
      crumbs.push({
        title: segments[0].charAt(0).toUpperCase() + segments[0].slice(1),
      });
    }

    return crumbs;
  }, [location.pathname, propBreadcrumbs]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border/60 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 bg-background sticky top-0 z-40 select-none">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs breadcrumbs={computedBreadcrumbs} />
      </div>

      <div className="flex items-center gap-3">
        {/* Search input pill as seen in Go-Akuntansi */}
        <div className="relative hidden md:flex items-center">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari.."
            className="pl-8 pr-7 h-8 w-56 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900 text-xs text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white dark:focus:bg-neutral-950 transition-colors"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400 font-mono px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            /
          </kbd>
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="size-8 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}

export default AppHeader;
