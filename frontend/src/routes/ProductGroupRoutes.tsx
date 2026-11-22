import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute as PermissionGuard } from '@/components/protected-route';
import { lazy } from 'react';

const ProductGroupsIndex = lazy(() => import('@/pages/product-groups/index'));
const ProductGroupShow = lazy(() => import('@/pages/product-groups/show'));
const ProductGroupCreate = lazy(() => import('@/pages/product-groups/create'));
const ProductGroupEdit = lazy(() => import('@/pages/product-groups/edit'));

export function ProductGroupRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProductGroupsIndex />} />
      <Route path="/create" element={<PermissionGuard permission="products.create"><ProductGroupCreate /></PermissionGuard>} />
      <Route path="/:id" element={<ProductGroupShow />} />
      <Route path="/:id/edit" element={<PermissionGuard permission="products.update"><ProductGroupEdit /></PermissionGuard>} />
    </Routes>
  );
}
