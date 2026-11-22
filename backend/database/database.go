package database

import (
	"log"
	"starter/backend/models"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect(dsn string) error {
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}

	log.Println("Database connected successfully")
	return nil
}

func Migrate() error {
	// Auto-migrate all models with proper order for foreign key dependencies
	err := DB.AutoMigrate(
		&models.Role{},           // First, roles
		&models.Permission{},     // Then permissions
		&models.RolePermission{}, // Junction table
		&models.User{},           // Then users (depends on roles)
		&models.Setting{},        // Settings

		// Fase 1: Master Barang, Supplier, Pembelian, & Inventory Scan
		&models.Brand{},
		&models.Category{},
		&models.Product{},
		&models.ProductVariant{},
		&models.ProductGroup{},
		&models.ProductGroupItem{},
		&models.Supplier{},
		&models.Customer{},
		&models.Purchase{},
		&models.PurchaseItem{},
		&models.SupplierPayment{},
		&models.Sale{},
		&models.SaleItem{},
		&models.SalePayment{},
		&models.ProductBatch{},
		&models.StockUnit{},
		&models.StockMovement{},
	)

	if err != nil {
		return err
	}

	if err := ensurePartialUniqueIndexes(); err != nil {
		return err
	}

	if err := ensureProductVariantStructure(); err != nil {
		return err
	}

	log.Println("Database migrated successfully")
	return SeedData()
}

// ensureProductVariantStructure backfills existing products so that:
// 1. Products that already have non-default variants are marked has_variants = true.
// 2. Standalone products (has_variants = false) without a variant get an auto-managed default variant.
func ensureProductVariantStructure() error {
	var products []models.Product
	if err := DB.Preload("Variants").Find(&products).Error; err != nil {
		return err
	}

	for _, prod := range products {
		if len(prod.Variants) > 0 {
			if !prod.HasVariants && (len(prod.Variants) > 1 || !prod.Variants[0].IsDefault) {
				if err := DB.Model(&prod).Update("has_variants", true).Error; err != nil {
					return err
				}
			}
			continue
		}

		if !prod.HasVariants {
			feeType := prod.DefaultFeeProductType
			if feeType == "" {
				feeType = "fixed"
			}
			defVar := models.ProductVariant{
				ProductID:       prod.ID,
				SKU:             prod.SKUPrefix,
				VariantName:     "Standar",
				Attributes:      "{}",
				FeeProductType:  feeType,
				FeeProductValue: prod.DefaultFeeProductValue,
				IsDefault:       true,
				IsActive:        prod.IsActive,
			}
			if err := DB.Create(&defVar).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

// ensurePartialUniqueIndexes converts full unique indexes on soft-deletable tables
// into partial unique indexes (WHERE deleted_at IS NULL) so soft-deleted codes can be reused.
func ensurePartialUniqueIndexes() error {
	targets := []struct {
		Table  string
		Column string
		Index  string
	}{
		{"brands", "code", "idx_brands_code"},
		{"brands", "name", "idx_brands_name"},
		{"categories", "code", "idx_categories_code"},
		{"products", "sku_prefix", "idx_products_sku_prefix"},
		{"product_variants", "sku", "idx_product_variants_sku"},
		{"product_groups", "code", "idx_product_groups_code"},
		{"suppliers", "code", "idx_suppliers_code"},
		{"customers", "code", "idx_customers_code"},
		{"purchases", "invoice_number", "idx_purchases_invoice_number"},
		{"sales", "invoice_number", "idx_sales_invoice_number"},
		{"stock_units", "unit_code", "idx_stock_units_unit_code"},
		{"users", "email", "idx_users_email"},
		{"users", "username", "idx_users_username"},
		{"roles", "name", "idx_roles_name"},
		{"permissions", "name", "idx_permissions_name"},
		{"settings", "key", "idx_settings_key"},
	}

	for _, t := range targets {
		var indexDef string
		DB.Raw("SELECT COALESCE(indexdef, '') FROM pg_indexes WHERE schemaname = 'public' AND tablename = ? AND indexname = ?", t.Table, t.Index).Scan(&indexDef)
		lowerDef := strings.ToLower(indexDef)
		if indexDef != "" && !strings.Contains(lowerDef, "where (deleted_at is null)") && !strings.Contains(lowerDef, "where deleted_at is null") {
			if err := DB.Exec("DROP INDEX IF EXISTS " + t.Index).Error; err != nil {
				return err
			}
		}
		createSQL := "CREATE UNIQUE INDEX IF NOT EXISTS " + t.Index + " ON " + t.Table + " (" + t.Column + ") WHERE deleted_at IS NULL"
		if err := DB.Exec(createSQL).Error; err != nil {
			return err
		}
	}
	return nil
}

// CleanMigrate drops all tables and recreates them for fresh database structure
func CleanMigrate() error {
	// Drop tables in reverse order to handle foreign key constraints
	DB.Exec("DROP TABLE IF EXISTS role_permissions CASCADE")
	DB.Exec("DROP TABLE IF EXISTS users CASCADE")
	DB.Exec("DROP TABLE IF EXISTS permissions CASCADE")
	DB.Exec("DROP TABLE IF EXISTS roles CASCADE")
	DB.Exec("DROP TABLE IF EXISTS settings CASCADE")

	log.Println("Dropped existing tables for clean migration")

	// Now run normal migration
	return Migrate()
}

func SeedData() error {
	// Seed granular permissions that match frontend permission checks
	permissions := []models.Permission{
		// Users Management
		{Name: "users.view", Module: "User Management", Category: "Users", Description: "View users list and details", Actions: `["read"]`},
		{Name: "users.create", Module: "User Management", Category: "Users", Description: "Create new users", Actions: `["create"]`},
		{Name: "users.update", Module: "User Management", Category: "Users", Description: "Update existing users", Actions: `["update"]`},
		{Name: "users.delete", Module: "User Management", Category: "Users", Description: "Delete users", Actions: `["delete"]`},

		// Roles Management
		{Name: "roles.view", Module: "Role Management", Category: "Roles", Description: "View roles list and details", Actions: `["read"]`},
		{Name: "roles.create", Module: "Role Management", Category: "Roles", Description: "Create new roles", Actions: `["create"]`},
		{Name: "roles.update", Module: "Role Management", Category: "Roles", Description: "Update existing roles", Actions: `["update"]`},
		{Name: "roles.delete", Module: "Role Management", Category: "Roles", Description: "Delete roles", Actions: `["delete"]`},
		{Name: "roles.assign_permissions", Module: "Role Management", Category: "Roles", Description: "Assign permissions to roles", Actions: `["assign"]`},

		// Permissions Management
		{Name: "permissions.view", Module: "Permission Management", Category: "Permissions", Description: "View permissions list and details", Actions: `["read"]`},
		{Name: "permissions.create", Module: "Permission Management", Category: "Permissions", Description: "Create new permissions", Actions: `["create"]`},
		{Name: "permissions.update", Module: "Permission Management", Category: "Permissions", Description: "Update existing permissions", Actions: `["update"]`},
		{Name: "permissions.delete", Module: "Permission Management", Category: "Permissions", Description: "Delete permissions", Actions: `["delete"]`},

		// System & Dashboard
		{Name: "dashboard.view", Module: "Dashboard", Category: "Analytics", Description: "Access dashboard and reports", Actions: `["read"]`},
		{Name: "settings.view", Module: "System Settings", Category: "Settings", Description: "View system settings", Actions: `["read"]`},
		{Name: "settings.update", Module: "System Settings", Category: "Settings", Description: "Update system settings", Actions: `["update"]`},
		{Name: "profile.view", Module: "Profile Management", Category: "Account", Description: "View own profile", Actions: `["read"]`},
		{Name: "profile.update", Module: "Profile Management", Category: "Account", Description: "Update own profile", Actions: `["update"]`},

		// Catalog & Product Grouping
		{Name: "brands.view", Module: "Katalog Barang", Category: "Brands", Description: "View brands", Actions: `["read"]`},
		{Name: "brands.create", Module: "Katalog Barang", Category: "Brands", Description: "Create brands", Actions: `["create"]`},
		{Name: "brands.update", Module: "Katalog Barang", Category: "Brands", Description: "Update brands", Actions: `["update"]`},
		{Name: "brands.delete", Module: "Katalog Barang", Category: "Brands", Description: "Delete brands", Actions: `["delete"]`},

		{Name: "categories.view", Module: "Katalog Barang", Category: "Categories", Description: "View product categories", Actions: `["read"]`},
		{Name: "categories.create", Module: "Katalog Barang", Category: "Categories", Description: "Create product categories", Actions: `["create"]`},
		{Name: "categories.update", Module: "Katalog Barang", Category: "Categories", Description: "Update product categories", Actions: `["update"]`},
		{Name: "categories.delete", Module: "Katalog Barang", Category: "Categories", Description: "Delete product categories", Actions: `["delete"]`},

		{Name: "products.view", Module: "Katalog Barang", Category: "Products", Description: "View products, variants, and groups", Actions: `["read"]`},
		{Name: "products.create", Module: "Katalog Barang", Category: "Products", Description: "Create products, variants, and groups", Actions: `["create"]`},
		{Name: "products.update", Module: "Katalog Barang", Category: "Products", Description: "Update products, variants, and groups", Actions: `["update"]`},
		{Name: "products.delete", Module: "Katalog Barang", Category: "Products", Description: "Delete products, variants, and groups", Actions: `["delete"]`},

		// Inventory, Batch, ED & Scan In/Out
		{Name: "inventory.view", Module: "Inventory & Scan", Category: "Inventory", Description: "View stock, batches, ED, and movements", Actions: `["read"]`},
		{Name: "inventory.scan_in", Module: "Inventory & Scan", Category: "Inventory", Description: "Scan in stock units", Actions: `["create"]`},
		{Name: "inventory.scan_out", Module: "Inventory & Scan", Category: "Inventory", Description: "Scan out stock units", Actions: `["update"]`},
		{Name: "inventory.manage", Module: "Inventory & Scan", Category: "Inventory", Description: "Adjust stock and manage ED status", Actions: `["update"]`},

		// Suppliers & Purchases (Inbound / AP)
		{Name: "suppliers.view", Module: "Pembelian & Supplier", Category: "Suppliers", Description: "View suppliers", Actions: `["read"]`},
		{Name: "suppliers.create", Module: "Pembelian & Supplier", Category: "Suppliers", Description: "Create suppliers", Actions: `["create"]`},
		{Name: "suppliers.update", Module: "Pembelian & Supplier", Category: "Suppliers", Description: "Update suppliers", Actions: `["update"]`},
		{Name: "suppliers.delete", Module: "Pembelian & Supplier", Category: "Suppliers", Description: "Delete suppliers", Actions: `["delete"]`},

		{Name: "purchases.view", Module: "Pembelian & Supplier", Category: "Purchases", Description: "View purchase orders and invoices", Actions: `["read"]`},
		{Name: "purchases.create", Module: "Pembelian & Supplier", Category: "Purchases", Description: "Create purchases", Actions: `["create"]`},
		{Name: "purchases.update", Module: "Pembelian & Supplier", Category: "Purchases", Description: "Update purchases", Actions: `["update"]`},
		{Name: "purchases.pay", Module: "Pembelian & Supplier", Category: "Purchases", Description: "Record supplier payments", Actions: `["create"]`},
		{Name: "purchases.delete", Module: "Pembelian & Supplier", Category: "Purchases", Description: "Delete purchases", Actions: `["delete"]`},

		// Customers (Outbound / AR)
		{Name: "customers.view", Module: "Pembelian & Penjualan", Category: "Customers", Description: "View customers", Actions: `["read"]`},
		{Name: "customers.create", Module: "Pembelian & Penjualan", Category: "Customers", Description: "Create customers", Actions: `["create"]`},
		{Name: "customers.update", Module: "Pembelian & Penjualan", Category: "Customers", Description: "Update customers", Actions: `["update"]`},
		{Name: "customers.delete", Module: "Pembelian & Penjualan", Category: "Customers", Description: "Delete customers", Actions: `["delete"]`},

		// Sales (Outbound / AR / Scan Out)
		{Name: "sales.view", Module: "Pembelian & Penjualan", Category: "Sales", Description: "View sales orders and invoices", Actions: `["read"]`},
		{Name: "sales.create", Module: "Pembelian & Penjualan", Category: "Sales", Description: "Create sales", Actions: `["create"]`},
		{Name: "sales.update", Module: "Pembelian & Penjualan", Category: "Sales", Description: "Update sales", Actions: `["update"]`},
		{Name: "sales.pay", Module: "Pembelian & Penjualan", Category: "Sales", Description: "Record customer payments", Actions: `["create"]`},
		{Name: "sales.delete", Module: "Pembelian & Penjualan", Category: "Sales", Description: "Delete sales", Actions: `["delete"]`},
	}

	for _, perm := range permissions {
		DB.Where(models.Permission{Name: perm.Name}).FirstOrCreate(&perm)
	}

	// Create default roles
	var adminRole models.Role
	DB.Where(models.Role{Name: "admin"}).FirstOrCreate(&adminRole, models.Role{
		Name:        "admin",
		Description: "Administrator with full access",
	})

	var userRole models.Role
	DB.Where(models.Role{Name: "user"}).FirstOrCreate(&userRole, models.Role{
		Name:        "user",
		Description: "Regular user with limited access",
	})

	// Assign all permissions to admin role
	var allPermissions []models.Permission
	DB.Find(&allPermissions)
	if len(allPermissions) > 0 {
		DB.Model(&adminRole).Association("Permissions").Replace(allPermissions)
	}

	// Assign limited permissions to user role
	var limitedPermissions []models.Permission
	DB.Where("name IN ?", []string{"profile.view", "profile.update", "dashboard.view"}).Find(&limitedPermissions)
	if len(limitedPermissions) > 0 {
		DB.Model(&userRole).Association("Permissions").Replace(limitedPermissions)
	}

	// Create default admin user
	var adminUser models.User
	result := DB.Where(models.User{Email: "admin@simrs.com"}).FirstOrCreate(&adminUser, models.User{
		Email:    "admin@simrs.com",
		Username: "admin",
		FullName: "System Administrator",
		IsActive: true,
		RoleID:   adminRole.ID,
	})

	if result.RowsAffected > 0 {
		adminUser.HashPassword("admin123")
		DB.Save(&adminUser)
		log.Println("Default admin user created: admin@simrs.com / admin123")
	}

	// Create default settings
	defaultSettings := []models.Setting{
		{Key: "app_name", Value: "StarterKits"},
		{Key: "app_subtitle", Value: "Hospital System"},
	}

	for _, setting := range defaultSettings {
		DB.Where(models.Setting{Key: setting.Key}).FirstOrCreate(&setting)
	}

	if err := seedCustomers(); err != nil {
		return err
	}

	return nil
}
