import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  Shield,
  KeyRound,
  Settings,
  User,
  LogOut,
  ChevronDown,
  ChevronsUpDown,
  FolderTree,
  Award,
  Package,
  Boxes,
  Warehouse,
  Truck,
  ShoppingBag,
  Receipt,
  Globe,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { usePermission } from '@/hooks/usePermission';
import { getAppName, getAppSubtitle } from '@/lib/page-title';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface NavChildItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  permission?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChildItem[];
  permission?: string;
}

const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutGrid,
    permission: 'dashboard.view',
  },
  {
    title: 'Website & Katalog',
    href: '/catalog',
    icon: Globe,
  },
  {
    title: 'Pembelian & Penjualan',
    href: '/purchases',
    icon: ShoppingBag,
    children: [
      {
        title: 'Master Supplier',
        href: '/suppliers',
        permission: 'suppliers.view',
        icon: Truck,
      },
      {
        title: 'Master Pelanggan',
        href: '/customers',
        permission: 'customers.view',
        icon: Users,
      },
      {
        title: 'Pembelian',
        href: '/purchases',
        permission: 'purchases.view',
        icon: ShoppingBag,
      },
      {
        title: 'Penjualan',
        href: '/sales',
        permission: 'sales.view',
        icon: Receipt,
      },
    ],
  },
  {
    title: 'Katalog & Produk',
    href: '/products',
    icon: Package,
    children: [
      {
        title: 'Master Brand',
        href: '/brands',
        permission: 'brands.view',
        icon: Award,
      },
      {
        title: 'Kategori Produk',
        href: '/categories',
        permission: 'categories.view',
        icon: FolderTree,
      },
      {
        title: 'Master Produk',
        href: '/products',
        permission: 'products.view',
        icon: Package,
      },
      {
        title: 'Pengelompokan Produk',
        href: '/product-groups',
        permission: 'products.view',
        icon: Boxes,
      },
    ],
  },
  {
    title: 'Inventory & ED',
    href: '/inventory',
    icon: Warehouse,
    permission: 'inventory.view',
  },
  {
    title: 'User Management',
    href: '/users',
    icon: Users,
    permission: 'users.view',
    children: [
      {
        title: 'Users',
        href: '/users',
        permission: 'users.view',
        icon: User,
      },
      {
        title: 'Roles',
        href: '/roles',
        permission: 'roles.view',
        icon: Shield,
      },
      {
        title: 'Permissions',
        href: '/permissions',
        permission: 'permissions.view',
        icon: KeyRound,
      },
    ],
  },
];

const STORAGE_KEY = 'app_sidebar_open_menus';

function getStoredOpenMap(): Record<string, boolean> {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val) {
      return JSON.parse(val);
    }
  } catch {
    // fallback
  }
  return {
    'Pembelian & Penjualan': true,
    'Katalog & Produk': true,
    'User Management': true,
    'Pengaturan': true,
  };
}

export function AppSidebar() {
  const { user, logout } = useAuthStore();
  const { hasPermission } = usePermission();

  const [appName, setAppName] = useState(getAppName() || 'DimsKits');
  const [appSubtitle, setAppSubtitle] = useState(getAppSubtitle() || 'Dims Webs');
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    const stored = localStorage.getItem('appLogo');
    if (stored && !stored.includes('1.png')) {
      if (stored.startsWith('http://') || stored.startsWith('https://') || stored.startsWith('data:')) return stored;
      if (stored.startsWith('/uploads/')) return `http://localhost:8080${stored}`;
      return stored;
    }
    return '/logo.png';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setAppName(getAppName() || 'DimsKits');
      setAppSubtitle(getAppSubtitle() || 'Dims Webs');
      const stored = localStorage.getItem('appLogo');
      if (stored && !stored.includes('1.png')) {
        if (stored.startsWith('http://') || stored.startsWith('https://') || stored.startsWith('data:')) {
          setLogoSrc(stored);
        } else if (stored.startsWith('/uploads/')) {
          setLogoSrc(`http://localhost:8080${stored}`);
        } else {
          setLogoSrc(stored);
        }
      } else {
        setLogoSrc('/logo.png');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Filter items by user permission
  const items = useMemo<NavItem[]>(() => {
    const allowed = (perm?: string) => {
      if (!perm) return true;
      return hasPermission(perm);
    };

    return mainNavItems.reduce<NavItem[]>((acc, item) => {
      if (item.children && item.children.length > 0) {
        const filtered = item.children.filter((c) => allowed(c.permission));
        if (filtered.length > 0) acc.push({ ...item, children: filtered });
      } else if (allowed(item.permission)) {
        acc.push(item);
      }
      return acc;
    }, []);
  }, [hasPermission]);

  return (
    <Sidebar collapsible="icon">
      {/* ─── 1. Header Logo (Persis Go-Akuntansi: logo bundar + title + subtitle) ─── */}
      <SidebarHeader className="px-4 py-3 group-data-[collapsible=icon]:p-2">
        <Link to="/" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <img
            src={logoSrc}
            alt="Logo"
            className="size-9 object-contain rounded-full shrink-0 group-data-[collapsible=icon]:size-8"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo.png';
            }}
          />
          <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden min-w-0">
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white leading-tight truncate">
              {appName}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal leading-tight mt-0.5 truncate">
              {appSubtitle}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* ─── 2. Navigasi Menu (Persis Go-Akuntansi: NavMain) ─── */}
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>

      {/* ─── 3. Footer User Profile (Persis Go-Akuntansi) ─── */}
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="h-8 w-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-semibold text-xs shrink-0">
                    {user?.full_name?.slice(0, 2).toUpperCase() || 'AD'}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                      {user?.full_name || 'Administrator'}
                    </span>
                    <span className="truncate text-xs text-neutral-500 font-normal mt-0.5">
                      {user?.role?.name || user?.username || 'Administrator'}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-neutral-400 shrink-0 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <div className="h-8 w-8 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-semibold text-xs shrink-0">
                      {user?.full_name?.slice(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                      <span className="truncate font-semibold">{user?.full_name || 'Administrator'}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email || 'admin@kawandolan.com'}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil Akun</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Pengaturan</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/** NavMain persis seperti di Go-Akuntansi: src/components/nav-main.tsx */
function NavMain({ items = [] }: { items: NavItem[] }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const initial = getStoredOpenMap();
    items.forEach((item) => {
      if (item.children?.some((c) => currentPath === c.href || currentPath.startsWith(c.href + '/'))) {
        initial[item.title] = true;
      }
    });
    return initial;
  });

  useEffect(() => {
    items.forEach((item) => {
      if (item.children?.some((c) => currentPath === c.href || currentPath.startsWith(c.href + '/'))) {
        setOpenMap((prev) => {
          if (prev[item.title]) return prev;
          const next = { ...prev, [item.title]: true };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
    });
  }, [currentPath, items]);

  const toggleOpen = (title: string) => {
    setOpenMap((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const normalizedPath = currentPath.replace(/\/$/, '') || '/';

  const isRouteMatch = (href: string) => {
    const target = href.replace(/\/$/, '') || '/';
    return normalizedPath === target || normalizedPath.startsWith(target + '/');
  };

  const isParentActive = (item: NavItem) => {
    if (!item.children) {
      return isRouteMatch(item.href);
    }
    return item.children.some((c) => isRouteMatch(c.href));
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = !!openMap[item.title];
          const active = isParentActive(item);

          if (!hasChildren) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.title}
                  className="rounded-none data-[active=true]:bg-neutral-900 data-[active=true]:text-white dark:data-[active=true]:bg-white dark:data-[active=true]:text-neutral-900 data-[active=true]:font-semibold"
                >
                  <Link to={item.href}>
                    <Icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              open={isOpen}
              onOpenChange={() => toggleOpen(item.title)}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={active}
                    className="rounded-none data-[active=true]:bg-neutral-100 data-[active=true]:text-neutral-900 dark:data-[active=true]:bg-neutral-800/70 dark:data-[active=true]:text-white data-[active=true]:font-semibold"
                  >
                    <Icon />
                    <span>{item.title}</span>
                    <ChevronDown
                      className={`ml-auto size-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${isOpen ? 'rotate-180' : ''
                        }`}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.children?.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = isRouteMatch(child.href);
                      return (
                        <SidebarMenuSubItem key={child.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isChildActive}
                            className="rounded-none data-[active=true]:bg-neutral-900 data-[active=true]:text-white dark:data-[active=true]:bg-white dark:data-[active=true]:text-neutral-900 data-[active=true]:font-semibold"
                          >
                            <Link to={child.href}>
                              {ChildIcon && <ChildIcon className="size-4 shrink-0" />}
                              <span>{child.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export default AppSidebar;
