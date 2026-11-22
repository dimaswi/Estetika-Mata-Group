package handlers

import (
	"net/http"
	"starter/backend/database"
	"starter/backend/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func GetPurchases(c *gin.Context) {
	var purchases []models.Purchase
	query := database.DB.
		Preload("Supplier").
		Preload("Items.ProductVariant.Product").
		Preload("Payments").
		Order("purchase_date DESC, id DESC")

	if supplierID := c.Query("supplier_id"); supplierID != "" {
		query = query.Where("supplier_id = ?", supplierID)
	}
	if status := c.Query("payment_status"); status != "" {
		query = query.Where("payment_status = ?", status)
	}
	if receiveStatus := c.Query("receive_status"); receiveStatus != "" {
		query = query.Where("receive_status = ?", receiveStatus)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("invoice_number ILIKE ?", like)
	}
	if err := query.Find(&purchases).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	for i := range purchases {
		recalcPurchasePaymentStatus(&purchases[i], now)
	}

	c.JSON(http.StatusOK, gin.H{"data": purchases})
}

func GetPurchase(c *gin.Context) {
	var purchase models.Purchase
	if err := database.DB.
		Preload("Supplier").
		Preload("Items.ProductVariant.Product.Category").
		Preload("Payments").
		First(&purchase, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}
	recalcPurchasePaymentStatus(&purchase, time.Now())
	c.JSON(http.StatusOK, gin.H{"data": purchase})
}

type PurchaseItemInput struct {
	ProductVariantID uint    `json:"product_variant_id" binding:"required"`
	QtyOrdered       int     `json:"qty_ordered" binding:"required,min=1"`
	UnitCost         float64 `json:"unit_cost" binding:"min=0"`
	DiscountAmount   float64 `json:"discount_amount" binding:"min=0"`
}

type CreatePurchaseRequest struct {
	InvoiceNumber  string              `json:"invoice_number" binding:"required"`
	SupplierID     uint                `json:"supplier_id" binding:"required"`
	PurchaseDate   string              `json:"purchase_date" binding:"required"`
	PaymentType    string              `json:"payment_type" binding:"required"` // cash | termin
	TermDays       int                 `json:"term_days"`
	DiscountAmount float64             `json:"discount_amount"`
	TaxAmount      float64             `json:"tax_amount"`
	PayImmediately bool                `json:"pay_immediately"`
	PaymentMethod  string              `json:"payment_method"`
	Notes          string              `json:"notes"`
	Items          []PurchaseItemInput `json:"items" binding:"required,min=1"`
}

func CreatePurchase(c *gin.Context) {
	var req CreatePurchaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	purchaseDate, err := parseDateFlexible(req.PurchaseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paymentType := strings.ToLower(strings.TrimSpace(req.PaymentType))
	if paymentType != "cash" && paymentType != "termin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_type must be 'cash' or 'termin'"})
		return
	}

	var dueDate *time.Time
	termDays := req.TermDays
	if paymentType == "termin" {
		if termDays <= 0 {
			var sup models.Supplier
			if err := database.DB.First(&sup, req.SupplierID).Error; err == nil && sup.DefaultTermDays > 0 {
				termDays = sup.DefaultTermDays
			} else {
				termDays = 30
			}
		}
		dd := purchaseDate.AddDate(0, 0, termDays)
		dueDate = &dd
	} else {
		termDays = 0
	}

	var subtotal float64
	items := make([]models.PurchaseItem, 0, len(req.Items))
	for _, it := range req.Items {
		lineSub := float64(it.QtyOrdered)*it.UnitCost - it.DiscountAmount
		if lineSub < 0 {
			lineSub = 0
		}
		subtotal += lineSub
		items = append(items, models.PurchaseItem{
			ProductVariantID: it.ProductVariantID,
			QtyOrdered:       it.QtyOrdered,
			UnitCost:         it.UnitCost,
			DiscountAmount:   it.DiscountAmount,
			Subtotal:         lineSub,
		})
	}

	totalAmount := subtotal - req.DiscountAmount + req.TaxAmount
	if totalAmount < 0 {
		totalAmount = 0
	}

	uid := getCurrentUserID(c)
	purchase := models.Purchase{
		InvoiceNumber:  strings.ToUpper(strings.TrimSpace(req.InvoiceNumber)),
		SupplierID:     req.SupplierID,
		PurchaseDate:   purchaseDate,
		PaymentType:    paymentType,
		TermDays:       termDays,
		DueDate:        dueDate,
		Subtotal:       subtotal,
		DiscountAmount: req.DiscountAmount,
		TaxAmount:      req.TaxAmount,
		TotalAmount:    totalAmount,
		ReceiveStatus:  "draft",
		Notes:          req.Notes,
		CreatedBy:      uid,
		Items:          items,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&purchase).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if (paymentType == "cash" || req.PayImmediately) && totalAmount > 0 {
		method := req.PaymentMethod
		if method == "" {
			method = "cash"
		}
		pmt := models.SupplierPayment{
			PurchaseID:    purchase.ID,
			PaymentDate:   purchaseDate,
			Amount:        totalAmount,
			PaymentMethod: method,
			Notes:         "Pembayaran awal pembelian",
			CreatedBy:     uid,
		}
		if err := tx.Create(&pmt).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		purchase.PaidAmount = totalAmount
	}

	recalcPurchasePaymentStatus(&purchase, time.Now())
	if err := tx.Save(&purchase).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()

	database.DB.Preload("Supplier").Preload("Items.ProductVariant.Product").Preload("Payments").First(&purchase, purchase.ID)
	c.JSON(http.StatusCreated, gin.H{"data": purchase})
}

type AddSupplierPaymentRequest struct {
	PaymentDate   string  `json:"payment_date" binding:"required"`
	Amount        float64 `json:"amount" binding:"required,gt=0"`
	PaymentMethod string  `json:"payment_method" binding:"required"`
	ReferenceNo   string  `json:"reference_no"`
	Notes         string  `json:"notes"`
}

func AddSupplierPayment(c *gin.Context) {
	var purchase models.Purchase
	if err := database.DB.First(&purchase, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}

	var req AddSupplierPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pmtDate, err := parseDateFlexible(req.PaymentDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	remaining := (purchase.TotalAmount + purchase.PenaltyAmount) - purchase.PaidAmount
	if req.Amount > remaining+0.01 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment amount exceeds remaining balance"})
		return
	}

	tx := database.DB.Begin()
	pmt := models.SupplierPayment{
		PurchaseID:    purchase.ID,
		PaymentDate:   pmtDate,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		ReferenceNo:   req.ReferenceNo,
		Notes:         req.Notes,
		CreatedBy:     getCurrentUserID(c),
	}
	if err := tx.Create(&pmt).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	purchase.PaidAmount += req.Amount
	recalcPurchasePaymentStatus(&purchase, time.Now())
	if err := tx.Save(&purchase).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()

	database.DB.Preload("Supplier").Preload("Items.ProductVariant.Product").Preload("Payments").First(&purchase, purchase.ID)
	c.JSON(http.StatusCreated, gin.H{"data": purchase})
}

func UpdatePurchase(c *gin.Context) {
	var purchase models.Purchase
	if err := database.DB.First(&purchase, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}
	if purchase.ReceiveStatus != "draft" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot edit purchase that already has scanned items"})
		return
	}

	var req CreatePurchaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	purchaseDate, err := parseDateFlexible(req.PurchaseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paymentType := strings.ToLower(strings.TrimSpace(req.PaymentType))
	if paymentType != "cash" && paymentType != "termin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_type must be 'cash' or 'termin'"})
		return
	}

	var dueDate *time.Time
	termDays := req.TermDays
	if paymentType == "termin" {
		if termDays <= 0 {
			termDays = 30
		}
		dd := purchaseDate.AddDate(0, 0, termDays)
		dueDate = &dd
	} else {
		termDays = 0
	}

	var subtotal float64
	items := make([]models.PurchaseItem, 0, len(req.Items))
	for _, it := range req.Items {
		lineSub := float64(it.QtyOrdered)*it.UnitCost - it.DiscountAmount
		if lineSub < 0 {
			lineSub = 0
		}
		subtotal += lineSub
		items = append(items, models.PurchaseItem{
			PurchaseID:       purchase.ID,
			ProductVariantID: it.ProductVariantID,
			QtyOrdered:       it.QtyOrdered,
			UnitCost:         it.UnitCost,
			DiscountAmount:   it.DiscountAmount,
			Subtotal:         lineSub,
		})
	}

	totalAmount := subtotal - req.DiscountAmount + req.TaxAmount
	if totalAmount < 0 {
		totalAmount = 0
	}

	tx := database.DB.Begin()
	if err := tx.Where("purchase_id = ?", purchase.ID).Delete(&models.PurchaseItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	purchase.InvoiceNumber = strings.ToUpper(strings.TrimSpace(req.InvoiceNumber))
	purchase.SupplierID = req.SupplierID
	purchase.PurchaseDate = purchaseDate
	purchase.PaymentType = paymentType
	purchase.TermDays = termDays
	purchase.DueDate = dueDate
	purchase.Subtotal = subtotal
	purchase.DiscountAmount = req.DiscountAmount
	purchase.TaxAmount = req.TaxAmount
	purchase.TotalAmount = totalAmount
	purchase.Notes = req.Notes
	recalcPurchasePaymentStatus(&purchase, time.Now())

	if err := tx.Save(&purchase).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for i := range items {
		if err := tx.Create(&items[i]).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}
	tx.Commit()

	database.DB.Preload("Supplier").Preload("Items.ProductVariant.Product").Preload("Payments").First(&purchase, purchase.ID)
	c.JSON(http.StatusOK, gin.H{"data": purchase})
}

func DeletePurchase(c *gin.Context) {
	var purchase models.Purchase
	if err := database.DB.First(&purchase, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}
	if purchase.ReceiveStatus != "draft" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete purchase that already has scanned items"})
		return
	}
	if purchase.PaidAmount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete purchase that already has payments"})
		return
	}
	if err := database.DB.Delete(&purchase).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Purchase deleted"})
}
