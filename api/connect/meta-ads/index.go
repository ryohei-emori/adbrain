package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"net/url"
	"os"

	"github.com/adbrain/adbrain/pkg/auth"
)

func Handler(w http.ResponseWriter, r *http.Request) {
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
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://adbrain.vercel.app"
	}

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
