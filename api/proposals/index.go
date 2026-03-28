package handler

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/adbrain/adbrain/pkg/auth"
	"github.com/adbrain/adbrain/pkg/kv"
	"github.com/adbrain/adbrain/pkg/middleware"
	"github.com/adbrain/adbrain/pkg/risk"
)

type Proposal struct {
	ID              string  `json:"id"`
	UserID          string  `json:"user_id"`
	CreatedAt       string  `json:"created_at"`
	Status          string  `json:"status"`
	Platform        string  `json:"platform"`
	CampaignID      string  `json:"campaign_id"`
	CampaignName    string  `json:"campaign_name"`
	Action          string  `json:"action"`
	CurrentValue    float64 `json:"current_value"`
	ProposedValue   float64 `json:"proposed_value"`
	ChangeRatio     float64 `json:"change_ratio"`
	RiskLevel       string  `json:"risk_level"`
	Reasoning       string  `json:"reasoning"`
	ExpectedImpact  string  `json:"expected_impact"`
	RequiresStepUp  bool    `json:"requires_step_up"`
	ApprovedAt      string  `json:"approved_at,omitempty"`
	ApprovedWithMFA bool    `json:"approved_with_mfa,omitempty"`
	ExecutedAt      string  `json:"executed_at,omitempty"`
	ExecutionResult string  `json:"execution_result,omitempty"`
}

type CreateProposalRequest struct {
	Platform       string  `json:"platform"`
	CampaignID     string  `json:"campaign_id"`
	CampaignName   string  `json:"campaign_name"`
	Action         string  `json:"action"`
	CurrentValue   float64 `json:"current_value"`
	ProposedValue  float64 `json:"proposed_value"`
	Reasoning      string  `json:"reasoning"`
	ExpectedImpact string  `json:"expected_impact"`
}

type UpdateProposalRequest struct {
	Status string `json:"status"`
}

func generateID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func Handler(w http.ResponseWriter, r *http.Request) {
	middleware.Logging(handler)(w, r)
}

func handler(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	kvClient, err := kv.New()
	if err != nil {
		http.Error(w, `{"error":"storage unavailable"}`, http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		handleListProposals(w, session, kvClient)
	case http.MethodPost:
		handleCreateProposal(w, r, session, kvClient)
	case http.MethodPatch:
		handleUpdateProposal(w, r, session, kvClient)
	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func handleListProposals(w http.ResponseWriter, session *auth.Session, kvClient *kv.Client) {
	keys, err := kvClient.List("proposal:" + session.UserID + ":")
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"proposals": []Proposal{},
		})
		return
	}

	proposals := make([]Proposal, 0, len(keys))
	for _, key := range keys {
		val, err := kvClient.Get(key)
		if err != nil || val == "" {
			continue
		}
		var p Proposal
		if json.Unmarshal([]byte(val), &p) == nil {
			proposals = append(proposals, p)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"proposals": proposals,
	})
}

func handleCreateProposal(w http.ResponseWriter, r *http.Request, session *auth.Session, kvClient *kv.Client) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var req CreateProposalRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	riskLevel := risk.AssessRisk(req.Action, req.CurrentValue, req.ProposedValue)

	var changeRatio float64
	if req.CurrentValue != 0 {
		changeRatio = (req.ProposedValue - req.CurrentValue) / req.CurrentValue
	}

	proposal := Proposal{
		ID:             generateID(),
		UserID:         session.UserID,
		CreatedAt:      time.Now().UTC().Format(time.RFC3339),
		Status:         "pending",
		Platform:       req.Platform,
		CampaignID:     req.CampaignID,
		CampaignName:   req.CampaignName,
		Action:         req.Action,
		CurrentValue:   req.CurrentValue,
		ProposedValue:  req.ProposedValue,
		ChangeRatio:    changeRatio,
		RiskLevel:      string(riskLevel),
		Reasoning:      req.Reasoning,
		ExpectedImpact: req.ExpectedImpact,
		RequiresStepUp: risk.RequiresStepUp(riskLevel),
	}

	data, _ := json.Marshal(proposal)
	key := "proposal:" + session.UserID + ":" + proposal.ID
	if err := kvClient.SetWithTTL(key, string(data), 30*24*3600); err != nil {
		http.Error(w, `{"error":"failed to store proposal"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(proposal)
}

func handleUpdateProposal(w http.ResponseWriter, r *http.Request, session *auth.Session, kvClient *kv.Client) {
	proposalID := r.URL.Query().Get("id")
	if proposalID == "" {
		http.Error(w, `{"error":"missing proposal id"}`, http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var req UpdateProposalRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if req.Status != "approved" && req.Status != "rejected" {
		http.Error(w, `{"error":"status must be 'approved' or 'rejected'"}`, http.StatusBadRequest)
		return
	}

	key := "proposal:" + session.UserID + ":" + proposalID
	val, err := kvClient.Get(key)
	if err != nil || val == "" {
		http.Error(w, `{"error":"proposal not found"}`, http.StatusNotFound)
		return
	}

	var proposal Proposal
	if err := json.Unmarshal([]byte(val), &proposal); err != nil {
		http.Error(w, `{"error":"corrupted proposal data"}`, http.StatusInternalServerError)
		return
	}

	if proposal.Status != "pending" {
		http.Error(w, `{"error":"proposal is not in pending state"}`, http.StatusConflict)
		return
	}

	proposal.Status = req.Status
	if req.Status == "approved" {
		proposal.ApprovedAt = time.Now().UTC().Format(time.RFC3339)
	}

	data, _ := json.Marshal(proposal)
	if err := kvClient.SetWithTTL(key, string(data), 30*24*3600); err != nil {
		http.Error(w, `{"error":"failed to update proposal"}`, http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(proposal)
}
