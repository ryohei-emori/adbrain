package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/adbrain/adbrain/pkg/auth"
	"github.com/adbrain/adbrain/pkg/kv"
)

type LLMUsageEntry struct {
	Date              string  `json:"date"`
	Model             string  `json:"model"`
	TotalInputTokens  int     `json:"total_input_tokens"`
	TotalOutputTokens int     `json:"total_output_tokens"`
	TotalCostUSD      float64 `json:"total_cost_usd"`
	InvocationCount   int     `json:"invocation_count"`
}

type LLMUsageResponse struct {
	Today   *LLMUsageEntry  `json:"today"`
	History []LLMUsageEntry `json:"history"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	_, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	kvClient, err := kv.New()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(LLMUsageResponse{
			Today:   emptyUsage(time.Now()),
			History: []LLMUsageEntry{},
		})
		return
	}

	now := time.Now().UTC()
	todayKey := "llm_usage:" + now.Format("2006-01-02")

	var todayUsage *LLMUsageEntry
	val, err := kvClient.Get(todayKey)
	if err == nil && val != "" {
		var entry LLMUsageEntry
		if json.Unmarshal([]byte(val), &entry) == nil {
			todayUsage = &entry
		}
	}
	if todayUsage == nil {
		todayUsage = emptyUsage(now)
	}

	history := make([]LLMUsageEntry, 0, 7)
	for i := 1; i <= 7; i++ {
		date := now.AddDate(0, 0, -i)
		key := "llm_usage:" + date.Format("2006-01-02")
		val, err := kvClient.Get(key)
		if err != nil || val == "" {
			continue
		}
		var entry LLMUsageEntry
		if json.Unmarshal([]byte(val), &entry) == nil {
			history = append(history, entry)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(LLMUsageResponse{
		Today:   todayUsage,
		History: history,
	})
}

func emptyUsage(t time.Time) *LLMUsageEntry {
	return &LLMUsageEntry{
		Date:              t.UTC().Format("2006-01-02"),
		Model:             "grok-3-mini",
		TotalInputTokens:  0,
		TotalOutputTokens: 0,
		TotalCostUSD:      0,
		InvocationCount:   0,
	}
}
