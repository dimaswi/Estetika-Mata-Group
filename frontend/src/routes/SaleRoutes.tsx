import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute as PermissionGuard } from '@/components/protected-route';
import { lazy } from 'react';

const SalesIndex = lazy(() => import('@/pages/sales/index'));
const SaleShow = lazy(() => import('@/pages/sales/show'));
const SaleCreate = lazy(() => import('@/pages/sales/create'));
const SaleEdit = lazy(() => import('@/pages/sales/edit'));

export function SaleRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SalesIndex />} />
      <Route path="/create" element={<PermissionGuard permission="sales.create"><SaleCreate /></PermissionGuard>} />
      <Route path="/:id" element={<SaleShow />} />
      <Route path="/:id/edit" element={<PermissionGuard permission="sales.update"><SaleEdit /></PermissionGuard>} />
    </Routes>
  );
}
