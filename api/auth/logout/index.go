package handler

import (
	"net/http"
	"net/url"
	"os"

	"github.com/adbrain/adbrain/pkg/auth"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	auth.DestroySession(w)

	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://adbrain.vercel.app"
	}

	params := url.Values{
		"client_id": {clientID},
		"returnTo":  {baseURL},
	}

	logoutURL := "https://" + domain + "/v2/logout?" + params.Encode()
	http.Redirect(w, r, logoutURL, http.StatusFound)
}
