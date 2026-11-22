import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute as PermissionGuard } from '@/components/protected-route';
import { lazy } from 'react';

const CustomersIndex = lazy(() => import('@/pages/customers/index'));
const CustomerShow = lazy(() => import('@/pages/customers/show'));
const CustomerCreate = lazy(() => import('@/pages/customers/create'));
const CustomerEdit = lazy(() => import('@/pages/customers/edit'));

export function CustomerRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CustomersIndex />} />
      <Route path="/create" element={<PermissionGuard permission="customers.create"><CustomerCreate /></PermissionGuard>} />
      <Route path="/:id" element={<CustomerShow />} />
      <Route path="/:id/edit" element={<PermissionGuard permission="customers.update"><CustomerEdit /></PermissionGuard>} />
    </Routes>
  );
}
