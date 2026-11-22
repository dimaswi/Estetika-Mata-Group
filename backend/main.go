package main

import (
	"log"
	"os"
	"path/filepath"
	"starter/backend/config"
	"starter/backend/database"
	"starter/backend/handlers"
	"starter/backend/middleware"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default configuration")
	}

	// Load config
	cfg := config.Load()

	// Set JWT secret
	middleware.SetJWTSecret(cfg.JWTSecret)

	// Connect to database
	if err := database.Connect(cfg.DatabaseDSN); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := database.Migrate(); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Setup Gin router
	r := gin.Default()

	// Serve static files for uploads
	r.Static("/uploads", "./uploads")

	// CORS middleware
	allowedOrigins := []string{
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://localhost:4173",
		"http://127.0.0.1:4173",
		"http://localhost:3000",
	}
	if cfg.AllowedOrigins != "" {
		for _, origin := range strings.Split(cfg.AllowedOrigins, ",") {
			if trimmed := strings.TrimSpace(origin); trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Public routes
	api := r.Group("/api")
	{
		api.POST("/auth/login", handlers.Login)
		api.GET("/settings", handlers.GetSettings) // Public access to settings
		api.GET("/public/catalog", handlers.GetPublicCatalog)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/auth/profile", handlers.GetProfile)
			protected.GET("/dashboard", handlers.GetDashboard)

			// Settings routes
			protected.PUT("/settings", handlers.UpdateSettings)
			protected.POST("/settings/upload", handlers.UploadLogo)

			// Users routes (with RBAC)
			protected.GET("/users", middleware.RequirePermission("users.view"), handlers.GetUsers)
			protected.GET("/users/:id", middleware.RequirePermission("users.view"), handlers.GetUser)
			protected.POST("/users", middleware.RequirePermission("users.create"), handlers.CreateUser)
			protected.PUT("/users/:id", middleware.RequirePermission("users.update"), handlers.UpdateUser)
			protected.DELETE("/users/:id", middleware.RequirePermission("users.delete"), handlers.DeleteUser)

			// Roles routes (with RBAC)
			protected.GET("/roles", middleware.RequirePermission("roles.view"), handlers.GetRoles)
			protected.GET("/roles/:id", middleware.RequirePermission("roles.view"), handlers.GetRole)
			protected.POST("/roles", middleware.RequirePermission("roles.create"), handlers.CreateRole)
			protected.PUT("/roles/:id", middleware.RequirePermission("roles.update"), handlers.UpdateRole)
			protected.DELETE("/roles/:id", middleware.RequirePermission("roles.delete"), handlers.DeleteRole)

			// Permissions routes
			protected.GET("/permissions", middleware.RequirePermission("permissions.view"), handlers.GetPermissions)
			protected.GET("/permissions/by-module", middleware.RequirePermission("permissions.view"), handlers.GetPermissionsByModule)
			protected.GET("/permissions/:id", middleware.RequirePermission("permissions.view"), handlers.GetPermission)
			protected.POST("/permissions", middleware.RequirePermission("permissions.create"), handlers.CreatePermission)
			protected.PUT("/permissions/:id", middleware.RequirePermission("permissions.update"), handlers.UpdatePermission)
			protected.DELETE("/permissions/:id", middleware.RequirePermission("permissions.delete"), handlers.DeletePermission)

			// Brands routes
			protected.GET("/brands", middleware.RequirePermission("brands.view"), handlers.GetBrands)
			protected.GET("/brands/:id", middleware.RequirePermission("brands.view"), handlers.GetBrand)
			protected.POST("/brands", middleware.RequirePermission("brands.create"), handlers.CreateBrand)
			protected.PUT("/brands/:id", middleware.RequirePermission("brands.update"), handlers.UpdateBrand)
			protected.DELETE("/brands/:id", middleware.RequirePermission("brands.delete"), handlers.DeleteBrand)

			// Categories routes
			protected.GET("/categories", middleware.RequirePermission("categories.view"), handlers.GetCategories)
			protected.GET("/categories/:id", middleware.RequirePermission("categories.view"), handlers.GetCategory)
			protected.POST("/categories", middleware.RequirePermission("categories.create"), handlers.CreateCategory)
			protected.PUT("/categories/:id", middleware.RequirePermission("categories.update"), handlers.UpdateCategory)
			protected.DELETE("/categories/:id", middleware.RequirePermission("categories.delete"), handlers.DeleteCategory)

			// Products, Variants & Product Groups routes
			protected.GET("/products", middleware.RequirePermission("products.view"), handlers.GetProducts)
			protected.GET("/products/:id", middleware.RequirePermission("products.view"), handlers.GetProduct)
			protected.POST("/products", middleware.RequirePermission("products.create"), handlers.CreateProduct)
			protected.PUT("/products/:id", middleware.RequirePermission("products.update"), handlers.UpdateProduct)
			protected.DELETE("/products/:id", middleware.RequirePermission("products.delete"), handlers.DeleteProduct)

			protected.GET("/variants", middleware.RequirePermission("products.view"), handlers.GetVariants)
			protected.GET("/variants/:id", middleware.RequirePermission("products.view"), handlers.GetVariantDetail)
			protected.POST("/variants", middleware.RequirePermission("products.create"), handlers.CreateVariant)
			protected.PUT("/variants/:id", middleware.RequirePermission("products.update"), handlers.UpdateVariant)
			protected.DELETE("/variants/:id", middleware.RequirePermission("products.delete"), handlers.DeleteVariant)

			protected.GET("/product-groups", middleware.RequirePermission("products.view"), handlers.GetProductGroups)
			protected.GET("/product-groups/:id", middleware.RequirePermission("products.view"), handlers.GetProductGroup)
			protected.POST("/product-groups", middleware.RequirePermission("products.create"), handlers.CreateProductGroup)
			protected.PUT("/product-groups/:id", middleware.RequirePermission("products.update"), handlers.UpdateProductGroup)
			protected.DELETE("/product-groups/:id", middleware.RequirePermission("products.delete"), handlers.DeleteProductGroup)

			// Suppliers & Purchases routes
			protected.GET("/suppliers", middleware.RequirePermission("suppliers.view"), handlers.GetSuppliers)
			protected.GET("/suppliers/:id", middleware.RequirePermission("suppliers.view"), handlers.GetSupplier)
			protected.POST("/suppliers", middleware.RequirePermission("suppliers.create"), handlers.CreateSupplier)
			protected.PUT("/suppliers/:id", middleware.RequirePermission("suppliers.update"), handlers.UpdateSupplier)
			protected.DELETE("/suppliers/:id", middleware.RequirePermission("suppliers.delete"), handlers.DeleteSupplier)

			protected.GET("/purchases", middleware.RequirePermission("purchases.view"), handlers.GetPurchases)
			protected.GET("/purchases/:id", middleware.RequirePermission("purchases.view"), handlers.GetPurchase)
			protected.POST("/purchases", middleware.RequirePermission("purchases.create"), handlers.CreatePurchase)
			protected.PUT("/purchases/:id", middleware.RequirePermission("purchases.update"), handlers.UpdatePurchase)
			protected.POST("/purchases/:id/payments", middleware.RequirePermission("purchases.pay"), handlers.AddSupplierPayment)
			protected.DELETE("/purchases/:id", middleware.RequirePermission("purchases.delete"), handlers.DeletePurchase)

			// Customers routes
			protected.GET("/customers", middleware.RequirePermission("customers.view"), handlers.GetCustomers)
			protected.GET("/customers/:id", middleware.RequirePermission("customers.view"), handlers.GetCustomer)
			protected.POST("/customers", middleware.RequirePermission("customers.create"), handlers.CreateCustomer)
			protected.PUT("/customers/:id", middleware.RequirePermission("customers.update"), handlers.UpdateCustomer)
			protected.DELETE("/customers/:id", middleware.RequirePermission("customers.delete"), handlers.DeleteCustomer)

			// Sales & Customer Payments (Outbound / AR)
			protected.GET("/sales", middleware.RequirePermission("sales.view"), handlers.GetSales)
			protected.GET("/sales/:id", middleware.RequirePermission("sales.view"), handlers.GetSale)
			protected.POST("/sales", middleware.RequirePermission("sales.create"), handlers.CreateSale)
			protected.PUT("/sales/:id", middleware.RequirePermission("sales.update"), handlers.UpdateSale)
			protected.POST("/sales/:id/payments", middleware.RequirePermission("sales.pay"), handlers.AddSalePayment)
			protected.POST("/sales/:id/usage", middleware.RequirePermission("sales.pay"), handlers.ConfirmSaleUsage)
			protected.POST("/sales/:id/return", middleware.RequirePermission("inventory.scan_in"), handlers.ReturnSaleConsignment)
			protected.DELETE("/sales/:id", middleware.RequirePermission("sales.delete"), handlers.DeleteSale)

			// Inventory, Batches, ED & Scan In/Out routes
			protected.GET("/inventory/summary", middleware.RequirePermission("inventory.view"), handlers.GetInventorySummary)
			protected.GET("/inventory/batches", middleware.RequirePermission("inventory.view"), handlers.GetBatches)
			protected.GET("/inventory/units", middleware.RequirePermission("inventory.view"), handlers.GetStockUnits)
			protected.GET("/inventory/units/lookup/:code", middleware.RequirePermission("inventory.view"), handlers.LookupStockUnit)
			protected.GET("/inventory/movements", middleware.RequirePermission("inventory.view"), handlers.GetStockMovements)
			protected.POST("/inventory/scan-in", middleware.RequirePermission("inventory.scan_in"), handlers.ScanIn)
			protected.POST("/inventory/scan-out", middleware.RequirePermission("inventory.scan_out"), handlers.ScanOut)
			protected.POST("/inventory/adjust", middleware.RequirePermission("inventory.manage"), handlers.AdjustStock)
		}
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Serve built frontend SPA (dist) automatically in production if available
	distDir := cfg.FrontendDist
	if _, err := os.Stat(filepath.Join(distDir, "index.html")); err != nil {
		if _, err2 := os.Stat(filepath.Join("./dist", "index.html")); err2 == nil {
			distDir = "./dist"
		} else {
			distDir = ""
		}
	}
	if distDir != "" {
		log.Printf("Serving frontend static build from %s", distDir)
		r.Static("/assets", filepath.Join(distDir, "assets"))
		r.StaticFile("/logo.png", filepath.Join(distDir, "logo.png"))
		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api") || strings.HasPrefix(c.Request.URL.Path, "/uploads") {
				c.JSON(404, gin.H{"error": "Not found"})
				return
			}
			reqPath := filepath.Join(distDir, filepath.Clean(c.Request.URL.Path))
			if info, err := os.Stat(reqPath); err == nil && !info.IsDir() {
				c.File(reqPath)
				return
			}
			c.File(filepath.Join(distDir, "index.html"))
		})
	}

	log.Printf("Server starting on port %s...", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
