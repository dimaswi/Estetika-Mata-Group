package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"starter/backend/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func getCurrentUserID(c *gin.Context) uint {
	val, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	if uid, ok := val.(uint); ok {
		return uid
	}
	return 0
}

func parseDateFlexible(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid date format: %s (use YYYY-MM-DD)", s)
}

func classifyED(ed time.Time, now time.Time) (string, int) {
	edDay := time.Date(ed.Year(), ed.Month(), ed.Day(), 0, 0, 0, 0, time.UTC)
	nowDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	days := int(edDay.Sub(nowDay).Hours() / 24)
	switch {
	case days < 0:
		return "expired", days
	case days <= 30:
		return "critical_30", days
	case days <= 90:
		return "warning_90", days
	default:
		return "safe", days
	}
}

func recalcPurchasePaymentStatus(p *models.Purchase, now time.Time) {
	totalDue := p.TotalAmount + p.PenaltyAmount
	switch {
	case totalDue > 0 && p.PaidAmount >= totalDue-0.01:
		p.PaymentStatus = "paid"
	case p.PaidAmount > 0:
		if p.DueDate != nil && now.After(*p.DueDate) {
			p.PaymentStatus = "overdue"
		} else {
			p.PaymentStatus = "partial"
		}
	default:
		if p.DueDate != nil && now.After(*p.DueDate) {
			p.PaymentStatus = "overdue"
		} else {
			p.PaymentStatus = "unpaid"
		}
	}
}

func recalcSaleBillableAmount(s *models.Sale) {
	if s.PaymentType != "consignment" {
		s.BillableAmount = s.TotalAmount
		return
	}
	var usedSubtotal float64
	for _, it := range s.Items {
		if it.QtyOrdered <= 0 || it.QtyUsed <= 0 {
			continue
		}
		perUnitNet := it.Subtotal / float64(it.QtyOrdered)
		usedSubtotal += perUnitNet * float64(it.QtyUsed)
	}
	if usedSubtotal <= 0 {
		s.BillableAmount = 0
		return
	}
	ratio := 0.0
	if s.Subtotal > 0 {
		ratio = usedSubtotal / s.Subtotal
	}
	billable := usedSubtotal - (s.DiscountAmount * ratio) + (s.TaxAmount * ratio)
	if billable < 0 {
		billable = 0
	}
	s.BillableAmount = math.Round(billable)
}

func recalcSalePaymentStatus(s *models.Sale, now time.Time) {
	if s.PaymentType == "consignment" {
		totalDue := s.BillableAmount + s.PenaltyAmount
		if totalDue <= 0.01 {
			if len(s.Items) > 0 && s.DeliveryStatus == "completed" {
				allReturned := true
				for _, it := range s.Items {
					if it.QtyUsed > 0 || it.QtyReturned < it.QtyOrdered {
						allReturned = false
						break
					}
				}
				if allReturned {
					s.PaymentStatus = "paid"
					return
				}
			}
			s.PaymentStatus = "waiting_usage"
			return
		}
		switch {
		case s.PaidAmount >= totalDue-0.01:
			s.PaymentStatus = "paid"
		case s.PaidAmount > 0:
			if s.DueDate != nil && now.After(*s.DueDate) {
				s.PaymentStatus = "overdue"
			} else {
				s.PaymentStatus = "partial"
			}
		default:
			if s.DueDate != nil && now.After(*s.DueDate) {
				s.PaymentStatus = "overdue"
			} else {
				s.PaymentStatus = "unpaid"
			}
		}
		return
	}

	totalDue := s.TotalAmount + s.PenaltyAmount
	switch {
	case totalDue > 0 && s.PaidAmount >= totalDue-0.01:
		s.PaymentStatus = "paid"
	case s.PaidAmount > 0:
		if s.DueDate != nil && now.After(*s.DueDate) {
			s.PaymentStatus = "overdue"
		} else {
			s.PaymentStatus = "partial"
		}
	default:
		if s.DueDate != nil && now.After(*s.DueDate) {
			s.PaymentStatus = "overdue"
		} else {
			s.PaymentStatus = "unpaid"
		}
	}
}

func generateUnitCode(sku string, batchNo string, seq int) string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	cleanSKU := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(sku), " ", ""))
	if len(cleanSKU) > 12 {
		cleanSKU = cleanSKU[:12]
	}
	cleanBatch := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(batchNo), " ", ""))
	if len(cleanBatch) > 8 {
		cleanBatch = cleanBatch[:8]
	}
	return fmt.Sprintf("%s-%s-%03d-%s", cleanSKU, cleanBatch, seq, strings.ToUpper(hex.EncodeToString(b)))
}
