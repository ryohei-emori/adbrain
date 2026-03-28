package handler

import (
	"encoding/json"
	"net/http"

	"github.com/adbrain/adbrain/pkg/auth"
	"github.com/adbrain/adbrain/pkg/kv"
)

type ConnectionStatus struct {
	Provider    string `json:"provider"`
	Connected   bool   `json:"connected"`
	ConnectedAt string `json:"connected_at,omitempty"`
	TokenStatus string `json:"token_status,omitempty"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	statuses := []ConnectionStatus{
		{Provider: "google-ads", Connected: false, TokenStatus: "disconnected"},
		{Provider: "meta-ads", Connected: false, TokenStatus: "disconnected"},
	}

	kvClient, err := kv.New()
	if err == nil {
		for i, s := range statuses {
			val, err := kvClient.Get("connection:" + session.UserID + ":" + s.Provider)
			if err == nil && val != "" {
				var stored ConnectionStatus
				if json.Unmarshal([]byte(val), &stored) == nil {
					statuses[i] = stored
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id":     session.UserID,
		"connections": statuses,
	})
}
