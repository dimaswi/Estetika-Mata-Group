import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute as PermissionGuard } from '@/components/protected-route';
import { lazy } from 'react';

const SuppliersIndex = lazy(() => import('@/pages/suppliers/index'));
const SupplierShow = lazy(() => import('@/pages/suppliers/show'));
const SupplierCreate = lazy(() => import('@/pages/suppliers/create'));
const SupplierEdit = lazy(() => import('@/pages/suppliers/edit'));

export function SupplierRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SuppliersIndex />} />
      <Route path="/create" element={<PermissionGuard permission="suppliers.create"><SupplierCreate /></PermissionGuard>} />
      <Route path="/:id" element={<SupplierShow />} />
      <Route path="/:id/edit" element={<PermissionGuard permission="suppliers.update"><SupplierEdit /></PermissionGuard>} />
    </Routes>
  );
}
