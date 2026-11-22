import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute as PermissionGuard } from '@/components/protected-route';
import { lazy } from 'react';

const ProductsIndex = lazy(() => import('@/pages/products/index'));
const ProductShow = lazy(() => import('@/pages/products/show'));
const ProductCreate = lazy(() => import('@/pages/products/create'));
const ProductEdit = lazy(() => import('@/pages/products/edit'));
const VariantShow = lazy(() => import('@/pages/variants/show'));
const VariantCreate = lazy(() => import('@/pages/variants/create'));
const VariantEdit = lazy(() => import('@/pages/variants/edit'));

export function ProductRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProductsIndex />} />
      <Route path="/create" element={<PermissionGuard permission="products.create"><ProductCreate /></PermissionGuard>} />
      <Route path="/:id" element={<ProductShow />} />
      <Route path="/:id/edit" element={<PermissionGuard permission="products.update"><ProductEdit /></PermissionGuard>} />
      <Route path="/:productId/variants/create" element={<PermissionGuard permission="products.create"><VariantCreate /></PermissionGuard>} />
      <Route path="/:productId/variants/:id" element={<VariantShow />} />
      <Route path="/:productId/variants/:id/edit" element={<PermissionGuard permission="products.update"><VariantEdit /></PermissionGuard>} />
    </Routes>
  );
}
