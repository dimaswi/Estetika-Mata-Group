import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute as PermissionGuard } from './components/protected-route';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';
import { updateFavicon } from '@/lib/page-title';

// Lazy load pages
const LandingPage = lazy(() => import('./pages/public/landing'));
const LoginPage = lazy(() => import('./pages/auth/login'));
const DashboardPage = lazy(() => import('./pages/dashboard/index'));
const AccountPage = lazy(() => import('./pages/account/index'));
const SettingsPage = lazy(() => import('./pages/settings/index'));

// Users
const UsersIndex = lazy(() => import('./pages/users/index'));
const UsersCreate = lazy(() => import('./pages/users/create'));
const UsersEdit = lazy(() => import('./pages/users/edit'));
const UsersShow = lazy(() => import('./pages/users/show'));

// Roles
const RolesIndex = lazy(() => import('./pages/roles/index'));
const RolesCreate = lazy(() => import('./pages/roles/create'));
const RolesEdit = lazy(() => import('./pages/roles/edit'));
const RolesShow = lazy(() => import('./pages/roles/show'));

// Permissions
const PermissionsIndex = lazy(() => import('./pages/permissions/index'));
const PermissionsCreate = lazy(() => import('./pages/permissions/create'));
const PermissionsEdit = lazy(() => import('./pages/permissions/edit'));
const PermissionsShow = lazy(() => import('./pages/permissions/show'));

// Fase 1: Katalog, Inventory, Supplier & Pembelian
const BrandsIndex = lazy(() => import('./pages/brands/index'));
const BrandsCreate = lazy(() => import('./pages/brands/create'));
const BrandsEdit = lazy(() => import('./pages/brands/edit'));
const BrandsShow = lazy(() => import('./pages/brands/show'));

const CategoriesIndex = lazy(() => import('./pages/categories/index'));
const CategoriesCreate = lazy(() => import('./pages/categories/create'));
const CategoriesEdit = lazy(() => import('./pages/categories/edit'));
const CategoriesShow = lazy(() => import('./pages/categories/show'));

const ProductsIndex = lazy(() => import('./pages/products/index'));
const ProductsCreate = lazy(() => import('./pages/products/create'));
const ProductsEdit = lazy(() => import('./pages/products/edit'));
const ProductsShow = lazy(() => import('./pages/products/show'));

const VariantsCreate = lazy(() => import('./pages/variants/create'));
const VariantsEdit = lazy(() => import('./pages/variants/edit'));
const VariantsShow = lazy(() => import('./pages/variants/show'));

const ProductGroupsIndex = lazy(() => import('./pages/product-groups/index'));
const ProductGroupsCreate = lazy(() => import('./pages/product-groups/create'));
const ProductGroupsEdit = lazy(() => import('./pages/product-groups/edit'));
const ProductGroupsShow = lazy(() => import('./pages/product-groups/show'));

const InventoryPage = lazy(() => import('./pages/inventory/index'));

const SuppliersIndex = lazy(() => import('./pages/suppliers/index'));
const SuppliersCreate = lazy(() => import('./pages/suppliers/create'));
const SuppliersEdit = lazy(() => import('./pages/suppliers/edit'));
const SuppliersShow = lazy(() => import('./pages/suppliers/show'));

const CustomersIndex = lazy(() => import('./pages/customers/index'));
const CustomersCreate = lazy(() => import('./pages/customers/create'));
const CustomersEdit = lazy(() => import('./pages/customers/edit'));
const CustomersShow = lazy(() => import('./pages/customers/show'));

const PurchasesIndex = lazy(() => import('./pages/purchases/index'));
const PurchasesCreate = lazy(() => import('./pages/purchases/create'));
const PurchasesEdit = lazy(() => import('./pages/purchases/edit'));
const PurchasesShow = lazy(() => import('./pages/purchases/show'));
const SalesIndex = lazy(() => import('./pages/sales/index'));
const SalesCreate = lazy(() => import('./pages/sales/create'));
const SalesEdit = lazy(() => import('./pages/sales/edit'));
const SalesShow = lazy(() => import('./pages/sales/show'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function App() {
  // Load theme and favicon on app start
  useEffect(() => {
    updateFavicon();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/catalog" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          
          {/* Users */}
          <Route path="/users" element={<ProtectedRoute><UsersIndex /></ProtectedRoute>} />
          <Route path="/users/create" element={
            <ProtectedRoute>
              <PermissionGuard permission="users.create">
                <UsersCreate />
              </PermissionGuard>
            </ProtectedRoute>
          } />
          <Route path="/users/:id" element={<ProtectedRoute><UsersShow /></ProtectedRoute>} />
          <Route path="/users/:id/edit" element={
            <ProtectedRoute>
              <PermissionGuard permission="users.update">
                <UsersEdit />
              </PermissionGuard>
            </ProtectedRoute>
          } />
          
          {/* Roles */}
          <Route path="/roles" element={<ProtectedRoute><RolesIndex /></ProtectedRoute>} />
          <Route path="/roles/create" element={
            <ProtectedRoute>
              <PermissionGuard permission="roles.create">
                <RolesCreate />
              </PermissionGuard>
            </ProtectedRoute>
          } />
          <Route path="/roles/:id" element={<ProtectedRoute><RolesShow /></ProtectedRoute>} />
          <Route path="/roles/:id/edit" element={
            <ProtectedRoute>
              <PermissionGuard permission="roles.update">
                <RolesEdit />
              </PermissionGuard>
            </ProtectedRoute>
          } />
          
          {/* Permissions */}
          <Route path="/permissions" element={<ProtectedRoute><PermissionsIndex /></ProtectedRoute>} />
          <Route path="/permissions/create" element={
            <ProtectedRoute>
              <PermissionGuard permission="permissions.create">
                <PermissionsCreate />
              </PermissionGuard>
            </ProtectedRoute>
          } />
          <Route path="/permissions/:id" element={<ProtectedRoute><PermissionsShow /></ProtectedRoute>} />
          <Route path="/permissions/:id/edit" element={
            <ProtectedRoute>
              <PermissionGuard permission="permissions.update">
                <PermissionsEdit />
              </PermissionGuard>
            </ProtectedRoute>
          } />

          {/* Fase 1: Brands */}
          <Route path="/brands" element={<ProtectedRoute><PermissionGuard permission="brands.view"><BrandsIndex /></PermissionGuard></ProtectedRoute>} />
          <Route path="/brands/create" element={<ProtectedRoute><PermissionGuard permission="brands.create"><BrandsCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/brands/:id" element={<ProtectedRoute><PermissionGuard permission="brands.view"><BrandsShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/brands/:id/edit" element={<ProtectedRoute><PermissionGuard permission="brands.update"><BrandsEdit /></PermissionGuard></ProtectedRoute>} />

          {/* Fase 1: Categories */}
          <Route path="/categories" element={<ProtectedRoute><PermissionGuard permission="categories.view"><CategoriesIndex /></PermissionGuard></ProtectedRoute>} />
          <Route path="/categories/create" element={<ProtectedRoute><PermissionGuard permission="categories.create"><CategoriesCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/categories/:id" element={<ProtectedRoute><PermissionGuard permission="categories.view"><CategoriesShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/categories/:id/edit" element={<ProtectedRoute><PermissionGuard permission="categories.update"><CategoriesEdit /></PermissionGuard></ProtectedRoute>} />

          {/* Fase 1: Products & Nested Variants */}
          <Route path="/products" element={<ProtectedRoute><PermissionGuard permission="products.view"><ProductsIndex /></PermissionGuard></ProtectedRoute>} />
          <Route path="/products/create" element={<ProtectedRoute><PermissionGuard permission="products.create"><ProductsCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/products/:id" element={<ProtectedRoute><PermissionGuard permission="products.view"><ProductsShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/products/:id/edit" element={<ProtectedRoute><PermissionGuard permission="products.update"><ProductsEdit /></PermissionGuard></ProtectedRoute>} />
          <Route path="/products/:productId/variants/create" element={<ProtectedRoute><PermissionGuard permission="products.create"><VariantsCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/products/:productId/variants/:id" element={<ProtectedRoute><PermissionGuard permission="products.view"><VariantsShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/products/:productId/variants/:id/edit" element={<ProtectedRoute><PermissionGuard permission="products.update"><VariantsEdit /></PermissionGuard></ProtectedRoute>} />

          {/* Fase 1: Product Groups */}
          <Route path="/product-groups" element={<ProtectedRoute><PermissionGuard permission="products.view"><ProductGroupsIndex /></PermissionGuard></ProtectedRoute>} />
          <Route path="/product-groups/create" element={<ProtectedRoute><PermissionGuard permission="products.create"><ProductGroupsCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/product-groups/:id" element={<ProtectedRoute><PermissionGuard permission="products.view"><ProductGroupsShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/product-groups/:id/edit" element={<ProtectedRoute><PermissionGuard permission="products.update"><ProductGroupsEdit /></PermissionGuard></ProtectedRoute>} />

          {/* Fase 1: Inventory & Monitoring ED */}
          <Route path="/inventory" element={<ProtectedRoute><PermissionGuard permission="inventory.view"><InventoryPage /></PermissionGuard></ProtectedRoute>} />

          {/* Fase 1: Suppliers */}
          <Route path="/suppliers" element={<ProtectedRoute><PermissionGuard permission="suppliers.view"><SuppliersIndex /></PermissionGuard></ProtectedRoute>} />
          <Route path="/suppliers/create" element={<ProtectedRoute><PermissionGuard permission="suppliers.create"><SuppliersCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/suppliers/:id" element={<ProtectedRoute><PermissionGuard permission="suppliers.view"><SuppliersShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/suppliers/:id/edit" element={<ProtectedRoute><PermissionGuard permission="suppliers.update"><SuppliersEdit /></PermissionGuard></ProtectedRoute>} />

          {/* Customers */}
          <Route path="/customers" element={<ProtectedRoute><PermissionGuard permission="customers.view"><CustomersIndex /></PermissionGuard></ProtectedRoute>} />
          <Route path="/customers/create" element={<ProtectedRoute><PermissionGuard permission="customers.create"><CustomersCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute><PermissionGuard permission="customers.view"><CustomersShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/customers/:id/edit" element={<ProtectedRoute><PermissionGuard permission="customers.update"><CustomersEdit /></PermissionGuard></ProtectedRoute>} />

          {/* Fase 1: Purchases */}
          <Route path="/purchases" element={<ProtectedRoute><PermissionGuard permission="purchases.view"><PurchasesIndex /></PermissionGuard></ProtectedRoute>} />
          <Route path="/purchases/create" element={<ProtectedRoute><PermissionGuard permission="purchases.create"><PurchasesCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/purchases/:id" element={<ProtectedRoute><PermissionGuard permission="purchases.view"><PurchasesShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/purchases/:id/edit" element={<ProtectedRoute><PermissionGuard permission="purchases.update"><PurchasesEdit /></PermissionGuard></ProtectedRoute>} />

          {/* Sales & Scan Out */}
          <Route path="/sales" element={<ProtectedRoute><PermissionGuard permission="sales.view"><SalesIndex /></PermissionGuard></ProtectedRoute>} />
          <Route path="/sales/create" element={<ProtectedRoute><PermissionGuard permission="sales.create"><SalesCreate /></PermissionGuard></ProtectedRoute>} />
          <Route path="/sales/:id" element={<ProtectedRoute><PermissionGuard permission="sales.view"><SalesShow /></PermissionGuard></ProtectedRoute>} />
          <Route path="/sales/:id/edit" element={<ProtectedRoute><PermissionGuard permission="sales.update"><SalesEdit /></PermissionGuard></ProtectedRoute>} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
