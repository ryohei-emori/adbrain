package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/adbrain/adbrain/pkg/auth"
	"github.com/adbrain/adbrain/pkg/kv"
	"github.com/adbrain/adbrain/pkg/middleware"
)

const (
	googleAdsBaseURL = "https://googleads.googleapis.com/v18"
	metaGraphBaseURL = "https://graph.facebook.com/v21.0"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	middleware.Logging(handler)(w, r)
}

func handler(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	switch action {
	case "google-ads":
		handleGoogleAdsProxy(w, r)
	case "meta-ads":
		handleMetaAdsProxy(w, r)
	default:
		http.Error(w, `{"error":"unknown proxy action"}`, http.StatusNotFound)
	}
}

// resolveExternalToken obtains an external provider access token using
// two strategies:
//  1. Auth0 Token Vault (refresh token exchange) — requires session cookie
//  2. KV lookup — the connect callback stores tokens at token:{userID}:{provider}
func resolveExternalToken(session *auth.Session, provider string) (string, time.Duration, error) {
	start := time.Now()

	if session.RefreshToken != "" {
		token, dur, err := auth.ExchangeToken(session.RefreshToken, provider)
		if err == nil {
			return token, dur, nil
		}
		log.Printf("[proxy] token exchange fallthrough: %v, trying KV", err)
	}

	kvClient, err := kv.New()
	if err != nil {
		return "", time.Since(start), fmt.Errorf("no refresh token and KV unavailable: %w", err)
	}

	raw, err := kvClient.Get("token:" + session.UserID + ":" + provider)
	if err != nil || raw == "" {
		return "", time.Since(start), fmt.Errorf("no token in KV for %s:%s", session.UserID, provider)
	}

	var stored struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal([]byte(raw), &stored); err != nil || stored.AccessToken == "" {
		return "", time.Since(start), fmt.Errorf("invalid token data in KV for %s:%s", session.UserID, provider)
	}

	log.Printf("[proxy] resolved token from KV for %s:%s (len=%d)", session.UserID, provider, len(stored.AccessToken))
	return stored.AccessToken, time.Since(start), nil
}

func handleGoogleAdsProxy(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	externalToken, tokenDuration, err := resolveExternalToken(session, "google-ads")
	if err != nil {
		logEntry := middleware.RequestLog{
			RequestID:       reqID,
			Method:          r.Method,
			Path:            r.URL.Path,
			UserID:          session.UserID,
			Provider:        "google-ads",
			TokenExchangeMs: float64(tokenDuration.Milliseconds()),
			Error:           err.Error(),
		}
		logJSON, _ := json.Marshal(logEntry)
		log.Println(string(logJSON))
		http.Error(w, fmt.Sprintf(`{"error":"token resolution failed","details":"%s"}`, err.Error()), http.StatusBadGateway)
		return
	}

	targetPath := r.URL.Query().Get("path")
	if targetPath == "" {
		targetPath = "/customers"
	}
	targetURL := googleAdsBaseURL + targetPath

	proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to create proxy request"}`, http.StatusInternalServerError)
		return
	}

	proxyReq.Header.Set("Authorization", "Bearer "+externalToken)
	proxyReq.Header.Set("Content-Type", "application/json")

	developerToken := os.Getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
	if developerToken != "" {
		proxyReq.Header.Set("developer-token", developerToken)
	}

	loginCustomerID := r.URL.Query().Get("login_customer_id")
	if loginCustomerID != "" {
		proxyReq.Header.Set("login-customer-id", loginCustomerID)
	}

	apiStart := time.Now()
	resp, err := http.DefaultClient.Do(proxyReq)
	apiDuration := time.Since(apiStart)

	if err != nil {
		logEntry := middleware.RequestLog{
			RequestID:       reqID,
			Method:          r.Method,
			Path:            r.URL.Path,
			UserID:          session.UserID,
			Provider:        "google-ads",
			TokenExchangeMs: float64(tokenDuration.Milliseconds()),
			ExternalAPIMs:   float64(apiDuration.Milliseconds()),
			Error:           err.Error(),
		}
		logJSON, _ := json.Marshal(logEntry)
		log.Println(string(logJSON))
		http.Error(w, `{"error":"google ads api request failed"}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	logEntry := middleware.RequestLog{
		RequestID:         reqID,
		Method:            r.Method,
		Path:              r.URL.Path,
		UserID:            session.UserID,
		Provider:          "google-ads",
		StatusCode:        resp.StatusCode,
		TokenExchangeMs:   float64(tokenDuration.Milliseconds()),
		ExternalAPIMs:     float64(apiDuration.Milliseconds()),
		ExternalAPIStatus: resp.StatusCode,
	}
	logJSON, _ := json.Marshal(logEntry)
	log.Println(string(logJSON))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func handleMetaAdsProxy(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	externalToken, tokenDuration, err := resolveExternalToken(session, "meta-ads")
	if err != nil {
		logEntry := middleware.RequestLog{
			RequestID:       reqID,
			Method:          r.Method,
			Path:            r.URL.Path,
			UserID:          session.UserID,
			Provider:        "meta-ads",
			TokenExchangeMs: float64(tokenDuration.Milliseconds()),
			Error:           err.Error(),
		}
		logJSON, _ := json.Marshal(logEntry)
		log.Println(string(logJSON))
		http.Error(w, fmt.Sprintf(`{"error":"token resolution failed","details":"%s"}`, err.Error()), http.StatusBadGateway)
		return
	}

	targetPath := r.URL.Query().Get("path")
	if targetPath == "" {
		targetPath = "/me/adaccounts"
	}
	targetURL := metaGraphBaseURL + targetPath

	proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, `{"error":"failed to create proxy request"}`, http.StatusInternalServerError)
		return
	}

	proxyReq.Header.Set("Authorization", "Bearer "+externalToken)
	proxyReq.Header.Set("Content-Type", "application/json")

	apiStart := time.Now()
	resp, err := http.DefaultClient.Do(proxyReq)
	apiDuration := time.Since(apiStart)

	if err != nil {
		logEntry := middleware.RequestLog{
			RequestID:       reqID,
			Method:          r.Method,
			Path:            r.URL.Path,
			UserID:          session.UserID,
			Provider:        "meta-ads",
			TokenExchangeMs: float64(tokenDuration.Milliseconds()),
			ExternalAPIMs:   float64(apiDuration.Milliseconds()),
			Error:           err.Error(),
		}
		logJSON, _ := json.Marshal(logEntry)
		log.Println(string(logJSON))
		http.Error(w, `{"error":"meta api request failed"}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	logEntry := middleware.RequestLog{
		RequestID:         reqID,
		Method:            r.Method,
		Path:              r.URL.Path,
		UserID:            session.UserID,
		Provider:          "meta-ads",
		StatusCode:        resp.StatusCode,
		TokenExchangeMs:   float64(tokenDuration.Milliseconds()),
		ExternalAPIMs:     float64(apiDuration.Milliseconds()),
		ExternalAPIStatus: resp.StatusCode,
	}
	logJSON, _ := json.Marshal(logEntry)
	log.Println(string(logJSON))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
