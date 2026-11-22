package handlers

import (
	"net/http"
	"starter/backend/database"
	"starter/backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

type DashboardInventoryStats struct {
	TotalProducts       int64   `json:"total_products"`
	TotalVariants       int64   `json:"total_variants"`
	OutOfStockVariants  int64   `json:"out_of_stock_variants"`
	UnitsInStock        int64   `json:"units_in_stock"`
	UnitsConsignment    int64   `json:"units_consignment"`
	InventoryValue      float64 `json:"inventory_value"`
	EDExpiredUnits      int     `json:"ed_expired_units"`
	EDCriticalUnits     int     `json:"ed_critical_units"`
	EDWarningUnits      int     `json:"ed_warning_units"`
	EDSafeUnits         int     `json:"ed_safe_units"`
}

type DashboardSalesStats struct {
	TotalCount        int64   `json:"total_count"`
	TotalBilled       float64 `json:"total_billed"`
	TotalPaid         float64 `json:"total_paid"`
	OutstandingAR     float64 `json:"outstanding_ar"`
	WaitingUsageCount int64   `json:"waiting_usage_count"`
	ConsignmentTotal  float64 `json:"consignment_total"`
	OverdueCount      int     `json:"overdue_count"`
}

type DashboardPurchasesStats struct {
	TotalCount    int64   `json:"total_count"`
	TotalAmount   float64 `json:"total_amount"`
	TotalPaid     float64 `json:"total_paid"`
	OutstandingAP float64 `json:"outstanding_ap"`
	OverdueCount  int     `json:"overdue_count"`
}

type DashboardPartnersStats struct {
	TotalCustomers int64 `json:"total_customers"`
	TotalSuppliers int64 `json:"total_suppliers"`
}

func GetDashboard(c *gin.Context) {
	now := time.Now()
	db := database.DB

	var inv DashboardInventoryStats
	db.Model(&models.Product{}).Count(&inv.TotalProducts)
	db.Model(&models.ProductVariant{}).Count(&inv.TotalVariants)
	db.Model(&models.StockUnit{}).Where("status = ?", "in_stock").Count(&inv.UnitsInStock)
	db.Model(&models.StockUnit{}).Where("status = ?", "consignment").Count(&inv.UnitsConsignment)

	// Out-of-stock active variants
	db.Model(&models.ProductVariant{}).
		Where("is_active = ? AND id NOT IN (SELECT DISTINCT product_variant_id FROM stock_units WHERE status = 'in_stock' AND deleted_at IS NULL)", true).
		Count(&inv.OutOfStockVariants)

	var availableBatches []models.ProductBatch
	db.Preload("ProductVariant.Product").
		Where("qty_available > 0").
		Order("expired_date ASC").
		Find(&availableBatches)

	expiringBatches := make([]models.ProductBatch, 0, 8)
	for i := range availableBatches {
		b := &availableBatches[i]
		status, days := classifyED(b.ExpiredDate, now)
		b.EDStatus = status
		b.DaysToExpiry = days
		inv.InventoryValue += float64(b.QtyAvailable) * b.UnitCost
		switch status {
		case "expired":
			inv.EDExpiredUnits += b.QtyAvailable
		case "critical_30":
			inv.EDCriticalUnits += b.QtyAvailable
		case "warning_90":
			inv.EDWarningUnits += b.QtyAvailable
		default:
			inv.EDSafeUnits += b.QtyAvailable
		}
		if len(expiringBatches) < 8 {
			expiringBatches = append(expiringBatches, *b)
		}
	}

	var allSales []models.Sale
	db.Preload("Customer").
		Preload("Items").
		Order("sale_date DESC, id DESC").
		Find(&allSales)

	var salesStats DashboardSalesStats
	salesStats.TotalCount = int64(len(allSales))
	for i := range allSales {
		s := &allSales[i]
		recalcSalePaymentStatus(s, now)
		eff := s.TotalAmount
		if s.PaymentType == "consignment" {
			eff = s.BillableAmount
			if s.PaymentStatus == "waiting_usage" {
				salesStats.WaitingUsageCount++
			}
			if pendingVal := s.TotalAmount - s.BillableAmount; pendingVal > 0 {
				salesStats.ConsignmentTotal += pendingVal
			}
		}
		salesStats.TotalBilled += eff
		salesStats.TotalPaid += s.PaidAmount
		if rem := (eff + s.PenaltyAmount) - s.PaidAmount; rem > 0 {
			salesStats.OutstandingAR += rem
		}
		if s.PaymentStatus == "overdue" {
			salesStats.OverdueCount++
		}
	}
	recentSales := allSales
	if len(recentSales) > 6 {
		recentSales = recentSales[:6]
	}

	var allPurchases []models.Purchase
	db.Preload("Supplier").
		Preload("Items").
		Order("purchase_date DESC, id DESC").
		Find(&allPurchases)

	var purStats DashboardPurchasesStats
	purStats.TotalCount = int64(len(allPurchases))
	for i := range allPurchases {
		p := &allPurchases[i]
		recalcPurchasePaymentStatus(p, now)
		purStats.TotalAmount += p.TotalAmount
		purStats.TotalPaid += p.PaidAmount
		if rem := (p.TotalAmount + p.PenaltyAmount) - p.PaidAmount; rem > 0 {
			purStats.OutstandingAP += rem
		}
		if p.PaymentStatus == "overdue" {
			purStats.OverdueCount++
		}
	}
	recentPurchases := allPurchases
	if len(recentPurchases) > 5 {
		recentPurchases = recentPurchases[:5]
	}

	var partners DashboardPartnersStats
	db.Model(&models.Customer{}).Count(&partners.TotalCustomers)
	db.Model(&models.Supplier{}).Count(&partners.TotalSuppliers)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"inventory":        inv,
			"sales":            salesStats,
			"purchases":        purStats,
			"partners":         partners,
			"expiring_batches": expiringBatches,
			"recent_sales":     recentSales,
			"recent_purchases": recentPurchases,
		},
	})
}
