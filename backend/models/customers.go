package models

import (
	"time"

	"gorm.io/gorm"
)

type Customer struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	Code            string         `gorm:"uniqueIndex:idx_customers_code,where:deleted_at IS NULL;not null;size:50" json:"code"`
	Name            string         `gorm:"not null;size:150" json:"name"`
	CustomerType    string         `gorm:"size:50;default:'Guest'" json:"customer_type"`
	ContactPerson   string         `gorm:"size:100" json:"contact_person"`
	Phone           string         `gorm:"size:50" json:"phone"`
	Email           string         `gorm:"size:150" json:"email"`
	Address         string         `gorm:"type:text" json:"address"`
	Subdistrict     string         `gorm:"size:100" json:"subdistrict"`
	City            string         `gorm:"size:100" json:"city"`
	Province        string         `gorm:"size:100" json:"province"`
	PostalCode      string         `gorm:"size:20" json:"postal_code"`
	DefaultTermDays int            `gorm:"default:30" json:"default_term_days"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	Sales           []Sale         `gorm:"foreignKey:CustomerID" json:"sales,omitempty"`
}
