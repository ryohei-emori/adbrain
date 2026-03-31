package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/adbrain/adbrain/pkg/auth"
	"github.com/adbrain/adbrain/pkg/kv"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	switch action {
	case "status":
		handleStatus(w, r)
	case "initiate":
		handleInitiate(w, r)
	case "complete":
		handleComplete(w, r)
	case "disconnect":
		handleDisconnect(w, r)
	case "debug-kv":
		handleDebugKV(w)
	default:
		http.Error(w, `{"error":"unknown connect action"}`, http.StatusNotFound)
	}
}

func handleDebugKV(w http.ResponseWriter) {
	kvURL := os.Getenv("KV_REST_API_URL")
	kvToken := os.Getenv("KV_REST_API_TOKEN")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"kv_url_set":   kvURL != "",
		"kv_url_len":   len(kvURL),
		"kv_token_set": kvToken != "",
		"kv_token_len": len(kvToken),
	})
}

type ConnectionStatus struct {
	Provider    string   `json:"provider"`
	Connected   bool     `json:"connected"`
	ConnectedAt string   `json:"connected_at,omitempty"`
	TokenStatus string   `json:"token_status"`
	Scopes      []string `json:"scopes,omitempty"`
	AccountName string   `json:"account_name,omitempty"`
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

	source := "default"
	kvClient, err := kv.New()
	if err == nil {
		source = "kv"
		for i, s := range statuses {
			val, kvErr := kvClient.Get("connection:" + session.UserID + ":" + s.Provider)
			if kvErr == nil && val != "" {
				var stored ConnectionStatus
				if json.Unmarshal([]byte(val), &stored) == nil {
					statuses[i] = stored
				}
			}
		}
	} else {
		log.Printf("KV unavailable for status check: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user_id":     session.UserID,
		"connections": statuses,
		"source":      source,
	})
}

var connectionScopes = map[string][]string{
	"google-ads": {"https://www.googleapis.com/auth/adwords", "openid", "profile", "email"},
	"meta-ads":   {"ads_management", "ads_read", "email"},
}

func handleInitiate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	provider := r.URL.Query().Get("provider")
	if _, ok := connectionScopes[provider]; !ok {
		http.Error(w, `{"error":"unsupported provider"}`, http.StatusBadRequest)
		return
	}

	returnTo := r.URL.Query().Get("return_to")
	if returnTo == "" {
		returnTo = "/dashboard/connections"
	}

	switch provider {
	case "google-ads":
		handleGoogleAdsInitiate(w, r, session, returnTo)
	case "meta-ads":
		handleMetaAdsInitiate(w, session)
	default:
		http.Error(w, `{"error":"unsupported provider"}`, http.StatusBadRequest)
	}
}

func handleGoogleAdsInitiate(w http.ResponseWriter, r *http.Request, session *auth.Session, returnTo string) {
	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	baseURL := getBaseURL()

	if domain == "" || clientID == "" {
		http.Error(w, `{"error":"Auth0 not configured"}`, http.StatusServiceUnavailable)
		return
	}

	stateBytes := make([]byte, 16)
	if _, err := rand.Read(stateBytes); err != nil {
		http.Error(w, `{"error":"failed to generate state"}`, http.StatusInternalServerError)
		return
	}
	nonce := hex.EncodeToString(stateBytes)
	state := "connect:google-ads:" + nonce

	cookiePayload := map[string]string{
		"state":     state,
		"user_id":   session.UserID,
		"return_to": returnTo,
		"provider":  "google-ads",
	}
	cookieJSON, _ := json.Marshal(cookiePayload)
	http.SetCookie(w, &http.Cookie{
		Name:     "connect_state",
		Value:    url.QueryEscape(string(cookieJSON)),
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	params := url.Values{
		"response_type": {"code"},
		"client_id":     {clientID},
		"redirect_uri":  {baseURL + "/api/connectcb"},
		"connection":    {"google-ads"},
		"scope":         {"openid email profile offline_access"},
		"state":         {state},
		"prompt":        {"consent"},
	}

	connectURI := "https://" + domain + "/authorize?" + params.Encode()
	log.Printf("[initiate] provider=google-ads userID=%s returnTo=%s", session.UserID, returnTo)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"connect_uri": connectURI,
		"state":       state,
	})
}

func handleMetaAdsInitiate(w http.ResponseWriter, _ *auth.Session) {
	appID := os.Getenv("META_ADS_APP_ID")
	if appID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Meta Ads credentials not configured",
			"demo":  true,
		})
		return
	}

	http.Error(w, `{"error":"meta-ads direct OAuth not yet implemented"}`, http.StatusNotImplemented)
}

// handleComplete is called by the auth callback handler when it detects a
// connect: state prefix. It stores the connection in KV.
func handleComplete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	provider := r.URL.Query().Get("provider")
	if provider == "" {
		http.Error(w, `{"error":"missing provider"}`, http.StatusBadRequest)
		return
	}

	kvClient, kvErr := kv.New()
	if kvErr == nil {
		status := ConnectionStatus{
			Provider:    provider,
			Connected:   true,
			ConnectedAt: time.Now().UTC().Format(time.RFC3339),
			TokenStatus: "healthy",
			Scopes:      connectionScopes[provider],
			AccountName: providerDisplayName(provider) + " Account",
		}
		data, _ := json.Marshal(status)
		_ = kvClient.Set("connection:"+session.UserID+":"+provider, string(data))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"provider": provider,
	})
}

func handleDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	provider := r.URL.Query().Get("provider")
	if provider == "" {
		http.Error(w, `{"error":"missing provider parameter"}`, http.StatusBadRequest)
		return
	}

	kvClient, kvErr := kv.New()
	if kvErr == nil {
		_ = kvClient.Delete("connection:" + session.UserID + ":" + provider)
		_ = kvClient.Delete("token:" + session.UserID + ":" + provider)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"provider": provider,
	})
}

func providerDisplayName(provider string) string {
	names := map[string]string{
		"google-ads": "Google Ads",
		"meta-ads":   "Meta Ads",
	}
	if name, ok := names[provider]; ok {
		return name
	}
	return provider
}

func getBaseURL() string {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://adbrain-chi.vercel.app"
	}
	return baseURL
}
