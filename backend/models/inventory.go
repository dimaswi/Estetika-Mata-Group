package models

import (
	"time"

	"gorm.io/gorm"
)

type ProductBatch struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	ProductVariantID uint           `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product_variant_id"`
	SupplierID       *uint          `gorm:"index" json:"supplier_id"`
	PurchaseID       *uint          `gorm:"index" json:"purchase_id"`
	BatchNumber      string         `gorm:"not null;index;size:100" json:"batch_number"`
	ExpiredDate      time.Time      `gorm:"not null;index" json:"expired_date"`
	ReceivedDate     time.Time      `gorm:"not null" json:"received_date"`
	UnitCost         float64        `gorm:"default:0" json:"unit_cost"`
	QtyInitial       int            `gorm:"not null;default:0" json:"qty_initial"`
	QtyAvailable     int            `gorm:"not null;default:0" json:"qty_available"`
	Notes            string         `gorm:"type:text" json:"notes"`
	ProductVariant   *ProductVariant `gorm:"foreignKey:ProductVariantID" json:"product_variant,omitempty"`
	Supplier         *Supplier      `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Purchase         *Purchase      `gorm:"foreignKey:PurchaseID" json:"purchase,omitempty"`
	Units            []StockUnit    `gorm:"foreignKey:ProductBatchID" json:"units,omitempty"`
	EDStatus         string         `gorm:"-" json:"ed_status,omitempty"`
	DaysToExpiry     int            `gorm:"-" json:"days_to_expiry"`
}

type StockUnit struct {
	ID               uint            `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	DeletedAt        gorm.DeletedAt  `gorm:"index" json:"-"`
	ProductVariantID uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product_variant_id"`
	ProductBatchID   uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product_batch_id"`
	UnitCode         string          `gorm:"uniqueIndex:idx_stock_units_unit_code,where:deleted_at IS NULL;not null;size:120" json:"unit_code"`
	SerialNumber     string          `gorm:"index;size:120" json:"serial_number"`
	Status           string          `gorm:"not null;default:'in_stock';index;size:30" json:"status"` // in_stock | reserved | consignment | sold | returned | expired | damaged
	Location         string          `gorm:"size:100" json:"location"`
	SaleID           *uint           `gorm:"index" json:"sale_id"`
	SaleItemID       *uint           `gorm:"index" json:"sale_item_id"`
	ScannedInAt      time.Time       `json:"scanned_in_at"`
	ScannedInBy      uint            `json:"scanned_in_by"`
	ScannedOutAt     *time.Time      `json:"scanned_out_at"`
	ScannedOutBy     *uint           `json:"scanned_out_by"`
	ProductVariant   *ProductVariant `gorm:"foreignKey:ProductVariantID" json:"product_variant,omitempty"`
	ProductBatch     *ProductBatch   `gorm:"foreignKey:ProductBatchID" json:"product_batch,omitempty"`
}

type StockMovement struct {
	ID               uint            `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time       `json:"created_at"`
	StockUnitID      uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"stock_unit_id"`
	ProductBatchID   uint            `gorm:"not null;index" json:"product_batch_id"`
	ProductVariantID uint            `gorm:"not null;index" json:"product_variant_id"`
	MovementType     string          `gorm:"not null;index;size:30" json:"movement_type"` // scan_in | scan_out | return_in | adjustment | mark_expired
	ReferenceType    string          `gorm:"size:30" json:"reference_type"`               // purchase | sale | manual
	ReferenceID      *uint           `json:"reference_id"`
	PerformedBy      uint            `json:"performed_by"`
	Notes            string          `gorm:"type:text" json:"notes"`
	StockUnit        *StockUnit      `gorm:"foreignKey:StockUnitID" json:"stock_unit,omitempty"`
	ProductBatch     *ProductBatch   `gorm:"foreignKey:ProductBatchID" json:"product_batch,omitempty"`
	ProductVariant   *ProductVariant `gorm:"foreignKey:ProductVariantID" json:"product_variant,omitempty"`
}
