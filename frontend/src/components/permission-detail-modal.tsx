import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface Permission {
  id: number;
  name: string;
  module: string;
  category: string;
  description: string;
  actions: string;
}

interface PermissionDetailModalProps {
  permission: Permission | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PermissionDetailModal({ permission, isOpen, onClose }: PermissionDetailModalProps) {
  if (!permission) return null;

  let actions: string[] = [];
  try {
    actions = JSON.parse(permission.actions || '[]');
  } catch {
    actions = [];
  }

  const actionLabels: Record<string, { label: string; description: string }> = {
    create: { label: 'Create', description: 'Dapat membuat data baru' },
    read: { label: 'Read', description: 'Dapat melihat/membaca data' },
    update: { label: 'Update', description: 'Dapat mengubah data yang ada' },
    delete: { label: 'Delete', description: 'Dapat menghapus data' },
    export: { label: 'Export', description: 'Dapat mengekspor data' },
    import: { label: 'Import', description: 'Dapat mengimpor data' },
    assign_permissions: { label: 'Assign Permissions', description: 'Dapat memberikan permission ke role' },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-none border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none">
        <DialogHeader className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Shield className="size-4 text-neutral-800 dark:text-neutral-200" />
            Detail Permission: <span className="font-mono text-xs">{permission.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Informasi lengkap tentang permission dan akses yang diberikan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          {/* Basic Info */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-neutral-200 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase">System Key</span>
                <p className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{permission.name}</p>
              </div>
              <div className="border border-neutral-200 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase">Modul</span>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">{permission.module}</p>
              </div>
              <div className="border border-neutral-200 dark:border-neutral-800 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/40 sm:col-span-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase">Kategori</span>
                <div className="mt-1">
                  <Badge variant="outline" className="text-[10px] rounded-none font-mono">{permission.category}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase">Deskripsi</span>
            <p className="text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/40">
              {permission.description || 'Tidak ada deskripsi tersedia'}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase">Aksi yang Diizinkan</span>
              <Badge variant="outline" className="text-[10px] font-mono rounded-none">{actions.length} aksi</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {actions.map((action) => {
                const actionInfo = actionLabels[action] || { 
                  label: action, 
                  description: 'Aksi khusus', 
                };
                return (
                  <div key={action} className="flex items-center gap-2 p-2 border border-neutral-200 dark:border-neutral-800 rounded-none bg-white dark:bg-neutral-900">
                    <Badge variant="outline" className="text-[10px] rounded-none font-mono uppercase">
                      {actionInfo.label}
                    </Badge>
                    <span className="text-[11px] text-neutral-500 truncate">{actionInfo.description}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Button onClick={onClose} variant="outline" size="sm" className="h-8 rounded-none text-xs">
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
