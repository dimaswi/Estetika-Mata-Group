package handlers

import (
	"net/http"
	"starter/backend/database"
	"starter/backend/models"
	"strings"

	"github.com/gin-gonic/gin"
)

type CustomerWithBalance struct {
	models.Customer
	TotalSales    float64 `json:"total_sales"`
	TotalPaid     float64 `json:"total_paid"`
	OutstandingAR float64 `json:"outstanding_ar"`
}

func GetCustomers(c *gin.Context) {
	var customers []models.Customer
	query := database.DB.Order("name ASC")
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR contact_person ILIKE ? OR phone ILIKE ? OR city ILIKE ?", like, like, like, like, like)
	}
	if err := query.Find(&customers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var agg []struct {
		CustomerID uint
		TotalAmt   float64
		TotalPaid  float64
	}
	database.DB.Model(&models.Sale{}).
		Where("customer_id IS NOT NULL").
		Select("customer_id, COALESCE(SUM(CASE WHEN payment_type = 'consignment' THEN billable_amount ELSE total_amount END + penalty_amount),0) as total_amt, COALESCE(SUM(paid_amount),0) as total_paid").
		Group("customer_id").
		Scan(&agg)

	aggMap := make(map[uint]struct{ amt, paid float64 }, len(agg))
	for _, a := range agg {
		aggMap[a.CustomerID] = struct{ amt, paid float64 }{a.TotalAmt, a.TotalPaid}
	}

	result := make([]CustomerWithBalance, 0, len(customers))
	for _, cust := range customers {
		a := aggMap[cust.ID]
		result = append(result, CustomerWithBalance{
			Customer:      cust,
			TotalSales:    a.amt,
			TotalPaid:     a.paid,
			OutstandingAR: a.amt - a.paid,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func GetCustomer(c *gin.Context) {
	var customer models.Customer
	if err := database.DB.Preload("Sales").First(&customer, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}
	var totalAmt, totalPaid float64
	for _, s := range customer.Sales {
		baseAmt := s.TotalAmount
		if s.PaymentType == "consignment" {
			baseAmt = s.BillableAmount
		}
		totalAmt += baseAmt + s.PenaltyAmount
		totalPaid += s.PaidAmount
	}
	c.JSON(http.StatusOK, gin.H{
		"data": CustomerWithBalance{
			Customer:      customer,
			TotalSales:    totalAmt,
			TotalPaid:     totalPaid,
			OutstandingAR: totalAmt - totalPaid,
		},
	})
}

type CustomerRequest struct {
	Code            string `json:"code" binding:"required"`
	Name            string `json:"name" binding:"required"`
	CustomerType    string `json:"customer_type"`
	ContactPerson   string `json:"contact_person"`
	Phone           string `json:"phone"`
	Email           string `json:"email"`
	Address         string `json:"address"`
	Subdistrict     string `json:"subdistrict"`
	City            string `json:"city"`
	Province        string `json:"province"`
	PostalCode      string `json:"postal_code"`
	DefaultTermDays int    `json:"default_term_days"`
	IsActive        *bool  `json:"is_active"`
}

func CreateCustomer(c *gin.Context) {
	var req CustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	custType := strings.TrimSpace(req.CustomerType)
	if custType == "" {
		custType = "Guest"
	}
	termDays := req.DefaultTermDays
	if termDays <= 0 {
		termDays = 30
	}
	cust := models.Customer{
		Code:            strings.ToUpper(strings.TrimSpace(req.Code)),
		Name:            strings.TrimSpace(req.Name),
		CustomerType:    custType,
		ContactPerson:   strings.TrimSpace(req.ContactPerson),
		Phone:           strings.TrimSpace(req.Phone),
		Email:           strings.TrimSpace(req.Email),
		Address:         strings.TrimSpace(req.Address),
		Subdistrict:     strings.TrimSpace(req.Subdistrict),
		City:            strings.TrimSpace(req.City),
		Province:        strings.TrimSpace(req.Province),
		PostalCode:      strings.TrimSpace(req.PostalCode),
		DefaultTermDays: termDays,
		IsActive:        isActive,
	}
	if err := database.DB.Create(&cust).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": cust})
}

func UpdateCustomer(c *gin.Context) {
	var cust models.Customer
	if err := database.DB.First(&cust, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}
	var req CustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cust.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	cust.Name = strings.TrimSpace(req.Name)
	if strings.TrimSpace(req.CustomerType) != "" {
		cust.CustomerType = strings.TrimSpace(req.CustomerType)
	}
	cust.ContactPerson = strings.TrimSpace(req.ContactPerson)
	cust.Phone = strings.TrimSpace(req.Phone)
	cust.Email = strings.TrimSpace(req.Email)
	cust.Address = strings.TrimSpace(req.Address)
	cust.Subdistrict = strings.TrimSpace(req.Subdistrict)
	cust.City = strings.TrimSpace(req.City)
	cust.Province = strings.TrimSpace(req.Province)
	cust.PostalCode = strings.TrimSpace(req.PostalCode)
	cust.DefaultTermDays = req.DefaultTermDays
	if req.IsActive != nil {
		cust.IsActive = *req.IsActive
	}
	if err := database.DB.Save(&cust).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cust})
}

func DeleteCustomer(c *gin.Context) {
	var cnt int64
	database.DB.Model(&models.Sale{}).Where("customer_id = ?", c.Param("id")).Count(&cnt)
	if cnt > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pelanggan masih memiliki riwayat transaksi penjualan"})
		return
	}
	if err := database.DB.Delete(&models.Customer{}, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Customer deleted"})
}
