package handlers

import (
	"net/http"
	"starter/backend/database"
	"starter/backend/models"
	"strings"

	"github.com/gin-gonic/gin"
)

type SupplierWithBalance struct {
	models.Supplier
	TotalPurchases float64 `json:"total_purchases"`
	TotalPaid      float64 `json:"total_paid"`
	OutstandingAP  float64 `json:"outstanding_ap"`
}

func GetSuppliers(c *gin.Context) {
	var suppliers []models.Supplier
	query := database.DB.Order("name ASC")
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR contact_person ILIKE ? OR phone ILIKE ?", like, like, like, like)
	}
	if err := query.Find(&suppliers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var agg []struct {
		SupplierID uint
		TotalAmt   float64
		TotalPaid  float64
	}
	database.DB.Model(&models.Purchase{}).
		Select("supplier_id, COALESCE(SUM(total_amount + penalty_amount),0) as total_amt, COALESCE(SUM(paid_amount),0) as total_paid").
		Group("supplier_id").
		Scan(&agg)

	aggMap := make(map[uint]struct{ amt, paid float64 }, len(agg))
	for _, a := range agg {
		aggMap[a.SupplierID] = struct{ amt, paid float64 }{a.TotalAmt, a.TotalPaid}
	}

	result := make([]SupplierWithBalance, 0, len(suppliers))
	for _, s := range suppliers {
		a := aggMap[s.ID]
		result = append(result, SupplierWithBalance{
			Supplier:       s,
			TotalPurchases: a.amt,
			TotalPaid:      a.paid,
			OutstandingAP:  a.amt - a.paid,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func GetSupplier(c *gin.Context) {
	var supplier models.Supplier
	if err := database.DB.Preload("Purchases").First(&supplier, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
		return
	}
	var totalAmt, totalPaid float64
	for _, p := range supplier.Purchases {
		totalAmt += p.TotalAmount + p.PenaltyAmount
		totalPaid += p.PaidAmount
	}
	c.JSON(http.StatusOK, gin.H{
		"data": SupplierWithBalance{
			Supplier:       supplier,
			TotalPurchases: totalAmt,
			TotalPaid:      totalPaid,
			OutstandingAP:  totalAmt - totalPaid,
		},
	})
}

type SupplierRequest struct {
	Code            string `json:"code" binding:"required"`
	Name            string `json:"name" binding:"required"`
	ContactPerson   string `json:"contact_person"`
	Phone           string `json:"phone"`
	Email           string `json:"email"`
	Address         string `json:"address"`
	NPWP            string `json:"npwp"`
	DefaultTermDays int    `json:"default_term_days"`
	IsActive        *bool  `json:"is_active"`
}

func CreateSupplier(c *gin.Context) {
	var req SupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	s := models.Supplier{
		Code:            strings.ToUpper(strings.TrimSpace(req.Code)),
		Name:            strings.TrimSpace(req.Name),
		ContactPerson:   req.ContactPerson,
		Phone:           req.Phone,
		Email:           req.Email,
		Address:         req.Address,
		NPWP:            req.NPWP,
		DefaultTermDays: req.DefaultTermDays,
		IsActive:        isActive,
	}
	if err := database.DB.Create(&s).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": s})
}

func UpdateSupplier(c *gin.Context) {
	var s models.Supplier
	if err := database.DB.First(&s, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
		return
	}
	var req SupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	s.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	s.Name = strings.TrimSpace(req.Name)
	s.ContactPerson = req.ContactPerson
	s.Phone = req.Phone
	s.Email = req.Email
	s.Address = req.Address
	s.NPWP = req.NPWP
	s.DefaultTermDays = req.DefaultTermDays
	if req.IsActive != nil {
		s.IsActive = *req.IsActive
	}
	if err := database.DB.Save(&s).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": s})
}

func DeleteSupplier(c *gin.Context) {
	var cnt int64
	database.DB.Model(&models.Purchase{}).Where("supplier_id = ?", c.Param("id")).Count(&cnt)
	if cnt > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Supplier still has purchase records"})
		return
	}
	if err := database.DB.Delete(&models.Supplier{}, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Supplier deleted"})
}
