import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute as PermissionGuard } from '@/components/protected-route';
import { lazy } from 'react';

const PurchasesIndex = lazy(() => import('@/pages/purchases/index'));
const PurchaseShow = lazy(() => import('@/pages/purchases/show'));
const PurchaseCreate = lazy(() => import('@/pages/purchases/create'));
const PurchaseEdit = lazy(() => import('@/pages/purchases/edit'));

export function PurchaseRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PurchasesIndex />} />
      <Route path="/create" element={<PermissionGuard permission="purchases.create"><PurchaseCreate /></PermissionGuard>} />
      <Route path="/:id" element={<PurchaseShow />} />
      <Route path="/:id/edit" element={<PermissionGuard permission="purchases.update"><PurchaseEdit /></PermissionGuard>} />
    </Routes>
  );
}
