package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/adbrain/adbrain/pkg/auth"
	"github.com/adbrain/adbrain/pkg/middleware"
)

const metaGraphBaseURL = "https://graph.facebook.com/v21.0"

func Handler(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())

	session, err := auth.GetSession(r)
	if err != nil {
		http.Error(w, `{"error":"not authenticated"}`, http.StatusUnauthorized)
		return
	}

	if session.RefreshToken == "" {
		http.Error(w, `{"error":"no refresh token available, please re-authenticate"}`, http.StatusForbidden)
		return
	}

	externalToken, tokenExchangeDuration, err := auth.ExchangeToken(session.RefreshToken, "meta-ads")
	if err != nil {
		logEntry := middleware.RequestLog{
			RequestID:       reqID,
			Method:          r.Method,
			Path:            r.URL.Path,
			UserID:          session.UserID,
			Provider:        "meta-ads",
			TokenExchangeMs: float64(tokenExchangeDuration.Milliseconds()),
			Error:           err.Error(),
		}
		logJSON, _ := json.Marshal(logEntry)
		log.Println(string(logJSON))
		http.Error(w, fmt.Sprintf(`{"error":"token exchange failed","details":"%s"}`, err.Error()), http.StatusBadGateway)
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
			TokenExchangeMs: float64(tokenExchangeDuration.Milliseconds()),
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
		TokenExchangeMs:   float64(tokenExchangeDuration.Milliseconds()),
		ExternalAPIMs:     float64(apiDuration.Milliseconds()),
		ExternalAPIStatus: resp.StatusCode,
	}
	logJSON, _ := json.Marshal(logEntry)
	log.Println(string(logJSON))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
