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
)

type AuditEntry struct {
	ID           string                 `json:"id"`
	UserID       string                 `json:"user_id"`
	Timestamp    string                 `json:"timestamp"`
	Action       string                 `json:"action"`
	Provider     string                 `json:"provider,omitempty"`
	Details      map[string]interface{} `json:"details"`
	Scope        string                 `json:"scope,omitempty"`
	Success      bool                   `json:"success"`
	ErrorMessage string                 `json:"error_message,omitempty"`
}

type CreateAuditRequest struct {
	Action       string                 `json:"action"`
	Provider     string                 `json:"provider,omitempty"`
	Details      map[string]interface{} `json:"details"`
	Scope        string                 `json:"scope,omitempty"`
	Success      bool                   `json:"success"`
	ErrorMessage string                 `json:"error_message,omitempty"`
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
		handleListAudit(w, session, kvClient)
	case http.MethodPost:
		handleCreateAudit(w, r, session, kvClient)
	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func handleListAudit(w http.ResponseWriter, session *auth.Session, kvClient *kv.Client) {
	keys, err := kvClient.List("audit:" + session.UserID + ":")
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"entries": []AuditEntry{},
		})
		return
	}

	entries := make([]AuditEntry, 0, len(keys))
	for _, key := range keys {
		val, err := kvClient.Get(key)
		if err != nil || val == "" {
			continue
		}
		var entry AuditEntry
		if json.Unmarshal([]byte(val), &entry) == nil {
			entries = append(entries, entry)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"entries": entries,
	})
}

func handleCreateAudit(w http.ResponseWriter, r *http.Request, session *auth.Session, kvClient *kv.Client) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var req CreateAuditRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	entry := AuditEntry{
		ID:           generateID(),
		UserID:       session.UserID,
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
		Action:       req.Action,
		Provider:     req.Provider,
		Details:      req.Details,
		Scope:        req.Scope,
		Success:      req.Success,
		ErrorMessage: req.ErrorMessage,
	}

	data, _ := json.Marshal(entry)
	key := "audit:" + session.UserID + ":" + entry.ID
	if err := kvClient.SetWithTTL(key, string(data), 90*24*3600); err != nil {
		http.Error(w, `{"error":"failed to store audit entry"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(entry)
}
