package handler

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

type Auth0LogEvent struct {
	Type        string                 `json:"type"`
	Date        string                 `json:"date"`
	ClientID    string                 `json:"client_id"`
	ClientName  string                 `json:"client_name"`
	IP          string                 `json:"ip"`
	UserID      string                 `json:"user_id"`
	UserName    string                 `json:"user_name"`
	Connection  string                 `json:"connection"`
	Description string                 `json:"description"`
	Details     map[string]interface{} `json:"details"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	expectedToken := os.Getenv("AUTH0_LOG_STREAM_TOKEN")
	if expectedToken == "" {
		http.Error(w, `{"error":"webhook not configured"}`, http.StatusServiceUnavailable)
		return
	}

	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") || authHeader[7:] != expectedToken {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to read request body"}`, http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var events []Auth0LogEvent
	if err := json.Unmarshal(body, &events); err != nil {
		var single Auth0LogEvent
		if err := json.Unmarshal(body, &single); err != nil {
			http.Error(w, `{"error":"invalid JSON payload"}`, http.StatusBadRequest)
			return
		}
		events = []Auth0LogEvent{single}
	}

	for _, event := range events {
		logEntry, _ := json.Marshal(map[string]interface{}{
			"source":      "auth0_log_stream",
			"event_type":  event.Type,
			"date":        event.Date,
			"user_id":     event.UserID,
			"connection":  event.Connection,
			"client_name": event.ClientName,
			"ip":          event.IP,
			"description": event.Description,
		})
		log.Println(string(logEntry))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"received": len(events),
	})
}
