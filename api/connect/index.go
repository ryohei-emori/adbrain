package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"os"

	"github.com/adbrain/adbrain/pkg/auth"
	"github.com/adbrain/adbrain/pkg/kv"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	switch action {
	case "status":
		handleStatus(w, r)
	case "google-ads":
		handleGoogleAds(w, r)
	case "meta-ads":
		handleMetaAds(w, r)
	default:
		http.Error(w, `{"error":"unknown connect action"}`, http.StatusNotFound)
	}
}

type ConnectionStatus struct {
	Provider    string `json:"provider"`
	Connected   bool   `json:"connected"`
	ConnectedAt string `json:"connected_at,omitempty"`
	TokenStatus string `json:"token_status,omitempty"`
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
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

func handleGoogleAds(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	baseURL := getBaseURL()

	stateBytes := make([]byte, 16)
	if _, err := rand.Read(stateBytes); err != nil {
		http.Error(w, `{"error":"failed to generate state"}`, http.StatusInternalServerError)
		return
	}
	state := "gads:" + session.UserID + ":" + hex.EncodeToString(stateBytes)

	http.SetCookie(w, &http.Cookie{
		Name:     "connect_state",
		Value:    state,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	params := url.Values{
		"response_type": {"code"},
		"client_id":     {clientID},
		"redirect_uri":  {baseURL + "/api/auth/callback"},
		"scope":         {"openid email profile offline_access"},
		"connection":    {"google-ads"},
		"state":         {state},
		"access_type":   {"offline"},
	}

	authorizeURL := "https://" + domain + "/authorize?" + params.Encode()
	http.Redirect(w, r, authorizeURL, http.StatusFound)
}

func handleMetaAds(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	baseURL := getBaseURL()

	stateBytes := make([]byte, 16)
	if _, err := rand.Read(stateBytes); err != nil {
		http.Error(w, `{"error":"failed to generate state"}`, http.StatusInternalServerError)
		return
	}
	state := "meta:" + session.UserID + ":" + hex.EncodeToString(stateBytes)

	http.SetCookie(w, &http.Cookie{
		Name:     "connect_state",
		Value:    state,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	params := url.Values{
		"response_type": {"code"},
		"client_id":     {clientID},
		"redirect_uri":  {baseURL + "/api/auth/callback"},
		"scope":         {"openid email profile offline_access"},
		"connection":    {"meta-ads"},
		"state":         {state},
	}

	authorizeURL := "https://" + domain + "/authorize?" + params.Encode()
	http.Redirect(w, r, authorizeURL, http.StatusFound)
}

func getBaseURL() string {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://adbrain.vercel.app"
	}
	return baseURL
}
