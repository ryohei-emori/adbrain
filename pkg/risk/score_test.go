package risk

import "testing"

func TestAssessRisk_LowRisk(t *testing.T) {
	tests := []struct {
		name          string
		action        string
		currentValue  float64
		proposedValue float64
	}{
		{"small budget increase", "adjust_budget", 1000, 1100},
		{"small budget decrease", "adjust_budget", 1000, 900},
		{"tiny bid change", "adjust_bid", 5.0, 5.5},
		{"no change", "adjust_budget", 1000, 1000},
		{"both zero", "adjust_budget", 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := AssessRisk(tt.action, tt.currentValue, tt.proposedValue)
			if got != RiskLow {
				t.Errorf("AssessRisk(%q, %v, %v) = %v, want LOW",
					tt.action, tt.currentValue, tt.proposedValue, got)
			}
		})
	}
}

func TestAssessRisk_MediumRisk(t *testing.T) {
	tests := []struct {
		name          string
		action        string
		currentValue  float64
		proposedValue float64
	}{
		{"25% budget increase", "adjust_budget", 1000, 1250},
		{"30% budget decrease", "adjust_budget", 1000, 700},
		{"40% bid increase", "adjust_bid", 10.0, 14.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := AssessRisk(tt.action, tt.currentValue, tt.proposedValue)
			if got != RiskMedium {
				t.Errorf("AssessRisk(%q, %v, %v) = %v, want MEDIUM",
					tt.action, tt.currentValue, tt.proposedValue, got)
			}
		})
	}
}

func TestAssessRisk_HighRisk(t *testing.T) {
	tests := []struct {
		name          string
		action        string
		currentValue  float64
		proposedValue float64
	}{
		{"60% budget increase", "adjust_budget", 1000, 1600},
		{"75% budget decrease", "adjust_budget", 1000, 250},
		{"double the budget", "adjust_budget", 1000, 2000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := AssessRisk(tt.action, tt.currentValue, tt.proposedValue)
			if got != RiskHigh {
				t.Errorf("AssessRisk(%q, %v, %v) = %v, want HIGH",
					tt.action, tt.currentValue, tt.proposedValue, got)
			}
		})
	}
}

func TestAssessRisk_PauseAlwaysHigh(t *testing.T) {
	got := AssessRisk("pause", 1000, 1000)
	if got != RiskHigh {
		t.Errorf("AssessRisk(pause, 1000, 1000) = %v, want HIGH", got)
	}
}

func TestAssessRisk_EnableAlwaysHigh(t *testing.T) {
	got := AssessRisk("enable", 0, 1000)
	if got != RiskHigh {
		t.Errorf("AssessRisk(enable, 0, 1000) = %v, want HIGH", got)
	}
}

func TestAssessRisk_ZeroCurrentNonZeroProposed(t *testing.T) {
	got := AssessRisk("adjust_budget", 0, 500)
	if got != RiskHigh {
		t.Errorf("AssessRisk(adjust_budget, 0, 500) = %v, want HIGH", got)
	}
}

func TestAssessRisk_BoundaryAt20Percent(t *testing.T) {
	got := AssessRisk("adjust_budget", 1000, 1200)
	if got != RiskLow {
		t.Errorf("AssessRisk(adjust_budget, 1000, 1200) = %v, want LOW (exactly 20%% is not > 0.2)", got)
	}
}

func TestAssessRisk_BoundaryJustAbove20Percent(t *testing.T) {
	got := AssessRisk("adjust_budget", 1000, 1201)
	if got != RiskMedium {
		t.Errorf("AssessRisk(adjust_budget, 1000, 1201) = %v, want MEDIUM", got)
	}
}

func TestAssessRisk_BoundaryAt50Percent(t *testing.T) {
	got := AssessRisk("adjust_budget", 1000, 1500)
	if got != RiskMedium {
		t.Errorf("AssessRisk(adjust_budget, 1000, 1500) = %v, want MEDIUM (exactly 50%% is not > 0.5)", got)
	}
}

func TestAssessRisk_BoundaryJustAbove50Percent(t *testing.T) {
	got := AssessRisk("adjust_budget", 1000, 1501)
	if got != RiskHigh {
		t.Errorf("AssessRisk(adjust_budget, 1000, 1501) = %v, want HIGH", got)
	}
}

func TestRequiresStepUp(t *testing.T) {
	tests := []struct {
		level    RiskLevel
		expected bool
	}{
		{RiskLow, false},
		{RiskMedium, false},
		{RiskHigh, true},
	}

	for _, tt := range tests {
		t.Run(string(tt.level), func(t *testing.T) {
			got := RequiresStepUp(tt.level)
			if got != tt.expected {
				t.Errorf("RequiresStepUp(%v) = %v, want %v", tt.level, got, tt.expected)
			}
		})
	}
}
