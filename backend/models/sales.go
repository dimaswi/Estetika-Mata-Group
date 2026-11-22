package models

import (
	"time"

	"gorm.io/gorm"
)

type Sale struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	InvoiceNumber   string         `gorm:"uniqueIndex:idx_sales_invoice_number,where:deleted_at IS NULL;not null;size:80" json:"invoice_number"`
	CustomerID      *uint          `gorm:"index;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"customer_id"`
	Customer        *Customer      `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	CustomerName    string         `gorm:"not null;size:150" json:"customer_name"`
	CustomerPhone   string         `gorm:"size:50" json:"customer_phone"`
	CustomerAddress string         `gorm:"type:text" json:"customer_address"`
	DoctorName      string         `gorm:"size:150" json:"doctor_name"`
	SaleDate         time.Time      `gorm:"not null" json:"sale_date"`
	PaymentType      string         `gorm:"not null;default:'cash';size:20" json:"payment_type"` // cash | termin | consignment
	TermDays         int            `gorm:"default:0" json:"term_days"`
	DueDate          *time.Time     `json:"due_date"`
	Subtotal         float64        `gorm:"default:0" json:"subtotal"`
	DiscountAmount   float64        `gorm:"default:0" json:"discount_amount"`
	PenaltyAmount    float64        `gorm:"default:0" json:"penalty_amount"`
	TaxAmount        float64        `gorm:"default:0" json:"tax_amount"`
	TotalAmount      float64        `gorm:"default:0" json:"total_amount"`
	BillableAmount   float64        `gorm:"default:0" json:"billable_amount"`
	UsageConfirmedAt *time.Time     `json:"usage_confirmed_at"`
	PaidAmount       float64        `gorm:"default:0" json:"paid_amount"`
	PaymentStatus    string         `gorm:"not null;default:'unpaid';size:20" json:"payment_status"`   // unpaid | partial | paid | overdue | waiting_usage
	DeliveryStatus   string         `gorm:"not null;default:'draft';size:25" json:"delivery_status"` // draft | partial_scanned | completed
	Notes           string         `gorm:"type:text" json:"notes"`
	CreatedBy       uint           `json:"created_by"`
	Items           []SaleItem     `gorm:"foreignKey:SaleID" json:"items,omitempty"`
	Payments        []SalePayment  `gorm:"foreignKey:SaleID" json:"payments,omitempty"`
}

type SaleItem struct {
	ID               uint            `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	SaleID           uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"sale_id"`
	ProductVariantID uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product_variant_id"`
	QtyOrdered       int             `gorm:"not null;default:1" json:"qty_ordered"`
	QtyScannedOut    int             `gorm:"not null;default:0" json:"qty_scanned_out"`
	QtyUsed          int             `gorm:"not null;default:0" json:"qty_used"`
	QtyReturned      int             `gorm:"not null;default:0" json:"qty_returned"`
	UnitPrice        float64         `gorm:"not null;default:0" json:"unit_price"`
	DiscountAmount   float64         `gorm:"default:0" json:"discount_amount"`
	Subtotal         float64         `gorm:"default:0" json:"subtotal"`
	FeeAmount        float64         `gorm:"default:0" json:"fee_amount"`
	ProductVariant   *ProductVariant `gorm:"foreignKey:ProductVariantID" json:"product_variant,omitempty"`
	Units            []StockUnit     `gorm:"foreignKey:SaleItemID" json:"units,omitempty"`
}

type SalePayment struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	CreatedAt     time.Time `json:"created_at"`
	SaleID        uint      `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"sale_id"`
	PaymentDate   time.Time `gorm:"not null" json:"payment_date"`
	Amount        float64   `gorm:"not null" json:"amount"`
	PaymentMethod string    `gorm:"not null;default:'transfer';size:30" json:"payment_method"`
	ReferenceNo   string    `gorm:"size:100" json:"reference_no"`
	Notes         string    `gorm:"type:text" json:"notes"`
	CreatedBy     uint      `json:"created_by"`
}
