import { useEffect } from 'react';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import type { BreadcrumbItemType } from "@/components/breadcrumbs";

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItemType[];
}

export function AppLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
  useEffect(() => {
    const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
    if (lastBreadcrumb && typeof lastBreadcrumb.title === 'string') {
      document.title = `${lastBreadcrumb.title} - DimsKits`;
    }
  }, [breadcrumbs]);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="overflow-x-hidden flex flex-col min-h-screen bg-background">
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="mx-auto max-w-full w-full">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppLayout;
