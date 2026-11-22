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

func GetSales(c *gin.Context) {
	var sales []models.Sale
	query := database.DB.
		Preload("Customer").
		Preload("Items.ProductVariant.Product").
		Preload("Payments").
		Order("sale_date DESC, id DESC")

	if status := c.Query("payment_status"); status != "" {
		query = query.Where("payment_status = ?", status)
	}
	if deliveryStatus := c.Query("delivery_status"); deliveryStatus != "" {
		query = query.Where("delivery_status = ?", deliveryStatus)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("invoice_number ILIKE ? OR customer_name ILIKE ? OR doctor_name ILIKE ?", like, like, like)
	}
	if err := query.Find(&sales).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	for i := range sales {
		recalcSalePaymentStatus(&sales[i], now)
	}

	c.JSON(http.StatusOK, gin.H{"data": sales})
}

func GetSale(c *gin.Context) {
	var sale models.Sale
	if err := database.DB.
		Preload("Customer").
		Preload("Items.ProductVariant.Product.Category").
		Preload("Items.Units.ProductBatch").
		Preload("Payments").
		First(&sale, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}
	recalcSalePaymentStatus(&sale, time.Now())
	c.JSON(http.StatusOK, gin.H{"data": sale})
}

type SaleItemInput struct {
	ProductVariantID uint    `json:"product_variant_id" binding:"required"`
	QtyOrdered       int     `json:"qty_ordered" binding:"required,min=1"`
	UnitPrice        float64 `json:"unit_price" binding:"min=0"`
	DiscountAmount   float64 `json:"discount_amount" binding:"min=0"`
}

type CreateSaleRequest struct {
	InvoiceNumber   string          `json:"invoice_number" binding:"required"`
	CustomerID      *uint           `json:"customer_id"`
	CustomerName    string          `json:"customer_name"`
	CustomerPhone   string          `json:"customer_phone"`
	CustomerAddress string          `json:"customer_address"`
	DoctorName      string          `json:"doctor_name"`
	SaleDate        string          `json:"sale_date" binding:"required"`
	PaymentType     string          `json:"payment_type" binding:"required"` // cash | termin
	TermDays        int             `json:"term_days"`
	DiscountAmount  float64         `json:"discount_amount"`
	TaxAmount       float64         `json:"tax_amount"`
	PayImmediately  bool            `json:"pay_immediately"`
	PaymentMethod   string          `json:"payment_method"`
	Notes           string          `json:"notes"`
	Items           []SaleItemInput `json:"items" binding:"required,min=1"`
}

func resolveSaleCustomer(req *CreateSaleRequest) (string, string, string, error) {
	name := strings.TrimSpace(req.CustomerName)
	phone := strings.TrimSpace(req.CustomerPhone)
	addr := strings.TrimSpace(req.CustomerAddress)

	if req.CustomerID != nil && *req.CustomerID > 0 {
		var cust models.Customer
		if err := database.DB.First(&cust, *req.CustomerID).Error; err != nil {
			return "", "", "", err
		}
		if name == "" {
			name = cust.Name
		}
		if phone == "" {
			phone = cust.Phone
		}
		if addr == "" {
			parts := []string{}
			for _, p := range []string{cust.Address, cust.Subdistrict, cust.City, cust.Province, cust.PostalCode} {
				if strings.TrimSpace(p) != "" {
					parts = append(parts, strings.TrimSpace(p))
				}
			}
			addr = strings.Join(parts, ", ")
		}
	}
	return name, phone, addr, nil
}

func buildSaleItems(inputs []SaleItemInput, saleID uint) ([]models.SaleItem, float64) {
	var subtotal float64
	items := make([]models.SaleItem, 0, len(inputs))
	for _, it := range inputs {
		lineSub := float64(it.QtyOrdered)*it.UnitPrice - it.DiscountAmount
		if lineSub < 0 {
			lineSub = 0
		}
		subtotal += lineSub

		var feeAmt float64
		var v models.ProductVariant
		if err := database.DB.First(&v, it.ProductVariantID).Error; err == nil {
			if strings.ToLower(v.FeeProductType) == "percent" {
				feeAmt = lineSub * (v.FeeProductValue / 100.0)
			} else {
				feeAmt = v.FeeProductValue * float64(it.QtyOrdered)
			}
		}

		items = append(items, models.SaleItem{
			SaleID:           saleID,
			ProductVariantID: it.ProductVariantID,
			QtyOrdered:       it.QtyOrdered,
			UnitPrice:        it.UnitPrice,
			DiscountAmount:   it.DiscountAmount,
			Subtotal:         lineSub,
			FeeAmount:        feeAmt,
		})
	}
	return items, subtotal
}

func CreateSale(c *gin.Context) {
	var req CreateSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	saleDate, err := parseDateFlexible(req.SaleDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paymentType := strings.ToLower(strings.TrimSpace(req.PaymentType))
	if paymentType != "cash" && paymentType != "termin" && paymentType != "consignment" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_type must be 'cash', 'termin', or 'consignment'"})
		return
	}

	var dueDate *time.Time
	termDays := req.TermDays
	if paymentType == "termin" {
		if termDays <= 0 {
			termDays = 30
		}
		dd := saleDate.AddDate(0, 0, termDays)
		dueDate = &dd
	} else if paymentType == "consignment" {
		if termDays < 0 {
			termDays = 0
		}
	} else {
		termDays = 0
	}

	items, subtotal := buildSaleItems(req.Items, 0)
	totalAmount := subtotal - req.DiscountAmount + req.TaxAmount
	if totalAmount < 0 {
		totalAmount = 0
	}

	custName, custPhone, custAddr, err := resolveSaleCustomer(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Selected customer not found"})
		return
	}
	if custName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pelanggan wajib dipilih"})
		return
	}

	billableAmt := totalAmount
	if paymentType == "consignment" {
		billableAmt = 0
	}

	uid := getCurrentUserID(c)
	sale := models.Sale{
		InvoiceNumber:   strings.ToUpper(strings.TrimSpace(req.InvoiceNumber)),
		CustomerID:      req.CustomerID,
		CustomerName:    custName,
		CustomerPhone:   custPhone,
		CustomerAddress: custAddr,
		DoctorName:      strings.TrimSpace(req.DoctorName),
		SaleDate:        saleDate,
		PaymentType:     paymentType,
		TermDays:        termDays,
		DueDate:         dueDate,
		Subtotal:        subtotal,
		DiscountAmount:  req.DiscountAmount,
		TaxAmount:       req.TaxAmount,
		TotalAmount:     totalAmount,
		BillableAmount:  billableAmt,
		DeliveryStatus:  "draft",
		Notes:           req.Notes,
		CreatedBy:       uid,
		Items:           items,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&sale).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if paymentType != "consignment" && (paymentType == "cash" || req.PayImmediately) && totalAmount > 0 {
		method := req.PaymentMethod
		if method == "" {
			method = "cash"
		}
		pmt := models.SalePayment{
			SaleID:        sale.ID,
			PaymentDate:   saleDate,
			Amount:        totalAmount,
			PaymentMethod: method,
			Notes:         "Pembayaran awal penjualan",
			CreatedBy:     uid,
		}
		if err := tx.Create(&pmt).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		sale.PaidAmount = totalAmount
	}

	recalcSalePaymentStatus(&sale, time.Now())
	if err := tx.Save(&sale).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()

	database.DB.Preload("Customer").Preload("Items.ProductVariant.Product").Preload("Payments").First(&sale, sale.ID)
	c.JSON(http.StatusCreated, gin.H{"data": sale})
}

type AddSalePaymentRequest struct {
	PaymentDate   string  `json:"payment_date" binding:"required"`
	Amount        float64 `json:"amount" binding:"required,gt=0"`
	PaymentMethod string  `json:"payment_method" binding:"required"`
	ReferenceNo   string  `json:"reference_no"`
	Notes         string  `json:"notes"`
}

func AddSalePayment(c *gin.Context) {
	var sale models.Sale
	if err := database.DB.Preload("Items").First(&sale, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}

	var req AddSalePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	pmtDate, err := parseDateFlexible(req.PaymentDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	effectiveTotal := sale.TotalAmount
	if sale.PaymentType == "consignment" {
		effectiveTotal = sale.BillableAmount
		if effectiveTotal <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Belum ada produk terpakai yang dikonfirmasi untuk ditagihkan/dibayar"})
			return
		}
	}

	remaining := (effectiveTotal + sale.PenaltyAmount) - sale.PaidAmount
	if req.Amount > remaining+0.01 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment amount exceeds remaining balance"})
		return
	}

	tx := database.DB.Begin()
	pmt := models.SalePayment{
		SaleID:        sale.ID,
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

	sale.PaidAmount += req.Amount
	recalcSalePaymentStatus(&sale, time.Now())
	if err := tx.Save(&sale).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()

	database.DB.Preload("Customer").Preload("Items.ProductVariant.Product").Preload("Payments").First(&sale, sale.ID)
	c.JSON(http.StatusOK, gin.H{"data": sale})
}

func UpdateSale(c *gin.Context) {
	var sale models.Sale
	if err := database.DB.First(&sale, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}
	if sale.DeliveryStatus != "draft" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot edit sale that already has scanned out items"})
		return
	}

	var req CreateSaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	saleDate, err := parseDateFlexible(req.SaleDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	paymentType := strings.ToLower(strings.TrimSpace(req.PaymentType))
	if paymentType != "cash" && paymentType != "termin" && paymentType != "consignment" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_type must be 'cash', 'termin', or 'consignment'"})
		return
	}

	var dueDate *time.Time
	termDays := req.TermDays
	if paymentType == "termin" {
		if termDays <= 0 {
			termDays = 30
		}
		dd := saleDate.AddDate(0, 0, termDays)
		dueDate = &dd
	} else if paymentType == "consignment" {
		if termDays < 0 {
			termDays = 0
		}
	} else {
		termDays = 0
	}

	items, subtotal := buildSaleItems(req.Items, sale.ID)
	totalAmount := subtotal - req.DiscountAmount + req.TaxAmount
	if totalAmount < 0 {
		totalAmount = 0
	}

	custName, custPhone, custAddr, err := resolveSaleCustomer(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Selected customer not found"})
		return
	}
	if custName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pelanggan wajib dipilih"})
		return
	}

	tx := database.DB.Begin()
	if err := tx.Where("sale_id = ?", sale.ID).Delete(&models.SaleItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sale.InvoiceNumber = strings.ToUpper(strings.TrimSpace(req.InvoiceNumber))
	sale.CustomerID = req.CustomerID
	sale.CustomerName = custName
	sale.CustomerPhone = custPhone
	sale.CustomerAddress = custAddr
	sale.DoctorName = strings.TrimSpace(req.DoctorName)
	sale.SaleDate = saleDate
	sale.PaymentType = paymentType
	sale.TermDays = termDays
	sale.DueDate = dueDate
	sale.Subtotal = subtotal
	sale.DiscountAmount = req.DiscountAmount
	sale.TaxAmount = req.TaxAmount
	sale.TotalAmount = totalAmount
	if paymentType == "consignment" {
		sale.BillableAmount = 0
	} else {
		sale.BillableAmount = totalAmount
	}
	sale.Notes = req.Notes
	recalcSalePaymentStatus(&sale, time.Now())

	if err := tx.Save(&sale).Error; err != nil {
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

	database.DB.Preload("Customer").Preload("Items.ProductVariant.Product").Preload("Payments").First(&sale, sale.ID)
	c.JSON(http.StatusOK, gin.H{"data": sale})
}

func loadFullSale(id uint) (models.Sale, error) {
	var sale models.Sale
	err := database.DB.
		Preload("Customer").
		Preload("Items.ProductVariant.Product.Category").
		Preload("Items.Units.ProductBatch").
		Preload("Payments").
		First(&sale, id).Error
	if err == nil {
		recalcSalePaymentStatus(&sale, time.Now())
	}
	return sale, err
}

func DeleteSale(c *gin.Context) {
	var sale models.Sale
	if err := database.DB.First(&sale, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}
	if sale.DeliveryStatus != "draft" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete sale that already has scanned out items"})
		return
	}
	if sale.PaidAmount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete sale that already has payments"})
		return
	}
	if err := database.DB.Delete(&sale).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Sale deleted"})
}

type ConfirmSaleUsageRequest struct {
	UsageDate string   `json:"usage_date"`
	UnitCodes []string `json:"unit_codes"`
	TermDays  *int     `json:"term_days"`
	Notes     string   `json:"notes"`
}

func ConfirmSaleUsage(c *gin.Context) {
	var sale models.Sale
	if err := database.DB.Preload("Items").First(&sale, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}
	if sale.PaymentType != "consignment" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Konfirmasi pemakaian hanya berlaku untuk transaksi Konsinyasi"})
		return
	}

	var req ConfirmSaleUsageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	usageDate := time.Now()
	if strings.TrimSpace(req.UsageDate) != "" {
		parsed, err := parseDateFlexible(req.UsageDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		usageDate = parsed
	}

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
	if len(cleanCodes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pilih atau scan minimal 1 unit yang sudah dipakai pelanggan"})
		return
	}

	uid := getCurrentUserID(c)
	tx := database.DB.Begin()

	for _, code := range cleanCodes {
		var unit models.StockUnit
		if err := tx.Where("unit_code = ?", code).First(&unit).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Unit %s tidak ditemukan", code)})
			return
		}
		if unit.Status != "consignment" || unit.SaleID == nil || *unit.SaleID != sale.ID {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Unit %s tidak berstatus titipan aktif pada invoice ini", code)})
			return
		}
		unit.Status = "sold"
		if err := tx.Save(&unit).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if unit.SaleItemID != nil {
			var sItem models.SaleItem
			if err := tx.First(&sItem, *unit.SaleItemID).Error; err == nil {
				sItem.QtyUsed += 1
				if err := tx.Save(&sItem).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			}
		}

		mv := models.StockMovement{
			StockUnitID:      unit.ID,
			ProductBatchID:   unit.ProductBatchID,
			ProductVariantID: unit.ProductVariantID,
			MovementType:     "usage_confirmed",
			ReferenceType:    "sale",
			ReferenceID:      &sale.ID,
			PerformedBy:      uid,
			Notes:            req.Notes,
		}
		if err := tx.Create(&mv).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Reload items cleanly inside tx to compute new billable amount
	if err := tx.Preload("Items").First(&sale, sale.ID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	recalcSaleBillableAmount(&sale)
	sale.UsageConfirmedAt = &usageDate

	effectiveTerm := sale.TermDays
	if req.TermDays != nil && *req.TermDays >= 0 {
		effectiveTerm = *req.TermDays
		sale.TermDays = effectiveTerm
	}
	if effectiveTerm > 0 {
		dd := usageDate.AddDate(0, 0, effectiveTerm)
		sale.DueDate = &dd
	}
	recalcSalePaymentStatus(&sale, time.Now())

	if err := tx.Save(&sale).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()

	fullSale, _ := loadFullSale(sale.ID)
	c.JSON(http.StatusOK, gin.H{"data": fullSale})
}

type ReturnSaleConsignmentRequest struct {
	UnitCodes []string `json:"unit_codes" binding:"required,min=1"`
	Notes     string   `json:"notes"`
}

func ReturnSaleConsignment(c *gin.Context) {
	var sale models.Sale
	if err := database.DB.Preload("Items").First(&sale, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sale not found"})
		return
	}
	if sale.PaymentType != "consignment" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Retur barang titipan hanya berlaku untuk transaksi Konsinyasi"})
		return
	}

	var req ReturnSaleConsignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

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
	if len(cleanCodes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pilih minimal 1 unit untuk diretur ke gudang"})
		return
	}

	uid := getCurrentUserID(c)
	tx := database.DB.Begin()

	for _, code := range cleanCodes {
		var unit models.StockUnit
		if err := tx.Where("unit_code = ?", code).First(&unit).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Unit %s tidak ditemukan", code)})
			return
		}
		if unit.Status != "consignment" || unit.SaleID == nil || *unit.SaleID != sale.ID {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Unit %s tidak berstatus titipan aktif pada invoice ini", code)})
			return
		}

		if unit.SaleItemID != nil {
			var sItem models.SaleItem
			if err := tx.First(&sItem, *unit.SaleItemID).Error; err == nil {
				sItem.QtyReturned += 1
				if err := tx.Save(&sItem).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			}
		}

		unit.Status = "in_stock"
		unit.ScannedOutAt = nil
		unit.ScannedOutBy = nil
		unit.SaleID = nil
		unit.SaleItemID = nil
		if err := tx.Save(&unit).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := tx.Model(&models.ProductBatch{}).
			Where("id = ?", unit.ProductBatchID).
			UpdateColumn("qty_available", gorm.Expr("qty_available + 1")).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		mv := models.StockMovement{
			StockUnitID:      unit.ID,
			ProductBatchID:   unit.ProductBatchID,
			ProductVariantID: unit.ProductVariantID,
			MovementType:     "return_in",
			ReferenceType:    "sale",
			ReferenceID:      &sale.ID,
			PerformedBy:      uid,
			Notes:            req.Notes,
		}
		if err := tx.Create(&mv).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if err := tx.Preload("Items").First(&sale, sale.ID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	recalcSaleBillableAmount(&sale)
	recalcSalePaymentStatus(&sale, time.Now())

	if err := tx.Save(&sale).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	tx.Commit()

	fullSale, _ := loadFullSale(sale.ID)
	c.JSON(http.StatusOK, gin.H{"data": fullSale})
}
