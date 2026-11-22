import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute as PermissionGuard } from '@/components/protected-route';
import { lazy } from 'react';

const CategoriesIndex = lazy(() => import('@/pages/categories/index'));
const CategoryShow = lazy(() => import('@/pages/categories/show'));
const CategoryCreate = lazy(() => import('@/pages/categories/create'));
const CategoryEdit = lazy(() => import('@/pages/categories/edit'));

export function CategoryRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CategoriesIndex />} />
      <Route path="/create" element={<PermissionGuard permission="categories.create"><CategoryCreate /></PermissionGuard>} />
      <Route path="/:id" element={<CategoryShow />} />
      <Route path="/:id/edit" element={<PermissionGuard permission="categories.update"><CategoryEdit /></PermissionGuard>} />
    </Routes>
  );
}
