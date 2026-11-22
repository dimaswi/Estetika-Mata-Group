import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Permission {
  id: number;
  name: string;
  module: string;
  category: string;
  description: string;
  actions: string; // JSON string containing array of actions
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Permission[];
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  role_id?: number;
  role?: Role;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),

  getProfile: () =>
    api.get<User>('/auth/profile'),
};

export const usersApi = {
  getAll: () =>
    api.get<{ data: User[] }>('/users'),

  getById: (id: number) =>
    api.get<{ data: User }>(`/users/${id}`),

  create: (data: any) =>
    api.post<{ data: User }>('/users', data),

  update: (id: number, data: any) =>
    api.put<{ data: User }>(`/users/${id}`, data),

  delete: (id: number) =>
    api.delete(`/users/${id}`),
};

export const rolesApi = {
  getAll: () =>
    api.get('/roles'),

  getById: (id: number) =>
    api.get(`/roles/${id}`),

  create: (data: any) =>
    api.post('/roles', data),

  update: (id: number, data: any) =>
    api.put(`/roles/${id}`, data),

  delete: (id: number) =>
    api.delete(`/roles/${id}`),
};

export const permissionsApi = {
  getAll: () =>
    api.get('/permissions'),

  getById: (id: number) =>
    api.get(`/permissions/${id}`),

  create: (data: any) =>
    api.post('/permissions', data),

  update: (id: number, data: any) =>
    api.put(`/permissions/${id}`, data),

  delete: (id: number) =>
    api.delete(`/permissions/${id}`),
};

export const settingsApi = {
  getAll: () =>
    api.get('/settings'),

  update: (data: Record<string, string>) =>
    api.put('/settings', data),

  uploadLogo: (file: File, type: 'logo' | 'favicon') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post('/settings/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// ==================== FASE 1: KATALOG, SUPPLIER, PEMBELIAN & INVENTORY ====================

export interface Brand {
  id: number;
  code: string;
  name: string;
  manufacturer: string;
  country: string;
  description: string;
  is_active: boolean;
  products?: Product[];
  created_at?: string;
}

export interface Category {
  id: number;
  parent_id?: number | null;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  parent?: Category | null;
  products?: Product[];
  created_at?: string;
}

export interface Product {
  id: number;
  category_id: number;
  brand_id?: number | null;
  sku_prefix: string;
  name: string;
  alternative_name?: string;
  brand: string;
  akl_number: string;
  unit_name: string;
  min_stock_alert: number;
  has_variants: boolean;
  buy_price?: number;
  sell_price?: number;
  fee_product_type?: string;
  fee_product_value?: number;
  barcode?: string;
  default_fee_product_type: string;
  default_fee_product_value: number;
  description: string;
  is_active: boolean;
  category?: Category;
  brand_info?: Brand | null;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  variant_name: string;
  is_default?: boolean;
  attributes: string;
  buy_price: number;
  sell_price: number;
  fee_product_type: string;
  fee_product_value: number;
  barcode: string;
  is_active: boolean;
  product?: Product;
  stock_count?: number;
}

export interface ProductGroupItem {
  id: number;
  product_group_id: number;
  product_variant_id: number;
  default_qty: number;
  product_variant?: ProductVariant;
}

export interface ProductGroup {
  id: number;
  code: string;
  name: string;
  group_type: string;
  description: string;
  is_active: boolean;
  items?: ProductGroupItem[];
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  npwp: string;
  default_term_days: number;
  is_active: boolean;
  total_purchases?: number;
  total_paid?: number;
  outstanding_ap?: number;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  customer_type: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  subdistrict: string;
  city: string;
  province: string;
  postal_code: string;
  default_term_days: number;
  is_active: boolean;
  total_sales?: number;
  total_paid?: number;
  outstanding_ar?: number;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_variant_id: number;
  qty_ordered: number;
  qty_scanned_in: number;
  unit_cost: number;
  discount_amount: number;
  subtotal: number;
  product_variant?: ProductVariant;
}

export interface SupplierPayment {
  id: number;
  purchase_id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_no: string;
  notes: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_variant_id: number;
  qty_ordered: number;
  qty_scanned_out: number;
  qty_used?: number;
  qty_returned?: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
  fee_amount: number;
  product_variant?: ProductVariant;
  units?: StockUnit[];
}

export interface SalePayment {
  id: number;
  sale_id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_no: string;
  notes: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer_id?: number | null;
  customer?: Customer;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  doctor_name: string;
  sale_date: string;
  payment_type: 'cash' | 'termin' | 'consignment';
  term_days: number;
  due_date?: string | null;
  subtotal: number;
  discount_amount: number;
  penalty_amount: number;
  tax_amount: number;
  total_amount: number;
  billable_amount?: number;
  usage_confirmed_at?: string | null;
  paid_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waiting_usage';
  delivery_status: 'draft' | 'partial_scanned' | 'completed';
  notes: string;
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface Purchase {
  id: number;
  invoice_number: string;
  supplier_id: number;
  purchase_date: string;
  payment_type: 'cash' | 'termin';
  term_days: number;
  due_date?: string | null;
  subtotal: number;
  discount_amount: number;
  penalty_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  receive_status: 'draft' | 'partial_scanned' | 'completed';
  notes: string;
  supplier?: Supplier;
  items?: PurchaseItem[];
  payments?: SupplierPayment[];
}

export interface ProductBatch {
  id: number;
  product_variant_id: number;
  supplier_id?: number | null;
  purchase_id?: number | null;
  batch_number: string;
  expired_date: string;
  received_date: string;
  unit_cost: number;
  qty_initial: number;
  qty_available: number;
  notes: string;
  ed_status?: string;
  days_to_expiry?: number;
  product_variant?: ProductVariant;
  supplier?: Supplier;
}

export interface StockUnit {
  id: number;
  product_variant_id: number;
  product_batch_id: number;
  unit_code: string;
  serial_number: string;
  status: string;
  location: string;
  scanned_in_at: string;
  scanned_out_at?: string | null;
  product_variant?: ProductVariant;
  product_batch?: ProductBatch;
}

export interface StockMovement {
  id: number;
  created_at: string;
  stock_unit_id: number;
  product_batch_id: number;
  product_variant_id: number;
  movement_type: string;
  reference_type: string;
  reference_id?: number | null;
  notes: string;
  stock_unit?: StockUnit;
  product_batch?: ProductBatch;
  product_variant?: ProductVariant;
}

export interface InventorySummaryRow {
  variant_id: number;
  sku: string;
  variant_name: string;
  is_default?: boolean;
  attributes: string;
  product_id: number;
  product_name: string;
  has_variants?: boolean;
  brand: string;
  unit_name: string;
  min_stock_alert: number;
  category_id: number;
  category_name: string;
  in_stock_count: number;
  batches_count: number;
  nearest_ed?: string | null;
  ed_status: string;
  days_to_expiry: number;
  is_low_stock: boolean;
  buy_price: number;
  sell_price: number;
}

export const brandsApi = {
  getAll: (params?: { active_only?: boolean }) => api.get<{ data: Brand[] }>('/brands', { params }),
  getById: (id: number) => api.get<{ data: Brand }>(`/brands/${id}`),
  create: (data: Partial<Brand>) => api.post<{ data: Brand }>('/brands', data),
  update: (id: number, data: Partial<Brand>) => api.put<{ data: Brand }>(`/brands/${id}`, data),
  delete: (id: number) => api.delete(`/brands/${id}`),
};

export const categoriesApi = {
  getAll: (params?: { active_only?: boolean }) => api.get<{ data: Category[] }>('/categories', { params }),
  getById: (id: number) => api.get<{ data: Category }>(`/categories/${id}`),
  create: (data: Partial<Category>) => api.post<{ data: Category }>('/categories', data),
  update: (id: number, data: Partial<Category>) => api.put<{ data: Category }>(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const productsApi = {
  getAll: (params?: { category_id?: number; search?: string }) => api.get<{ data: Product[] }>('/products', { params }),
  getById: (id: number) => api.get<{ data: Product }>(`/products/${id}`),
  create: (data: Partial<Product>) => api.post<{ data: Product }>('/products', data),
  update: (id: number, data: Partial<Product>) => api.put<{ data: Product }>(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

export const variantsApi = {
  getAll: (params?: { product_id?: number; category_id?: number; search?: string }) =>
    api.get<{ data: ProductVariant[] }>('/variants', { params }),
  getDetail: (id: number, params?: { status?: string }) =>
    api.get<{ data: { variant: ProductVariant; batches: ProductBatch[]; units: StockUnit[] } }>(`/variants/${id}`, { params }),
  create: (data: Partial<ProductVariant>) => api.post<{ data: ProductVariant }>('/variants', data),
  update: (id: number, data: Partial<ProductVariant>) => api.put<{ data: ProductVariant }>(`/variants/${id}`, data),
  delete: (id: number) => api.delete(`/variants/${id}`),
};

export const productGroupsApi = {
  getAll: () => api.get<{ data: ProductGroup[] }>('/product-groups'),
  getById: (id: number) => api.get<{ data: ProductGroup }>(`/product-groups/${id}`),
  create: (data: unknown) => api.post<{ data: ProductGroup }>('/product-groups', data),
  update: (id: number, data: unknown) => api.put<{ data: ProductGroup }>(`/product-groups/${id}`, data),
  delete: (id: number) => api.delete(`/product-groups/${id}`),
};

export const suppliersApi = {
  getAll: (params?: { search?: string }) => api.get<{ data: Supplier[] }>('/suppliers', { params }),
  getById: (id: number) => api.get<{ data: Supplier }>(`/suppliers/${id}`),
  create: (data: Partial<Supplier>) => api.post<{ data: Supplier }>('/suppliers', data),
  update: (id: number, data: Partial<Supplier>) => api.put<{ data: Supplier }>(`/suppliers/${id}`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
};

export const customersApi = {
  getAll: (params?: { search?: string }) => api.get<{ data: Customer[] }>('/customers', { params }),
  getById: (id: number) => api.get<{ data: Customer }>(`/customers/${id}`),
  create: (data: Partial<Customer>) => api.post<{ data: Customer }>('/customers', data),
  update: (id: number, data: Partial<Customer>) => api.put<{ data: Customer }>(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

export const purchasesApi = {
  getAll: (params?: { supplier_id?: number; payment_status?: string; receive_status?: string; search?: string }) =>
    api.get<{ data: Purchase[] }>('/purchases', { params }),
  getById: (id: number) => api.get<{ data: Purchase }>(`/purchases/${id}`),
  create: (data: unknown) => api.post<{ data: Purchase }>('/purchases', data),
  update: (id: number, data: unknown) => api.put<{ data: Purchase }>(`/purchases/${id}`, data),
  addPayment: (id: number, data: unknown) => api.post<{ data: Purchase }>(`/purchases/${id}/payments`, data),
  delete: (id: number) => api.delete(`/purchases/${id}`),
};

export const salesApi = {
  getAll: (params?: { payment_status?: string; delivery_status?: string; search?: string }) =>
    api.get<{ data: Sale[] }>('/sales', { params }),
  getById: (id: number) => api.get<{ data: Sale }>(`/sales/${id}`),
  create: (data: unknown) => api.post<{ data: Sale }>('/sales', data),
  update: (id: number, data: unknown) => api.put<{ data: Sale }>(`/sales/${id}`, data),
  addPayment: (id: number, data: unknown) => api.post<{ data: Sale }>(`/sales/${id}/payments`, data),
  confirmUsage: (id: number, data: { usage_date?: string; unit_codes: string[]; term_days?: number; notes?: string }) =>
    api.post<{ data: Sale }>(`/sales/${id}/usage`, data),
  returnUnits: (id: number, data: { unit_codes: string[]; notes?: string }) =>
    api.post<{ data: Sale }>(`/sales/${id}/return`, data),
  delete: (id: number) => api.delete(`/sales/${id}`),
};

export interface DashboardData {
  inventory: {
    total_products: number;
    total_variants: number;
    out_of_stock_variants: number;
    units_in_stock: number;
    units_consignment: number;
    inventory_value: number;
    ed_expired_units: number;
    ed_critical_units: number;
    ed_warning_units: number;
    ed_safe_units: number;
  };
  sales: {
    total_count: number;
    total_billed: number;
    total_paid: number;
    outstanding_ar: number;
    waiting_usage_count: number;
    consignment_total: number;
    overdue_count: number;
  };
  purchases: {
    total_count: number;
    total_amount: number;
    total_paid: number;
    outstanding_ap: number;
    overdue_count: number;
  };
  partners: {
    total_customers: number;
    total_suppliers: number;
  };
  expiring_batches: ProductBatch[];
  recent_sales: Sale[];
  recent_purchases: Purchase[];
}

export interface PublicVariantItem {
  id: number;
  sku: string;
  variant_name: string;
  is_default: boolean;
  attributes: string;
  sell_price: number;
  stock_count: number;
}

export interface PublicProductItem {
  id: number;
  category_id: number;
  brand_id?: number | null;
  sku_prefix: string;
  name: string;
  alternative_name: string;
  brand: string;
  akl_number: string;
  unit_name: string;
  has_variants: boolean;
  description: string;
  category_name: string;
  min_price: number;
  max_price: number;
  total_stock: number;
  variants: PublicVariantItem[];
}

export interface PublicCatalogData {
  categories: Category[];
  brands: Brand[];
  products: PublicProductItem[];
  stats: {
    total_products: number;
    total_variants: number;
    total_categories: number;
    total_brands: number;
    total_ready_units: number;
  };
}

export const publicCatalogApi = {
  getCatalog: () => api.get<{ data: PublicCatalogData }>('/public/catalog'),
};

export const dashboardApi = {
  getSummary: () => api.get<{ data: DashboardData }>('/dashboard'),
};

export const inventoryApi = {
  getSummary: (params?: { category_id?: number; search?: string }) =>
    api.get<{ data: InventorySummaryRow[] }>('/inventory/summary', { params }),
  getBatches: (params?: { variant_id?: number; supplier_id?: number; ed_status?: string; only_available?: boolean }) =>
    api.get<{ data: ProductBatch[] }>('/inventory/batches', { params }),
  getUnits: (params?: { variant_id?: number; batch_id?: number; status?: string; search?: string }) =>
    api.get<{ data: StockUnit[] }>('/inventory/units', { params }),
  lookupUnit: (code: string) =>
    api.get<{ data: { unit: StockUnit; ed_status: string; days_to_expiry: number; fefo_earlier_batch?: ProductBatch | null } }>(
      `/inventory/units/lookup/${encodeURIComponent(code)}`
    ),
  getMovements: (params?: { movement_type?: string; variant_id?: number }) =>
    api.get<{ data: StockMovement[] }>('/inventory/movements', { params }),
  scanIn: (data: unknown) =>
    api.post<{ data: { batch: ProductBatch; scanned_count: number; units: StockUnit[] } }>('/inventory/scan-in', data),
  scanOut: (data: unknown) =>
    api.post<{ data: { processed_count: number; units: StockUnit[] } }>('/inventory/scan-out', data),
  adjustStock: (data: {
    mode: 'add' | 'subtract';
    product_variant_id: number;
    batch_number?: string;
    expired_date?: string;
    location?: string;
    unit_cost?: number;
    unit_codes?: string[];
    auto_generate_count?: number;
    qty?: number;
    reason?: string;
    notes?: string;
  }) =>
    api.post<{ data: { mode: string; processed_count: number; units: StockUnit[] } }>('/inventory/adjust', data),
};
