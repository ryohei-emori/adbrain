package risk

import "math"

type RiskLevel string

const (
	RiskLow    RiskLevel = "LOW"
	RiskMedium RiskLevel = "MEDIUM"
	RiskHigh   RiskLevel = "HIGH"
)

// AssessRisk evaluates the risk level of a proposed campaign change.
// Rules:
//   - pause/enable actions are always HIGH risk
//   - change ratio > 0.5 (50%) is HIGH risk
//   - change ratio > 0.2 (20%) is MEDIUM risk
//   - otherwise LOW risk
func AssessRisk(action string, currentValue, proposedValue float64) RiskLevel {
	if action == "pause" || action == "enable" {
		return RiskHigh
	}

	var ratio float64
	if currentValue == 0 {
		if proposedValue != 0 {
			return RiskHigh
		}
		return RiskLow
	}
	ratio = math.Abs(proposedValue-currentValue) / math.Abs(currentValue)

	if ratio > 0.5 {
		return RiskHigh
	}
	if ratio > 0.2 {
		return RiskMedium
	}
	return RiskLow
}

// RequiresStepUp returns true if the risk level requires MFA step-up authentication.
func RequiresStepUp(level RiskLevel) bool {
	return level == RiskHigh
}
