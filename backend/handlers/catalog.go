package handlers

import (
	"net/http"
	"starter/backend/database"
	"starter/backend/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ==================== BRANDS ====================

func GetBrands(c *gin.Context) {
	var brands []models.Brand
	query := database.DB.Preload("Products").Order("name ASC")
	if c.Query("active_only") == "true" {
		query = query.Where("is_active = ?", true)
	}
	if err := query.Find(&brands).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": brands})
}

func GetBrand(c *gin.Context) {
	var brand models.Brand
	if err := database.DB.Preload("Products.Category").Preload("Products.Variants").First(&brand, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Brand not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": brand})
}

type BrandRequest struct {
	Code         string `json:"code" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Manufacturer string `json:"manufacturer"`
	Country      string `json:"country"`
	Description  string `json:"description"`
	IsActive     *bool  `json:"is_active"`
}

func CreateBrand(c *gin.Context) {
	var req BrandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	brand := models.Brand{
		Code:         strings.ToUpper(strings.TrimSpace(req.Code)),
		Name:         strings.TrimSpace(req.Name),
		Manufacturer: strings.TrimSpace(req.Manufacturer),
		Country:      strings.TrimSpace(req.Country),
		Description:  req.Description,
		IsActive:     isActive,
	}
	if err := database.DB.Create(&brand).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": brand})
}

func UpdateBrand(c *gin.Context) {
	var brand models.Brand
	if err := database.DB.First(&brand, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Brand not found"})
		return
	}
	var req BrandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	brand.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	brand.Name = strings.TrimSpace(req.Name)
	brand.Manufacturer = strings.TrimSpace(req.Manufacturer)
	brand.Country = strings.TrimSpace(req.Country)
	brand.Description = req.Description
	if req.IsActive != nil {
		brand.IsActive = *req.IsActive
	}
	if err := database.DB.Save(&brand).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Sync brand string on linked products
	database.DB.Model(&models.Product{}).Where("brand_id = ?", brand.ID).Update("brand", brand.Name)
	c.JSON(http.StatusOK, gin.H{"data": brand})
}

func DeleteBrand(c *gin.Context) {
	var count int64
	database.DB.Model(&models.Product{}).Where("brand_id = ?", c.Param("id")).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Brand still has products"})
		return
	}
	if err := database.DB.Delete(&models.Brand{}, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Brand deleted"})
}

// ==================== CATEGORIES ====================

func GetCategories(c *gin.Context) {
	var categories []models.Category
	query := database.DB.Preload("Parent").Order("name ASC")
	if c.Query("active_only") == "true" {
		query = query.Where("is_active = ?", true)
	}
	if err := query.Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": categories})
}

func GetCategory(c *gin.Context) {
	var cat models.Category
	if err := database.DB.Preload("Parent").Preload("Products.Variants").First(&cat, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cat})
}

type CategoryRequest struct {
	ParentID    *uint  `json:"parent_id"`
	Code        string `json:"code" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

func CreateCategory(c *gin.Context) {
	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	cat := models.Category{
		ParentID:    req.ParentID,
		Code:        strings.ToUpper(strings.TrimSpace(req.Code)),
		Name:        strings.TrimSpace(req.Name),
		Description: req.Description,
		IsActive:    isActive,
	}
	if err := database.DB.Create(&cat).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": cat})
}

func UpdateCategory(c *gin.Context) {
	var cat models.Category
	if err := database.DB.First(&cat, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cat.ParentID = req.ParentID
	cat.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	cat.Name = strings.TrimSpace(req.Name)
	cat.Description = req.Description
	if req.IsActive != nil {
		cat.IsActive = *req.IsActive
	}
	if err := database.DB.Save(&cat).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cat})
}

func DeleteCategory(c *gin.Context) {
	var count int64
	database.DB.Model(&models.Product{}).Where("category_id = ?", c.Param("id")).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Category still has active products"})
		return
	}
	var childCount int64
	database.DB.Model(&models.Category{}).Where("parent_id = ?", c.Param("id")).Count(&childCount)
	if childCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Category still has active sub-categories"})
		return
	}
	if err := database.DB.Delete(&models.Category{}, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Category deleted"})
}

// ==================== PRODUCTS ====================

func GetProducts(c *gin.Context) {
	var products []models.Product
	query := database.DB.Preload("Category").Preload("BrandInfo").Preload("Variants").Order("name ASC")
	if catID := c.Query("category_id"); catID != "" {
		query = query.Where("category_id = ?", catID)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR alternative_name ILIKE ? OR sku_prefix ILIKE ? OR brand ILIKE ? OR akl_number ILIKE ?", like, like, like, like, like)
	}
	if err := query.Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Attach available stock counts per variant
	var stockRows []struct {
		ProductVariantID uint
		Total            int64
	}
	database.DB.Model(&models.StockUnit{}).
		Select("product_variant_id, COUNT(*) as total").
		Where("status = ?", "in_stock").
		Group("product_variant_id").
		Scan(&stockRows)
	stockMap := make(map[uint]int64, len(stockRows))
	for _, r := range stockRows {
		stockMap[r.ProductVariantID] = r.Total
	}
	for i := range products {
		for j := range products[i].Variants {
			products[i].Variants[j].StockCount = stockMap[products[i].Variants[j].ID]
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": products})
}

func GetProduct(c *gin.Context) {
	var product models.Product
	if err := database.DB.Preload("Category").Preload("BrandInfo").Preload("Variants").First(&product, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}
	for i := range product.Variants {
		var cnt int64
		database.DB.Model(&models.StockUnit{}).
			Where("product_variant_id = ? AND status = ?", product.Variants[i].ID, "in_stock").
			Count(&cnt)
		product.Variants[i].StockCount = cnt
	}
	c.JSON(http.StatusOK, gin.H{"data": product})
}

type ProductRequest struct {
	CategoryID             uint    `json:"category_id" binding:"required"`
	BrandID                *uint   `json:"brand_id"`
	SKUPrefix              string  `json:"sku_prefix" binding:"required"`
	Name                   string  `json:"name" binding:"required"`
	AlternativeName        string  `json:"alternative_name"`
	Brand                  string  `json:"brand"`
	AKLNumber              string  `json:"akl_number"`
	UnitName               string  `json:"unit_name"`
	MinStockAlert          int     `json:"min_stock_alert"`
	HasVariants            *bool   `json:"has_variants"`
	BuyPrice               float64 `json:"buy_price"`
	SellPrice              float64 `json:"sell_price"`
	FeeProductType         string  `json:"fee_product_type"`
	FeeProductValue        float64 `json:"fee_product_value"`
	Barcode                string  `json:"barcode"`
	DefaultFeeProductType  string  `json:"default_fee_product_type"`
	DefaultFeeProductValue float64 `json:"default_fee_product_value"`
	Description            string  `json:"description"`
	IsActive               *bool   `json:"is_active"`
}

func resolveBrandName(brandID *uint, fallback string) string {
	if brandID != nil && *brandID > 0 {
		var b models.Brand
		if err := database.DB.First(&b, *brandID).Error; err == nil {
			return b.Name
		}
	}
	return fallback
}

func normalizeFeeType(ft string) string {
	if strings.ToLower(strings.TrimSpace(ft)) == "percent" {
		return "percent"
	}
	return "fixed"
}

func variantHasDependencies(tx *gorm.DB, variantID uint) bool {
	var cnt int64
	tx.Model(&models.StockUnit{}).Where("product_variant_id = ?", variantID).Count(&cnt)
	if cnt > 0 {
		return true
	}
	tx.Model(&models.PurchaseItem{}).
		Joins("JOIN purchases p ON p.id = purchase_items.purchase_id").
		Where("purchase_items.product_variant_id = ? AND p.deleted_at IS NULL", variantID).
		Count(&cnt)
	if cnt > 0 {
		return true
	}
	tx.Model(&models.ProductGroupItem{}).Where("product_variant_id = ?", variantID).Count(&cnt)
	return cnt > 0
}

func syncSingleProductDefaultVariant(tx *gorm.DB, prod *models.Product, req ProductRequest) error {
	var variants []models.ProductVariant
	if err := tx.Where("product_id = ?", prod.ID).Order("id ASC").Find(&variants).Error; err != nil {
		return err
	}
	if len(variants) > 1 {
		return gin.Error{
			Err:  http.ErrAbortHandler,
			Type: gin.ErrorTypePublic,
			Meta: "Produk masih memiliki lebih dari 1 variasi. Hapus variasi tambahan terlebih dahulu sebelum mengubah ke produk tunggal.",
		}
	}

	feeType := req.FeeProductType
	if feeType == "" {
		feeType = req.DefaultFeeProductType
	}
	feeType = normalizeFeeType(feeType)
	feeVal := req.FeeProductValue
	if feeVal == 0 && req.DefaultFeeProductValue != 0 {
		feeVal = req.DefaultFeeProductValue
	}

	if len(variants) == 1 {
		v := variants[0]
		v.SKU = prod.SKUPrefix
		v.VariantName = "Standar"
		v.BuyPrice = req.BuyPrice
		v.SellPrice = req.SellPrice
		v.FeeProductType = feeType
		v.FeeProductValue = feeVal
		v.Barcode = strings.TrimSpace(req.Barcode)
		v.IsDefault = true
		v.IsActive = prod.IsActive
		return tx.Save(&v).Error
	}

	v := models.ProductVariant{
		ProductID:       prod.ID,
		SKU:             prod.SKUPrefix,
		VariantName:     "Standar",
		Attributes:      "{}",
		BuyPrice:        req.BuyPrice,
		SellPrice:       req.SellPrice,
		FeeProductType:  feeType,
		FeeProductValue: feeVal,
		Barcode:         strings.TrimSpace(req.Barcode),
		IsDefault:       true,
		IsActive:        prod.IsActive,
	}
	return tx.Create(&v).Error
}

func CreateProduct(c *gin.Context) {
	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	unitName := strings.TrimSpace(req.UnitName)
	if unitName == "" {
		unitName = "pcs"
	}
	hasVariants := false
	if req.HasVariants != nil {
		hasVariants = *req.HasVariants
	}
	feeType := normalizeFeeType(req.DefaultFeeProductType)
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	prod := models.Product{
		CategoryID:             req.CategoryID,
		BrandID:                req.BrandID,
		SKUPrefix:              strings.ToUpper(strings.TrimSpace(req.SKUPrefix)),
		Name:                   strings.TrimSpace(req.Name),
		AlternativeName:        strings.TrimSpace(req.AlternativeName),
		Brand:                  resolveBrandName(req.BrandID, req.Brand),
		AKLNumber:              req.AKLNumber,
		UnitName:               unitName,
		MinStockAlert:          req.MinStockAlert,
		HasVariants:            hasVariants,
		DefaultFeeProductType:  feeType,
		DefaultFeeProductValue: req.DefaultFeeProductValue,
		Description:            req.Description,
		IsActive:               isActive,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&prod).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !prod.HasVariants {
		if err := syncSingleProductDefaultVariant(tx, &prod, req); err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	tx.Commit()

	database.DB.Preload("Category").Preload("BrandInfo").Preload("Variants").First(&prod, prod.ID)
	c.JSON(http.StatusCreated, gin.H{"data": prod})
}

func UpdateProduct(c *gin.Context) {
	var prod models.Product
	if err := database.DB.First(&prod, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}
	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	prod.CategoryID = req.CategoryID
	prod.BrandID = req.BrandID
	prod.SKUPrefix = strings.ToUpper(strings.TrimSpace(req.SKUPrefix))
	prod.Name = strings.TrimSpace(req.Name)
	prod.AlternativeName = strings.TrimSpace(req.AlternativeName)
	prod.Brand = resolveBrandName(req.BrandID, req.Brand)
	prod.AKLNumber = req.AKLNumber
	if req.UnitName != "" {
		prod.UnitName = req.UnitName
	}
	prod.MinStockAlert = req.MinStockAlert
	if req.HasVariants != nil {
		prod.HasVariants = *req.HasVariants
	}
	if req.DefaultFeeProductType != "" {
		prod.DefaultFeeProductType = req.DefaultFeeProductType
	}
	prod.DefaultFeeProductValue = req.DefaultFeeProductValue
	prod.Description = req.Description
	if req.IsActive != nil {
		prod.IsActive = *req.IsActive
	}

	tx := database.DB.Begin()
	if !prod.HasVariants {
		if err := syncSingleProductDefaultVariant(tx, &prod, req); err != nil {
			tx.Rollback()
			if ge, ok := err.(gin.Error); ok {
				if msg, ok := ge.Meta.(string); ok {
					c.JSON(http.StatusBadRequest, gin.H{"error": msg})
					return
				}
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	} else {
		var variants []models.ProductVariant
		tx.Where("product_id = ?", prod.ID).Find(&variants)
		for _, v := range variants {
			if v.IsDefault {
				if variantHasDependencies(tx, v.ID) {
					v.IsDefault = false
					if err := tx.Save(&v).Error; err != nil {
						tx.Rollback()
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
				} else {
					if err := tx.Delete(&v).Error; err != nil {
						tx.Rollback()
						c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
						return
					}
				}
			}
		}
	}

	if err := tx.Save(&prod).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()

	database.DB.Preload("Category").Preload("BrandInfo").Preload("Variants").First(&prod, prod.ID)
	c.JSON(http.StatusOK, gin.H{"data": prod})
}

func DeleteProduct(c *gin.Context) {
	var unitCount int64
	database.DB.Model(&models.StockUnit{}).
		Joins("JOIN product_variants pv ON pv.id = stock_units.product_variant_id").
		Where("pv.product_id = ?", c.Param("id")).
		Count(&unitCount)
	if unitCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete product that already has scanned stock units"})
		return
	}
	var purCount int64
	database.DB.Model(&models.PurchaseItem{}).
		Joins("JOIN product_variants pv ON pv.id = purchase_items.product_variant_id").
		Joins("JOIN purchases p ON p.id = purchase_items.purchase_id").
		Where("pv.product_id = ? AND p.deleted_at IS NULL", c.Param("id")).
		Count(&purCount)
	if purCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete product referenced by active purchases"})
		return
	}

	tx := database.DB.Begin()
	var variantIDs []uint
	tx.Model(&models.ProductVariant{}).Where("product_id = ?", c.Param("id")).Pluck("id", &variantIDs)
	if len(variantIDs) > 0 {
		if err := tx.Where("product_variant_id IN ?", variantIDs).Delete(&models.ProductGroupItem{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := tx.Where("product_id = ?", c.Param("id")).Delete(&models.ProductVariant{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	if err := tx.Delete(&models.Product{}, c.Param("id")).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted"})
}

// ==================== PRODUCT VARIANTS (e.g. Lensa Power +2.50) ====================

func GetVariants(c *gin.Context) {
	var variants []models.ProductVariant
	query := database.DB.Preload("Product.Category").Order("sku ASC")
	if productID := c.Query("product_id"); productID != "" {
		query = query.Where("product_id = ?", productID)
	}
	if catID := c.Query("category_id"); catID != "" {
		query = query.Joins("JOIN products p ON p.id = product_variants.product_id").Where("p.category_id = ?", catID)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Joins("LEFT JOIN products p2 ON p2.id = product_variants.product_id").
			Where("product_variants.sku ILIKE ? OR product_variants.variant_name ILIKE ? OR product_variants.barcode ILIKE ? OR p2.name ILIKE ? OR p2.alternative_name ILIKE ? OR p2.sku_prefix ILIKE ?", like, like, like, like, like, like)
	}
	if err := query.Find(&variants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var stockRows []struct {
		ProductVariantID uint
		Total            int64
	}
	database.DB.Model(&models.StockUnit{}).
		Select("product_variant_id, COUNT(*) as total").
		Where("status = ?", "in_stock").
		Group("product_variant_id").
		Scan(&stockRows)
	stockMap := make(map[uint]int64, len(stockRows))
	for _, r := range stockRows {
		stockMap[r.ProductVariantID] = r.Total
	}
	for i := range variants {
		variants[i].StockCount = stockMap[variants[i].ID]
	}

	c.JSON(http.StatusOK, gin.H{"data": variants})
}

func GetVariantDetail(c *gin.Context) {
	var variant models.ProductVariant
	if err := database.DB.Preload("Product.Category").First(&variant, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Variant not found"})
		return
	}

	var batches []models.ProductBatch
	database.DB.Preload("Supplier").
		Where("product_variant_id = ?", variant.ID).
		Order("expired_date ASC").
		Find(&batches)

	now := time.Now()
	for i := range batches {
		batches[i].EDStatus, batches[i].DaysToExpiry = classifyED(batches[i].ExpiredDate, now)
	}

	var units []models.StockUnit
	unitQuery := database.DB.Preload("ProductBatch").Where("product_variant_id = ?", variant.ID).Order("id DESC")
	if st := c.Query("status"); st != "" {
		unitQuery = unitQuery.Where("status = ?", st)
	}
	unitQuery.Find(&units)

	var inStockCount int64
	database.DB.Model(&models.StockUnit{}).
		Where("product_variant_id = ? AND status = ?", variant.ID, "in_stock").
		Count(&inStockCount)
	variant.StockCount = inStockCount

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"variant": variant,
			"batches": batches,
			"units":   units,
		},
	})
}

type VariantRequest struct {
	ProductID       uint    `json:"product_id" binding:"required"`
	SKU             string  `json:"sku" binding:"required"`
	VariantName     string  `json:"variant_name" binding:"required"`
	Attributes      string  `json:"attributes"`
	BuyPrice        float64 `json:"buy_price"`
	SellPrice       float64 `json:"sell_price"`
	FeeProductType  string  `json:"fee_product_type"`
	FeeProductValue float64 `json:"fee_product_value"`
	Barcode         string  `json:"barcode"`
	IsActive        *bool   `json:"is_active"`
}

func CreateVariant(c *gin.Context) {
	var req VariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	attrs := strings.TrimSpace(req.Attributes)
	if attrs == "" {
		attrs = "{}"
	}
	feeType := req.FeeProductType
	if feeType == "" {
		feeType = "fixed"
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	v := models.ProductVariant{
		ProductID:       req.ProductID,
		SKU:             strings.ToUpper(strings.TrimSpace(req.SKU)),
		VariantName:     strings.TrimSpace(req.VariantName),
		Attributes:      attrs,
		BuyPrice:        req.BuyPrice,
		SellPrice:       req.SellPrice,
		FeeProductType:  feeType,
		FeeProductValue: req.FeeProductValue,
		Barcode:         strings.TrimSpace(req.Barcode),
		IsActive:        isActive,
	}
	tx := database.DB.Begin()
	var parentProd models.Product
	if err := tx.First(&parentProd, req.ProductID).Error; err == nil && !parentProd.HasVariants {
		parentProd.HasVariants = true
		if err := tx.Save(&parentProd).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		var defVariants []models.ProductVariant
		tx.Where("product_id = ? AND is_default = ?", parentProd.ID, true).Find(&defVariants)
		for _, dv := range defVariants {
			if variantHasDependencies(tx, dv.ID) {
				dv.IsDefault = false
				tx.Save(&dv)
			} else {
				tx.Delete(&dv)
			}
		}
	}
	if err := tx.Create(&v).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()
	database.DB.Preload("Product.Category").First(&v, v.ID)
	c.JSON(http.StatusCreated, gin.H{"data": v})
}

func UpdateVariant(c *gin.Context) {
	var v models.ProductVariant
	if err := database.DB.First(&v, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Variant not found"})
		return
	}
	var req VariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	v.ProductID = req.ProductID
	v.SKU = strings.ToUpper(strings.TrimSpace(req.SKU))
	v.VariantName = strings.TrimSpace(req.VariantName)
	if strings.TrimSpace(req.Attributes) != "" {
		v.Attributes = req.Attributes
	}
	v.BuyPrice = req.BuyPrice
	v.SellPrice = req.SellPrice
	if req.FeeProductType != "" {
		v.FeeProductType = req.FeeProductType
	}
	v.FeeProductValue = req.FeeProductValue
	v.Barcode = strings.TrimSpace(req.Barcode)
	if req.IsActive != nil {
		v.IsActive = *req.IsActive
	}
	if err := database.DB.Save(&v).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Preload("Product.Category").First(&v, v.ID)
	c.JSON(http.StatusOK, gin.H{"data": v})
}

func DeleteVariant(c *gin.Context) {
	var cnt int64
	database.DB.Model(&models.StockUnit{}).Where("product_variant_id = ?", c.Param("id")).Count(&cnt)
	if cnt > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete variant that already has stock units"})
		return
	}
	var purCnt int64
	database.DB.Model(&models.PurchaseItem{}).
		Joins("JOIN purchases p ON p.id = purchase_items.purchase_id").
		Where("purchase_items.product_variant_id = ? AND p.deleted_at IS NULL", c.Param("id")).
		Count(&purCnt)
	if purCnt > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete variant referenced by active purchases"})
		return
	}

	tx := database.DB.Begin()
	if err := tx.Where("product_variant_id = ?", c.Param("id")).Delete(&models.ProductGroupItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := tx.Delete(&models.ProductVariant{}, c.Param("id")).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Variant deleted"})
}

// ==================== PRODUCT GROUPS (Pengelompokan Barang) ====================

func GetProductGroups(c *gin.Context) {
	var groups []models.ProductGroup
	if err := database.DB.Preload("Items.ProductVariant.Product.Category").Order("name ASC").Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": groups})
}

func GetProductGroup(c *gin.Context) {
	var group models.ProductGroup
	if err := database.DB.Preload("Items.ProductVariant.Product.Category").First(&group, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product group not found"})
		return
	}
	for i := range group.Items {
		if group.Items[i].ProductVariant != nil {
			var cnt int64
			database.DB.Model(&models.StockUnit{}).
				Where("product_variant_id = ? AND status = ?", group.Items[i].ProductVariantID, "in_stock").
				Count(&cnt)
			group.Items[i].ProductVariant.StockCount = cnt
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": group})
}

type ProductGroupItemReq struct {
	ProductVariantID uint `json:"product_variant_id" binding:"required"`
	DefaultQty       int  `json:"default_qty"`
}

type ProductGroupRequest struct {
	Code        string                `json:"code" binding:"required"`
	Name        string                `json:"name" binding:"required"`
	GroupType   string                `json:"group_type"`
	Description string                `json:"description"`
	IsActive    *bool                 `json:"is_active"`
	Items       []ProductGroupItemReq `json:"items"`
}

func CreateProductGroup(c *gin.Context) {
	var req ProductGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	groupType := req.GroupType
	if groupType == "" {
		groupType = "attribute_group"
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	grp := models.ProductGroup{
		Code:        strings.ToUpper(strings.TrimSpace(req.Code)),
		Name:        strings.TrimSpace(req.Name),
		GroupType:   groupType,
		Description: req.Description,
		IsActive:    isActive,
	}
	for _, it := range req.Items {
		qty := it.DefaultQty
		if qty <= 0 {
			qty = 1
		}
		grp.Items = append(grp.Items, models.ProductGroupItem{
			ProductVariantID: it.ProductVariantID,
			DefaultQty:       qty,
		})
	}
	if err := database.DB.Create(&grp).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Preload("Items.ProductVariant.Product").First(&grp, grp.ID)
	c.JSON(http.StatusCreated, gin.H{"data": grp})
}

func UpdateProductGroup(c *gin.Context) {
	var grp models.ProductGroup
	if err := database.DB.First(&grp, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product group not found"})
		return
	}
	var req ProductGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	grp.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	grp.Name = strings.TrimSpace(req.Name)
	if req.GroupType != "" {
		grp.GroupType = req.GroupType
	}
	grp.Description = req.Description
	if req.IsActive != nil {
		grp.IsActive = *req.IsActive
	}
	if err := tx.Save(&grp).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Items != nil {
		if err := tx.Where("product_group_id = ?", grp.ID).Delete(&models.ProductGroupItem{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		for _, it := range req.Items {
			qty := it.DefaultQty
			if qty <= 0 {
				qty = 1
			}
			item := models.ProductGroupItem{
				ProductGroupID:   grp.ID,
				ProductVariantID: it.ProductVariantID,
				DefaultQty:       qty,
			}
			if err := tx.Create(&item).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
		}
	}
	tx.Commit()
	database.DB.Preload("Items.ProductVariant.Product").First(&grp, grp.ID)
	c.JSON(http.StatusOK, gin.H{"data": grp})
}

func DeleteProductGroup(c *gin.Context) {
	if err := database.DB.Delete(&models.ProductGroup{}, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Product group deleted"})
}

// ==================== PUBLIC CATALOG (COMPANY PROFILE) ====================

type PublicVariantItem struct {
	ID          uint    `json:"id"`
	SKU         string  `json:"sku"`
	VariantName string  `json:"variant_name"`
	IsDefault   bool    `json:"is_default"`
	Attributes  string  `json:"attributes"`
	SellPrice   float64 `json:"sell_price"`
	StockCount  int64   `json:"stock_count"`
}

type PublicProductItem struct {
	ID              uint                `json:"id"`
	CategoryID      uint                `json:"category_id"`
	BrandID         *uint               `json:"brand_id"`
	SKUPrefix       string              `json:"sku_prefix"`
	Name            string              `json:"name"`
	AlternativeName string              `json:"alternative_name"`
	Brand           string              `json:"brand"`
	AKLNumber       string              `json:"akl_number"`
	UnitName        string              `json:"unit_name"`
	HasVariants     bool                `json:"has_variants"`
	Description     string              `json:"description"`
	CategoryName    string              `json:"category_name"`
	MinPrice        float64             `json:"min_price"`
	MaxPrice        float64             `json:"max_price"`
	TotalStock      int64               `json:"total_stock"`
	Variants        []PublicVariantItem `json:"variants"`
}

func GetPublicCatalog(c *gin.Context) {
	var categories []models.Category
	database.DB.Where("is_active = ?", true).Order("name ASC").Find(&categories)

	var brands []models.Brand
	database.DB.Where("is_active = ?", true).Order("name ASC").Find(&brands)

	var products []models.Product
	database.DB.
		Preload("Category").
		Preload("BrandInfo").
		Preload("Variants", func(db *gorm.DB) *gorm.DB {
			return db.Where("is_active = ?", true).Order("id ASC")
		}).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&products)

	// Aggregate in_stock unit counts per variant
	var stockRows []struct {
		ProductVariantID uint
		Cnt              int64
	}
	database.DB.Model(&models.StockUnit{}).
		Select("product_variant_id, COUNT(*) as cnt").
		Where("status = ?", "in_stock").
		Group("product_variant_id").
		Scan(&stockRows)

	stockMap := make(map[uint]int64, len(stockRows))
	for _, r := range stockRows {
		stockMap[r.ProductVariantID] = r.Cnt
	}

	publicProducts := make([]PublicProductItem, 0, len(products))
	var totalVariantsCount int64
	var totalReadyUnits int64

	for _, p := range products {
		pVars := make([]PublicVariantItem, 0, len(p.Variants))
		var minPrice, maxPrice float64
		var prodStock int64

		for i, v := range p.Variants {
			cnt := stockMap[v.ID]
			prodStock += cnt
			totalReadyUnits += cnt
			totalVariantsCount++

			if i == 0 || (v.SellPrice > 0 && (minPrice == 0 || v.SellPrice < minPrice)) {
				minPrice = v.SellPrice
			}
			if v.SellPrice > maxPrice {
				maxPrice = v.SellPrice
			}

			pVars = append(pVars, PublicVariantItem{
				ID:          v.ID,
				SKU:         v.SKU,
				VariantName: v.VariantName,
				IsDefault:   v.IsDefault,
				Attributes:  v.Attributes,
				SellPrice:   v.SellPrice,
				StockCount:  cnt,
			})
		}

		catName := ""
		if p.Category != nil {
			catName = p.Category.Name
		}
		brandName := p.Brand
		if brandName == "" && p.BrandInfo != nil {
			brandName = p.BrandInfo.Name
		}

		publicProducts = append(publicProducts, PublicProductItem{
			ID:              p.ID,
			CategoryID:      p.CategoryID,
			BrandID:         p.BrandID,
			SKUPrefix:       p.SKUPrefix,
			Name:            p.Name,
			AlternativeName: p.AlternativeName,
			Brand:           brandName,
			AKLNumber:       p.AKLNumber,
			UnitName:        p.UnitName,
			HasVariants:     p.HasVariants,
			Description:     p.Description,
			CategoryName:    catName,
			MinPrice:        minPrice,
			MaxPrice:        maxPrice,
			TotalStock:      prodStock,
			Variants:        pVars,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"categories": categories,
			"brands":     brands,
			"products":   publicProducts,
			"stats": gin.H{
				"total_products":   len(publicProducts),
				"total_variants":   totalVariantsCount,
				"total_categories": len(categories),
				"total_brands":     len(brands),
				"total_ready_units": totalReadyUnits,
			},
		},
	})
}
