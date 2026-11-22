package handlers

import (
	"fmt"
	"net/http"
	"starter/backend/database"
	"starter/backend/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type InventorySummaryRow struct {
	VariantID     uint       `json:"variant_id"`
	SKU           string     `json:"sku"`
	VariantName   string     `json:"variant_name"`
	IsDefault     bool       `json:"is_default"`
	Attributes    string     `json:"attributes"`
	ProductID     uint       `json:"product_id"`
	ProductName   string     `json:"product_name"`
	HasVariants   bool       `json:"has_variants"`
	Brand         string     `json:"brand"`
	UnitName      string     `json:"unit_name"`
	MinStockAlert int        `json:"min_stock_alert"`
	CategoryID    uint       `json:"category_id"`
	CategoryName  string     `json:"category_name"`
	InStockCount  int64      `json:"in_stock_count"`
	BatchesCount  int64      `json:"batches_count"`
	NearestED     *time.Time `json:"nearest_ed"`
	EDStatus      string     `json:"ed_status"`
	DaysToExpiry  int        `json:"days_to_expiry"`
	IsLowStock    bool       `json:"is_low_stock"`
	BuyPrice      float64    `json:"buy_price"`
	SellPrice     float64    `json:"sell_price"`
}

func GetInventorySummary(c *gin.Context) {
	var variants []models.ProductVariant
	query := database.DB.Preload("Product.Category").Order("sku ASC")
	if catID := c.Query("category_id"); catID != "" {
		query = query.Joins("JOIN products p ON p.id = product_variants.product_id").Where("p.category_id = ?", catID)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Joins("LEFT JOIN products p2 ON p2.id = product_variants.product_id").
			Where("product_variants.sku ILIKE ? OR product_variants.variant_name ILIKE ? OR p2.name ILIKE ?", like, like, like)
	}
	if err := query.Find(&variants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var batchAgg []struct {
		ProductVariantID uint
		BatchesCount     int64
		NearestED        *time.Time
		TotalAvail       int64
	}
	database.DB.Model(&models.ProductBatch{}).
		Select("product_variant_id, COUNT(*) as batches_count, MIN(expired_date) as nearest_ed, COALESCE(SUM(qty_available),0) as total_avail").
		Where("qty_available > 0").
		Group("product_variant_id").
		Scan(&batchAgg)

	aggMap := make(map[uint]struct {
		batches int64
		ed      *time.Time
		avail   int64
	}, len(batchAgg))
	for _, b := range batchAgg {
		aggMap[b.ProductVariantID] = struct {
			batches int64
			ed      *time.Time
			avail   int64
		}{b.BatchesCount, b.NearestED, b.TotalAvail}
	}

	now := time.Now()
	rows := make([]InventorySummaryRow, 0, len(variants))
	for _, v := range variants {
		if v.Product == nil {
			continue
		}
		catName := ""
		if v.Product.Category != nil {
			catName = v.Product.Category.Name
		}
		a := aggMap[v.ID]
		edStatus := "none"
		days := 0
		if a.ed != nil {
			edStatus, days = classifyED(*a.ed, now)
		}
		rows = append(rows, InventorySummaryRow{
			VariantID:     v.ID,
			SKU:           v.SKU,
			VariantName:   v.VariantName,
			IsDefault:     v.IsDefault,
			Attributes:    v.Attributes,
			ProductID:     v.ProductID,
			ProductName:   v.Product.Name,
			HasVariants:   v.Product.HasVariants,
			Brand:         v.Product.Brand,
			UnitName:      v.Product.UnitName,
			MinStockAlert: v.Product.MinStockAlert,
			CategoryID:    v.Product.CategoryID,
			CategoryName:  catName,
			InStockCount:  a.avail,
			BatchesCount:  a.batches,
			NearestED:     a.ed,
			EDStatus:      edStatus,
			DaysToExpiry:  days,
			IsLowStock:    int(a.avail) <= v.Product.MinStockAlert,
			BuyPrice:      v.BuyPrice,
			SellPrice:     v.SellPrice,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": rows})
}

func GetBatches(c *gin.Context) {
	var batches []models.ProductBatch
	query := database.DB.
		Preload("ProductVariant.Product.Category").
		Preload("Supplier").
		Order("expired_date ASC, id ASC")

	if variantID := c.Query("variant_id"); variantID != "" {
		query = query.Where("product_variant_id = ?", variantID)
	}
	if supplierID := c.Query("supplier_id"); supplierID != "" {
		query = query.Where("supplier_id = ?", supplierID)
	}
	if c.Query("only_available") == "true" {
		query = query.Where("qty_available > 0")
	}
	if err := query.Find(&batches).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	edFilter := c.Query("ed_status")
	filtered := make([]models.ProductBatch, 0, len(batches))
	for i := range batches {
		batches[i].EDStatus, batches[i].DaysToExpiry = classifyED(batches[i].ExpiredDate, now)
		if edFilter != "" && edFilter != "all" && batches[i].EDStatus != edFilter {
			continue
		}
		filtered = append(filtered, batches[i])
	}

	c.JSON(http.StatusOK, gin.H{"data": filtered})
}

func GetStockUnits(c *gin.Context) {
	var units []models.StockUnit
	query := database.DB.
		Preload("ProductVariant.Product.Category").
		Preload("ProductBatch").
		Order("id DESC")

	if variantID := c.Query("variant_id"); variantID != "" {
		query = query.Where("product_variant_id = ?", variantID)
	}
	if batchID := c.Query("batch_id"); batchID != "" {
		query = query.Where("product_batch_id = ?", batchID)
	}
	if status := c.Query("status"); status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("unit_code ILIKE ? OR serial_number ILIKE ?", like, like)
	}
	if err := query.Limit(500).Find(&units).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	now := time.Now()
	for i := range units {
		if units[i].ProductBatch != nil {
			units[i].ProductBatch.EDStatus, units[i].ProductBatch.DaysToExpiry = classifyED(units[i].ProductBatch.ExpiredDate, now)
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": units})
}

func LookupStockUnit(c *gin.Context) {
	code := strings.TrimSpace(c.Param("code"))
	var unit models.StockUnit
	if err := database.DB.
		Preload("ProductVariant.Product.Category").
		Preload("ProductBatch.Supplier").
		Where("unit_code = ? OR serial_number = ?", code, code).
		First(&unit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Unit barcode not found"})
		return
	}

	now := time.Now()
	edStatus := "unknown"
	daysToExpiry := 0
	var earlierBatch *models.ProductBatch

	if unit.ProductBatch != nil {
		edStatus, daysToExpiry = classifyED(unit.ProductBatch.ExpiredDate, now)
		unit.ProductBatch.EDStatus = edStatus
		unit.ProductBatch.DaysToExpiry = daysToExpiry

		// Check if there is an earlier-expiring valid batch for FEFO recommendation
		var fefo models.ProductBatch
		if err := database.DB.
			Where("product_variant_id = ? AND qty_available > 0 AND expired_date >= ? AND expired_date < ?",
				unit.ProductVariantID,
				time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC),
				unit.ProductBatch.ExpiredDate,
			).
			Order("expired_date ASC").
			First(&fefo).Error; err == nil {
			earlierBatch = &fefo
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"unit":               unit,
			"ed_status":          edStatus,
			"days_to_expiry":     daysToExpiry,
			"fefo_earlier_batch": earlierBatch,
		},
	})
}

type ScanInRequest struct {
	ProductVariantID  uint     `json:"product_variant_id" binding:"required"`
	SupplierID        *uint    `json:"supplier_id"`
	PurchaseID        *uint    `json:"purchase_id"`
	PurchaseItemID    *uint    `json:"purchase_item_id"`
	BatchNumber       string   `json:"batch_number" binding:"required"`
	ExpiredDate       string   `json:"expired_date" binding:"required"`
	UnitCost          float64  `json:"unit_cost"`
	Location          string   `json:"location"`
	UnitCodes         []string `json:"unit_codes"`
	AutoGenerateCount int      `json:"auto_generate_count"`
	Notes             string   `json:"notes"`
}

func ScanIn(c *gin.Context) {
	var req ScanInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	expiredDate, err := parseDateFlexible(req.ExpiredDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var variant models.ProductVariant
	if err := database.DB.Preload("Product").First(&variant, req.ProductVariantID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product variant not found"})
		return
	}

	// Collect clean unit codes + auto-generated codes
	codes := make([]string, 0, len(req.UnitCodes)+req.AutoGenerateCount)
	seen := make(map[string]bool)
	for _, raw := range req.UnitCodes {
		code := strings.TrimSpace(raw)
		if code == "" || seen[code] {
			continue
		}
		seen[code] = true
		codes = append(codes, code)
	}
	for i := 1; i <= req.AutoGenerateCount; i++ {
		code := generateUnitCode(variant.SKU, req.BatchNumber, i)
		for seen[code] {
			code = generateUnitCode(variant.SKU, req.BatchNumber, i)
		}
		seen[code] = true
		codes = append(codes, code)
	}

	if len(codes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Provide at least one unit_code or auto_generate_count > 0"})
		return
	}

	if req.PurchaseItemID != nil {
		var pItem models.PurchaseItem
		if err := database.DB.First(&pItem, *req.PurchaseItemID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Purchase item not found"})
			return
		}
		remaining := pItem.QtyOrdered - pItem.QtyScannedIn
		if remaining <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Item pembelian ini sudah penuh di-scan masuk"})
			return
		}
		if len(codes) > remaining {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Jumlah scan (%d) melebihi sisa order (%d unit)", len(codes), remaining)})
			return
		}
	}

	// Ensure none of the unit_codes already exist
	var existingCount int64
	database.DB.Model(&models.StockUnit{}).Where("unit_code IN ?", codes).Count(&existingCount)
	if existingCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "One or more unit codes already exist in inventory"})
		return
	}

	now := time.Now()
	uid := getCurrentUserID(c)
	batchNo := strings.ToUpper(strings.TrimSpace(req.BatchNumber))
	unitCost := req.UnitCost
	if unitCost == 0 {
		unitCost = variant.BuyPrice
	}

	tx := database.DB.Begin()

	// Find or create matching batch
	var batch models.ProductBatch
	err = tx.Where("product_variant_id = ? AND batch_number = ? AND expired_date = ?",
		variant.ID, batchNo, expiredDate).First(&batch).Error
	if err == gorm.ErrRecordNotFound {
		batch = models.ProductBatch{
			ProductVariantID: variant.ID,
			SupplierID:       req.SupplierID,
			PurchaseID:       req.PurchaseID,
			BatchNumber:      batchNo,
			ExpiredDate:      expiredDate,
			ReceivedDate:     now,
			UnitCost:         unitCost,
			QtyInitial:       len(codes),
			QtyAvailable:     len(codes),
			Notes:            req.Notes,
		}
		if err := tx.Create(&batch).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	} else if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else {
		batch.QtyInitial += len(codes)
		batch.QtyAvailable += len(codes)
		if err := tx.Save(&batch).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	refType := "manual"
	if req.PurchaseID != nil {
		refType = "purchase"
	}

	createdUnits := make([]models.StockUnit, 0, len(codes))
	for _, code := range codes {
		unit := models.StockUnit{
			ProductVariantID: variant.ID,
			ProductBatchID:   batch.ID,
			UnitCode:         code,
			Status:           "in_stock",
			Location:         req.Location,
			ScannedInAt:      now,
			ScannedInBy:      uid,
		}
		if err := tx.Create(&unit).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		mv := models.StockMovement{
			StockUnitID:      unit.ID,
			ProductBatchID:   batch.ID,
			ProductVariantID: variant.ID,
			MovementType:     "scan_in",
			ReferenceType:    refType,
			ReferenceID:      req.PurchaseID,
			PerformedBy:      uid,
			Notes:            req.Notes,
		}
		if err := tx.Create(&mv).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		createdUnits = append(createdUnits, unit)
	}

	// Update linked PurchaseItem & Purchase receive status
	if req.PurchaseItemID != nil {
		var pItem models.PurchaseItem
		if err := tx.First(&pItem, *req.PurchaseItemID).Error; err == nil {
			pItem.QtyScannedIn += len(codes)
			if err := tx.Save(&pItem).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}
	if req.PurchaseID != nil {
		var purchase models.Purchase
		if err := tx.Preload("Items").First(&purchase, *req.PurchaseID).Error; err == nil {
			allComplete := true
			anyScanned := false
			for _, it := range purchase.Items {
				if it.QtyScannedIn > 0 {
					anyScanned = true
				}
				if it.QtyScannedIn < it.QtyOrdered {
					allComplete = false
				}
			}
			if allComplete && len(purchase.Items) > 0 {
				purchase.ReceiveStatus = "completed"
			} else if anyScanned {
				purchase.ReceiveStatus = "partial_scanned"
			}
			if err := tx.Save(&purchase).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}

	tx.Commit()
	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"batch":         batch,
			"scanned_count": len(createdUnits),
			"units":         createdUnits,
		},
	})
}

type ScanOutRequest struct {
	UnitCodes     []string `json:"unit_codes" binding:"required,min=1"`
	MovementType  string   `json:"movement_type"` // scan_out (default) | damaged | adjustment | mark_expired
	ReferenceType string   `json:"reference_type"`
	ReferenceID   *uint    `json:"reference_id"`
	SaleID        *uint    `json:"sale_id"`
	SaleItemID    *uint    `json:"sale_item_id"`
	Notes         string   `json:"notes"`
}

func ScanOut(c *gin.Context) {
	var req ScanOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mvType := req.MovementType
	if mvType == "" {
		mvType = "scan_out"
	}
	targetStatus := "sold"
	switch mvType {
	case "scan_out":
		targetStatus = "sold"
	case "damaged":
		targetStatus = "damaged"
	case "mark_expired":
		targetStatus = "expired"
	case "adjustment":
		targetStatus = "damaged"
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid movement_type"})
		return
	}

	if req.SaleID != nil && mvType == "scan_out" {
		var linkedSale models.Sale
		if err := database.DB.First(&linkedSale, *req.SaleID).Error; err == nil && linkedSale.PaymentType == "consignment" {
			targetStatus = "consignment"
			mvType = "consignment_out"
		}
	}

	now := time.Now()
	uid := getCurrentUserID(c)
	refType := req.ReferenceType
	if refType == "" {
		if req.SaleID != nil {
			refType = "sale"
		} else {
			refType = "manual"
		}
	}
	refID := req.ReferenceID
	if refID == nil && req.SaleID != nil {
		refID = req.SaleID
	}

	cleanCodes := make([]string, 0, len(req.UnitCodes))
	seenCodes := make(map[string]bool)
	for _, raw := range req.UnitCodes {
		code := strings.TrimSpace(raw)
		if code == "" || seenCodes[code] {
			continue
		}
		seenCodes[code] = true
		cleanCodes = append(cleanCodes, code)
	}
	if len(cleanCodes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Provide at least one unit code"})
		return
	}

	var expectedVariantID uint
	if req.SaleItemID != nil {
		var sItem models.SaleItem
		if err := database.DB.First(&sItem, *req.SaleItemID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sale item not found"})
			return
		}
		remaining := sItem.QtyOrdered - sItem.QtyScannedOut
		if remaining <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Item penjualan ini sudah penuh di-scan keluar"})
			return
		}
		if len(cleanCodes) > remaining {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Jumlah scan (%d) melebihi sisa order item (%d unit)", len(cleanCodes), remaining)})
			return
		}
		expectedVariantID = sItem.ProductVariantID
	}

	tx := database.DB.Begin()
	processed := make([]models.StockUnit, 0, len(cleanCodes))

	for _, code := range cleanCodes {
		var unit models.StockUnit
		if err := tx.Preload("ProductBatch").Where("unit_code = ? OR serial_number = ?", code, code).First(&unit).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Unit code not found: %s", code)})
			return
		}
		if expectedVariantID > 0 && unit.ProductVariantID != expectedVariantID {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Unit %s tidak sesuai dengan produk/variasi yang dipilih", code)})
			return
		}
		if unit.Status != "in_stock" {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Unit %s is not in stock (status: %s)", code, unit.Status)})
			return
		}
		if unit.ProductBatch != nil && mvType == "scan_out" {
			edStatus, _ := classifyED(unit.ProductBatch.ExpiredDate, now)
			if edStatus == "expired" {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Unit %s (Batch %s) is EXPIRED and blocked from scan out", code, unit.ProductBatch.BatchNumber)})
				return
			}
		}

		unit.Status = targetStatus
		unit.ScannedOutAt = &now
		unit.ScannedOutBy = &uid
		if req.SaleID != nil {
			unit.SaleID = req.SaleID
			unit.SaleItemID = req.SaleItemID
		}
		if err := tx.Save(&unit).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := tx.Model(&models.ProductBatch{}).
			Where("id = ? AND qty_available > 0", unit.ProductBatchID).
			UpdateColumn("qty_available", gorm.Expr("qty_available - 1")).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		mv := models.StockMovement{
			StockUnitID:      unit.ID,
			ProductBatchID:   unit.ProductBatchID,
			ProductVariantID: unit.ProductVariantID,
			MovementType:     mvType,
			ReferenceType:    refType,
			ReferenceID:      refID,
			PerformedBy:      uid,
			Notes:            req.Notes,
		}
		if err := tx.Create(&mv).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		processed = append(processed, unit)
	}

	// Update linked SaleItem & Sale delivery status
	if req.SaleItemID != nil {
		var sItem models.SaleItem
		if err := tx.First(&sItem, *req.SaleItemID).Error; err == nil {
			sItem.QtyScannedOut += len(processed)
			if err := tx.Save(&sItem).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}
	if req.SaleID != nil {
		var sale models.Sale
		if err := tx.Preload("Items").First(&sale, *req.SaleID).Error; err == nil {
			allComplete := true
			anyScanned := false
			for _, it := range sale.Items {
				if it.QtyScannedOut > 0 {
					anyScanned = true
				}
				if it.QtyScannedOut < it.QtyOrdered {
					allComplete = false
				}
			}
			if allComplete && len(sale.Items) > 0 {
				sale.DeliveryStatus = "completed"
			} else if anyScanned {
				sale.DeliveryStatus = "partial_scanned"
			}
			if err := tx.Save(&sale).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"processed_count": len(processed),
			"units":           processed,
		},
	})
}

func GetStockMovements(c *gin.Context) {
	var movements []models.StockMovement
	query := database.DB.
		Preload("StockUnit").
		Preload("ProductBatch").
		Preload("ProductVariant.Product").
		Order("created_at DESC, id DESC")

	if mvType := c.Query("movement_type"); mvType != "" && mvType != "all" {
		query = query.Where("movement_type = ?", mvType)
	}
	if variantID := c.Query("variant_id"); variantID != "" {
		query = query.Where("product_variant_id = ?", variantID)
	}
	if err := query.Limit(300).Find(&movements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": movements})
}

type AdjustStockRequest struct {
	Mode              string   `json:"mode" binding:"required"` // add | subtract
	ProductVariantID  uint     `json:"product_variant_id" binding:"required"`
	BatchNumber       string   `json:"batch_number"`
	ExpiredDate       string   `json:"expired_date"`
	Location          string   `json:"location"`
	UnitCost          float64  `json:"unit_cost"`
	UnitCodes         []string `json:"unit_codes"`
	AutoGenerateCount int      `json:"auto_generate_count"`
	Qty               int      `json:"qty"`
	Reason            string   `json:"reason"`
	Notes             string   `json:"notes"`
}

func formatAdjustmentNote(reason, notes string) string {
	r := strings.TrimSpace(reason)
	n := strings.TrimSpace(notes)
	switch {
	case r != "" && n != "":
		return fmt.Sprintf("[%s] %s", r, n)
	case r != "":
		return fmt.Sprintf("[%s]", r)
	default:
		return n
	}
}

func AdjustStock(c *gin.Context) {
	var req AdjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if mode != "add" && mode != "subtract" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "mode must be 'add' or 'subtract'"})
		return
	}

	var variant models.ProductVariant
	if err := database.DB.First(&variant, req.ProductVariantID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product variant not found"})
		return
	}

	now := time.Now()
	uid := getCurrentUserID(c)
	noteText := formatAdjustmentNote(req.Reason, req.Notes)

	if mode == "add" {
		if strings.TrimSpace(req.BatchNumber) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No. Batch wajib diisi untuk penambahan stok"})
			return
		}
		expiredDate, err := parseDateFlexible(req.ExpiredDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		codes := make([]string, 0, len(req.UnitCodes)+req.AutoGenerateCount)
		seen := make(map[string]bool)
		for _, raw := range req.UnitCodes {
			code := strings.TrimSpace(raw)
			if code == "" || seen[code] {
				continue
			}
			seen[code] = true
			codes = append(codes, code)
		}
		for i := 1; i <= req.AutoGenerateCount; i++ {
			code := generateUnitCode(variant.SKU, req.BatchNumber, i)
			for seen[code] {
				code = generateUnitCode(variant.SKU, req.BatchNumber, i)
			}
			seen[code] = true
			codes = append(codes, code)
		}
		if len(codes) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Scan minimal 1 unit atau isi Auto QR (Qty)"})
			return
		}

		var existingCount int64
		database.DB.Model(&models.StockUnit{}).Where("unit_code IN ?", codes).Count(&existingCount)
		if existingCount > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Salah satu kode unit sudah terdaftar di inventory"})
			return
		}

		batchNo := strings.ToUpper(strings.TrimSpace(req.BatchNumber))
		unitCost := req.UnitCost
		if unitCost <= 0 {
			unitCost = variant.BuyPrice
		}
		loc := strings.TrimSpace(req.Location)
		if loc == "" {
			loc = "Gudang Utama"
		}

		tx := database.DB.Begin()
		var batch models.ProductBatch
		err = tx.Where("product_variant_id = ? AND batch_number = ? AND expired_date = ?",
			variant.ID, batchNo, expiredDate).First(&batch).Error
		if err == gorm.ErrRecordNotFound {
			batch = models.ProductBatch{
				ProductVariantID: variant.ID,
				BatchNumber:      batchNo,
				ExpiredDate:      expiredDate,
				ReceivedDate:     now,
				UnitCost:         unitCost,
				QtyInitial:       len(codes),
				QtyAvailable:     len(codes),
				Notes:            noteText,
			}
			if err := tx.Create(&batch).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		} else {
			batch.QtyInitial += len(codes)
			batch.QtyAvailable += len(codes)
			if err := tx.Save(&batch).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}

		units := make([]models.StockUnit, 0, len(codes))
		for _, code := range codes {
			unit := models.StockUnit{
				ProductVariantID: variant.ID,
				ProductBatchID:   batch.ID,
				UnitCode:         code,
				Status:           "in_stock",
				Location:         loc,
				ScannedInAt:      now,
				ScannedInBy:      uid,
			}
			if err := tx.Create(&unit).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			mv := models.StockMovement{
				StockUnitID:      unit.ID,
				ProductBatchID:   batch.ID,
				ProductVariantID: variant.ID,
				MovementType:     "adjustment",
				ReferenceType:    "manual",
				PerformedBy:      uid,
				Notes:            noteText,
			}
			if err := tx.Create(&mv).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			units = append(units, unit)
		}
		tx.Commit()
		c.JSON(http.StatusOK, gin.H{
			"data": gin.H{
				"mode":            "add",
				"processed_count": len(units),
				"units":           units,
			},
		})
		return
	}

	// mode == "subtract"
	reason := strings.ToLower(strings.TrimSpace(req.Reason))
	targetStatus := "adjusted_out"
	mvType := "adjustment"
	switch reason {
	case "damaged", "rusak":
		targetStatus = "damaged"
		mvType = "damaged"
	case "expired", "kadaluarsa":
		targetStatus = "expired"
		mvType = "mark_expired"
	}

	var targetUnits []models.StockUnit
	cleanCodes := make([]string, 0, len(req.UnitCodes))
	seen := make(map[string]bool)
	for _, raw := range req.UnitCodes {
		code := strings.TrimSpace(raw)
		if code == "" || seen[code] {
			continue
		}
		seen[code] = true
		cleanCodes = append(cleanCodes, code)
	}

	if len(cleanCodes) > 0 {
		for _, code := range cleanCodes {
			var u models.StockUnit
			if err := database.DB.Where("unit_code = ?", code).First(&u).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Unit %s tidak ditemukan", code)})
				return
			}
			if u.ProductVariantID != variant.ID {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Unit %s bukan milik variasi yang dipilih", code)})
				return
			}
			if u.Status != "in_stock" {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Unit %s berstatus %s (bukan in_stock)", code, u.Status)})
				return
			}
			targetUnits = append(targetUnits, u)
		}
	} else if req.Qty > 0 {
		if err := database.DB.
			Joins("JOIN product_batches pb ON pb.id = stock_units.product_batch_id").
			Where("stock_units.product_variant_id = ? AND stock_units.status = ?", variant.ID, "in_stock").
			Order("pb.expired_date ASC, stock_units.id ASC").
			Limit(req.Qty).
			Find(&targetUnits).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if len(targetUnits) < req.Qty {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Stok in_stock hanya %d unit, kurang dari permintaan (%d unit)", len(targetUnits), req.Qty)})
			return
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pilih/scan unit atau masukkan Qty pengurangan > 0"})
		return
	}

	tx := database.DB.Begin()
	for i := range targetUnits {
		u := &targetUnits[i]
		u.Status = targetStatus
		u.ScannedOutAt = &now
		u.ScannedOutBy = &uid
		if err := tx.Save(u).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if err := tx.Model(&models.ProductBatch{}).
			Where("id = ? AND qty_available > 0", u.ProductBatchID).
			UpdateColumn("qty_available", gorm.Expr("qty_available - 1")).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		mv := models.StockMovement{
			StockUnitID:      u.ID,
			ProductBatchID:   u.ProductBatchID,
			ProductVariantID: u.ProductVariantID,
			MovementType:     mvType,
			ReferenceType:    "manual",
			PerformedBy:      uid,
			Notes:            noteText,
		}
		if err := tx.Create(&mv).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"mode":            "subtract",
			"processed_count": len(targetUnits),
			"units":           targetUnits,
		},
	})
}
