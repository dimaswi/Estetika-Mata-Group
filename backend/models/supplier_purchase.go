package models

import (
	"time"

	"gorm.io/gorm"
)

type Supplier struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	Code            string         `gorm:"uniqueIndex:idx_suppliers_code,where:deleted_at IS NULL;not null;size:50" json:"code"`
	Name            string         `gorm:"not null;size:150" json:"name"`
	ContactPerson   string         `gorm:"size:100" json:"contact_person"`
	Phone           string         `gorm:"size:50" json:"phone"`
	Email           string         `gorm:"size:150" json:"email"`
	Address         string         `gorm:"type:text" json:"address"`
	NPWP            string         `gorm:"size:50" json:"npwp"`
	DefaultTermDays int            `gorm:"default:30" json:"default_term_days"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	Purchases       []Purchase     `gorm:"foreignKey:SupplierID" json:"purchases,omitempty"`
}

type Purchase struct {
	ID             uint              `gorm:"primarykey" json:"id"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
	DeletedAt      gorm.DeletedAt    `gorm:"index" json:"-"`
	InvoiceNumber  string            `gorm:"uniqueIndex:idx_purchases_invoice_number,where:deleted_at IS NULL;not null;size:80" json:"invoice_number"`
	SupplierID     uint              `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"supplier_id"`
	PurchaseDate   time.Time         `gorm:"not null" json:"purchase_date"`
	PaymentType    string            `gorm:"not null;default:'cash';size:20" json:"payment_type"` // cash | termin
	TermDays       int               `gorm:"default:0" json:"term_days"`
	DueDate        *time.Time        `json:"due_date"`
	Subtotal       float64           `gorm:"default:0" json:"subtotal"`
	DiscountAmount float64           `gorm:"default:0" json:"discount_amount"`
	PenaltyAmount  float64           `gorm:"default:0" json:"penalty_amount"`
	TaxAmount      float64           `gorm:"default:0" json:"tax_amount"`
	TotalAmount    float64           `gorm:"default:0" json:"total_amount"`
	PaidAmount     float64           `gorm:"default:0" json:"paid_amount"`
	PaymentStatus  string            `gorm:"not null;default:'unpaid';size:20" json:"payment_status"` // unpaid | partial | paid | overdue
	ReceiveStatus  string            `gorm:"not null;default:'draft';size:25" json:"receive_status"` // draft | partial_scanned | completed
	Notes          string            `gorm:"type:text" json:"notes"`
	CreatedBy      uint              `json:"created_by"`
	Supplier       *Supplier         `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Items          []PurchaseItem    `gorm:"foreignKey:PurchaseID" json:"items,omitempty"`
	Payments       []SupplierPayment `gorm:"foreignKey:PurchaseID" json:"payments,omitempty"`
}

type PurchaseItem struct {
	ID               uint            `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	PurchaseID       uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"purchase_id"`
	ProductVariantID uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product_variant_id"`
	QtyOrdered       int             `gorm:"not null;default:1" json:"qty_ordered"`
	QtyScannedIn     int             `gorm:"not null;default:0" json:"qty_scanned_in"`
	UnitCost         float64         `gorm:"not null;default:0" json:"unit_cost"`
	DiscountAmount   float64         `gorm:"default:0" json:"discount_amount"`
	Subtotal         float64         `gorm:"default:0" json:"subtotal"`
	ProductVariant   *ProductVariant `gorm:"foreignKey:ProductVariantID" json:"product_variant,omitempty"`
}

type SupplierPayment struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	CreatedAt     time.Time `json:"created_at"`
	PurchaseID    uint      `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"purchase_id"`
	PaymentDate   time.Time `gorm:"not null" json:"payment_date"`
	Amount        float64   `gorm:"not null" json:"amount"`
	PaymentMethod string    `gorm:"not null;default:'transfer';size:30" json:"payment_method"`
	ReferenceNo   string    `gorm:"size:100" json:"reference_no"`
	Notes         string    `gorm:"type:text" json:"notes"`
	CreatedBy     uint      `json:"created_by"`
}
