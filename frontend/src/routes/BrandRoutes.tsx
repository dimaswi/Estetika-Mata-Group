import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute as PermissionGuard } from '@/components/protected-route';
import { lazy } from 'react';

const BrandsIndex = lazy(() => import('@/pages/brands/index'));
const BrandShow = lazy(() => import('@/pages/brands/show'));
const BrandCreate = lazy(() => import('@/pages/brands/create'));
const BrandEdit = lazy(() => import('@/pages/brands/edit'));

export function BrandRoutes() {
  return (
    <Routes>
      <Route path="/" element={<BrandsIndex />} />
      <Route path="/create" element={<PermissionGuard permission="brands.create"><BrandCreate /></PermissionGuard>} />
      <Route path="/:id" element={<BrandShow />} />
      <Route path="/:id/edit" element={<PermissionGuard permission="brands.update"><BrandEdit /></PermissionGuard>} />
    </Routes>
  );
}
