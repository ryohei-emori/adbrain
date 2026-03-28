package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
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
	default:
		http.Error(w, `{"error":"unknown connect action"}`, http.StatusNotFound)
	}
}

type ConnectionStatus struct {
	Provider    string   `json:"provider"`
	Connected   bool     `json:"connected"`
	ConnectedAt string   `json:"connected_at,omitempty"`
	TokenStatus string   `json:"token_status"`
	Scopes      []string `json:"scopes,omitempty"`
	AccountName string   `json:"account_name,omitempty"`
}

// handleStatus returns connection statuses, using both KV cache and
// the My Account API's connected-accounts list when possible.
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

	if session.RefreshToken != "" {
		myToken, err := auth.GetMyAccountAPIToken(session.RefreshToken)
		if err == nil {
			accounts, err := auth.ListConnectedAccounts(myToken)
			if err == nil {
				for i, s := range statuses {
					for _, acct := range accounts {
						if acct.Connection == s.Provider {
							statuses[i].Connected = true
							statuses[i].TokenStatus = "healthy"
							statuses[i].ConnectedAt = acct.ConnectedAt
							statuses[i].Scopes = acct.Scopes
							break
						}
					}
				}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]interface{}{
					"user_id":     session.UserID,
					"connections": statuses,
					"source":      "token_vault",
				})
				return
			}
			log.Printf("list connected accounts failed (falling back to KV): %v", err)
		} else {
			log.Printf("my account token failed (falling back to KV): %v", err)
		}
	}

	kvClient, err := kv.New()
	if err == nil {
		for i, s := range statuses {
			val, kvErr := kvClient.Get("connection:" + session.UserID + ":" + s.Provider)
			if kvErr == nil && val != "" {
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
		"source":      "kv_cache",
	})
}

var connectionScopes = map[string][]string{
	"google-ads": {"https://www.googleapis.com/auth/adwords", "openid", "profile", "email"},
	"meta-ads":   {"ads_management", "ads_read", "email"},
}

// handleInitiate starts the Connected Accounts flow via the My Account API.
// Returns a JSON object with connect_uri for the frontend to redirect to.
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
	scopes, ok := connectionScopes[provider]
	if !ok {
		http.Error(w, `{"error":"unsupported provider"}`, http.StatusBadRequest)
		return
	}

	if session.RefreshToken == "" {
		http.Error(w, `{"error":"no refresh token, please re-login"}`, http.StatusForbidden)
		return
	}

	myToken, err := auth.GetMyAccountAPIToken(session.RefreshToken)
	if err != nil {
		log.Printf("my account token failed: %v", err)
		http.Error(w, `{"error":"failed to get my account token"}`, http.StatusBadGateway)
		return
	}

	stateBytes := make([]byte, 16)
	if _, err := rand.Read(stateBytes); err != nil {
		http.Error(w, `{"error":"failed to generate state"}`, http.StatusInternalServerError)
		return
	}
	state := hex.EncodeToString(stateBytes)

	baseURL := getBaseURL()
	redirectURI := baseURL + "/dashboard/connections?connect_callback=1"

	result, err := auth.InitiateConnectedAccount(myToken, provider, redirectURI, state, scopes)
	if err != nil {
		log.Printf("initiate connected account failed: %v", err)
		http.Error(w, `{"error":"failed to initiate connection","details":"`+err.Error()+`"}`, http.StatusBadGateway)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "connect_auth_session",
		Value:    result.AuthSession,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "connect_provider",
		Value:    provider,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"connect_uri": result.ConnectURI,
		"state":       state,
	})
}

// handleComplete finalizes the Connected Accounts flow after the user
// has authorized with the external provider and been redirected back.
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

	connectCode := r.URL.Query().Get("connect_code")
	if connectCode == "" {
		http.Error(w, `{"error":"missing connect_code"}`, http.StatusBadRequest)
		return
	}

	authSessionCookie, err := r.Cookie("connect_auth_session")
	if err != nil || authSessionCookie.Value == "" {
		http.Error(w, `{"error":"missing auth_session cookie"}`, http.StatusBadRequest)
		return
	}
	authSession := authSessionCookie.Value

	providerCookie, _ := r.Cookie("connect_provider")
	provider := ""
	if providerCookie != nil {
		provider = providerCookie.Value
	}

	if session.RefreshToken == "" {
		http.Error(w, `{"error":"no refresh token"}`, http.StatusForbidden)
		return
	}

	myToken, err := auth.GetMyAccountAPIToken(session.RefreshToken)
	if err != nil {
		log.Printf("my account token failed during complete: %v", err)
		http.Error(w, `{"error":"failed to get my account token"}`, http.StatusBadGateway)
		return
	}

	if err := auth.CompleteConnectedAccount(myToken, connectCode, authSession); err != nil {
		log.Printf("complete connected account failed: %v", err)
		http.Error(w, `{"error":"failed to complete connection","details":"`+err.Error()+`"}`, http.StatusBadGateway)
		return
	}

	clearConnectCookies(w)

	if provider != "" {
		kvClient, kvErr := kv.New()
		if kvErr == nil {
			status := ConnectionStatus{
				Provider:    provider,
				Connected:   true,
				ConnectedAt: time.Now().UTC().Format(time.RFC3339),
				TokenStatus: "healthy",
				Scopes:      connectionScopes[provider],
			}
			data, _ := json.Marshal(status)
			_ = kvClient.Set("connection:"+session.UserID+":"+provider, string(data))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"provider": provider,
	})
}

// handleDisconnect removes a connected account via the My Account API and KV.
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

	if session.RefreshToken != "" {
		myToken, err := auth.GetMyAccountAPIToken(session.RefreshToken)
		if err == nil {
			if err := auth.DeleteConnectedAccount(myToken, provider); err != nil {
				log.Printf("delete connected account via API failed: %v", err)
			}
		}
	}

	kvClient, kvErr := kv.New()
	if kvErr == nil {
		_ = kvClient.Delete("connection:" + session.UserID + ":" + provider)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"provider": provider,
	})
}

func clearConnectCookies(w http.ResponseWriter) {
	for _, name := range []string{"connect_auth_session", "connect_provider"} {
		http.SetCookie(w, &http.Cookie{
			Name:   name,
			Value:  "",
			Path:   "/",
			MaxAge: -1,
		})
	}
}

func getBaseURL() string {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://adbrain-chi.vercel.app"
	}
	return baseURL
}
