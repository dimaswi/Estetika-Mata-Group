package models

import (
	"time"

	"gorm.io/gorm"
)

type Brand struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	Code         string         `gorm:"uniqueIndex:idx_brands_code,where:deleted_at IS NULL;not null;size:50" json:"code"`
	Name         string         `gorm:"uniqueIndex:idx_brands_name,where:deleted_at IS NULL;not null;size:120" json:"name"`
	Manufacturer string         `gorm:"size:150" json:"manufacturer"`
	Country      string         `gorm:"size:100" json:"country"`
	Description  string         `gorm:"size:255" json:"description"`
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	Products     []Product      `gorm:"foreignKey:BrandID" json:"products,omitempty"`
}

type Category struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	ParentID    *uint          `gorm:"index" json:"parent_id"`
	Code        string         `gorm:"uniqueIndex:idx_categories_code,where:deleted_at IS NULL;not null;size:50" json:"code"`
	Name        string         `gorm:"not null;size:120" json:"name"`
	Description string         `gorm:"size:255" json:"description"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	Parent      *Category      `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children    []Category     `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Products    []Product      `gorm:"foreignKey:CategoryID" json:"products,omitempty"`
}

type Product struct {
	ID                     uint             `gorm:"primarykey" json:"id"`
	CreatedAt              time.Time        `json:"created_at"`
	UpdatedAt              time.Time        `json:"updated_at"`
	DeletedAt              gorm.DeletedAt   `gorm:"index" json:"-"`
	CategoryID             uint             `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"category_id"`
	BrandID                *uint            `gorm:"index;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"brand_id"`
	SKUPrefix              string           `gorm:"uniqueIndex:idx_products_sku_prefix,where:deleted_at IS NULL;not null;size:50" json:"sku_prefix"`
	Name                   string           `gorm:"not null;size:150" json:"name"`
	AlternativeName        string           `gorm:"size:150" json:"alternative_name"`
	Brand                  string           `gorm:"size:100" json:"brand"`
	AKLNumber              string           `gorm:"size:100" json:"akl_number"`
	UnitName               string           `gorm:"not null;default:'pcs';size:30" json:"unit_name"`
	MinStockAlert          int              `gorm:"default:5" json:"min_stock_alert"`
	HasVariants            bool             `gorm:"default:false" json:"has_variants"`
	DefaultFeeProductType  string           `gorm:"size:20;default:'fixed'" json:"default_fee_product_type"`
	DefaultFeeProductValue float64          `gorm:"default:0" json:"default_fee_product_value"`
	Description            string           `gorm:"type:text" json:"description"`
	IsActive               bool             `gorm:"default:true" json:"is_active"`
	Category               *Category        `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	BrandInfo              *Brand           `gorm:"foreignKey:BrandID" json:"brand_info,omitempty"`
	Variants               []ProductVariant `gorm:"foreignKey:ProductID" json:"variants,omitempty"`
}

type ProductVariant struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	ProductID       uint           `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"product_id"`
	SKU             string         `gorm:"uniqueIndex:idx_product_variants_sku,where:deleted_at IS NULL;not null;size:80" json:"sku"`
	VariantName     string         `gorm:"not null;size:150" json:"variant_name"`
	IsDefault       bool           `gorm:"default:false" json:"is_default"`
	Attributes      string         `gorm:"type:jsonb;default:'{}'" json:"attributes"`
	BuyPrice        float64        `gorm:"default:0" json:"buy_price"`
	SellPrice       float64        `gorm:"default:0" json:"sell_price"`
	FeeProductType  string         `gorm:"size:20;default:'fixed'" json:"fee_product_type"`
	FeeProductValue float64        `gorm:"default:0" json:"fee_product_value"`
	Barcode         string         `gorm:"index;size:100" json:"barcode"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	Product         *Product       `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Batches         []ProductBatch `gorm:"foreignKey:ProductVariantID" json:"batches,omitempty"`
	StockCount      int64          `gorm:"-" json:"stock_count"`
}

type ProductGroup struct {
	ID          uint               `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
	DeletedAt   gorm.DeletedAt     `gorm:"index" json:"-"`
	Code        string             `gorm:"uniqueIndex:idx_product_groups_code,where:deleted_at IS NULL;not null;size:50" json:"code"`
	Name        string             `gorm:"not null;size:150" json:"name"`
	GroupType   string             `gorm:"size:30;default:'attribute_group'" json:"group_type"`
	Description string             `gorm:"size:255" json:"description"`
	IsActive    bool               `gorm:"default:true" json:"is_active"`
	Items       []ProductGroupItem `gorm:"foreignKey:ProductGroupID" json:"items,omitempty"`
}

type ProductGroupItem struct {
	ID               uint            `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time       `json:"created_at"`
	ProductGroupID   uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"product_group_id"`
	ProductVariantID uint            `gorm:"not null;index;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"product_variant_id"`
	DefaultQty       int             `gorm:"default:1" json:"default_qty"`
	ProductVariant   *ProductVariant `gorm:"foreignKey:ProductVariantID" json:"product_variant,omitempty"`
}
