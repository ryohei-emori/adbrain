package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/adbrain/adbrain/pkg/kv"
)

// Handler is the dedicated callback for connect (OAuth account linking) flows.
// Using a separate endpoint avoids all state/cookie detection issues in the
// shared /api/auth/callback handler.
func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	errParam := r.URL.Query().Get("error")
	baseURL := getBaseURL()

	log.Printf("[connectcb] code=%v state_len=%d error=%q", code != "", len(state), errParam)

	returnTo := "/dashboard/connections"
	userID := ""
	provider := ""

	if cookie, err := r.Cookie("connect_state"); err == nil && cookie.Value != "" {
		parts := strings.SplitN(cookie.Value, "|", 3)
		stateParts := strings.SplitN(parts[0], ":", 3)
		if len(stateParts) >= 2 {
			provider = stateParts[1]
		}
		if len(parts) >= 2 {
			userID = parts[1]
		}
		if len(parts) >= 3 {
			returnTo = parts[2]
		}
		log.Printf("[connectcb] cookie: provider=%s userID=%s returnTo=%s", provider, userID, returnTo)
	} else {
		// Fallback: extract provider from state prefix
		if strings.HasPrefix(state, "connect:") {
			sp := strings.SplitN(state, ":", 3)
			if len(sp) >= 2 {
				provider = sp[1]
			}
		}
		log.Printf("[connectcb] no cookie, fallback provider=%s", provider)
	}

	if errParam != "" {
		desc := r.URL.Query().Get("error_description")
		sep := "?"
		if strings.Contains(returnTo, "?") {
			sep = "&"
		}
		http.Redirect(w, r, baseURL+returnTo+sep+"connect_error="+url.QueryEscape(desc), http.StatusFound)
		return
	}

	if code == "" {
		http.Redirect(w, r, baseURL+returnTo+"?connect_error=missing_code", http.StatusFound)
		return
	}

	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	clientSecret := os.Getenv("AUTH0_CLIENT_SECRET")

	tokenParams := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"redirect_uri":  {baseURL + "/api/connectcb"},
	}

	tokenResp, err := http.PostForm("https://"+domain+"/oauth/token", tokenParams)
	if err != nil {
		log.Printf("[connectcb] token exchange error: %v", err)
		redirectError(w, r, baseURL, returnTo, "token_exchange_failed")
		return
	}
	defer tokenResp.Body.Close()

	var tokens struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		IDToken      string `json:"id_token"`
		Error        string `json:"error"`
		ErrorDesc    string `json:"error_description"`
	}
	if err := json.NewDecoder(tokenResp.Body).Decode(&tokens); err != nil || tokens.Error != "" {
		log.Printf("[connectcb] token decode err=%v api_error=%s desc=%s", err, tokens.Error, tokens.ErrorDesc)
		redirectError(w, r, baseURL, returnTo, "token_error")
		return
	}

	log.Printf("[connectcb] token exchange OK, access_token_len=%d", len(tokens.AccessToken))

	// Get user info from the access token to identify the linked account
	userInfoResp, err := http.Get("https://" + domain + "/userinfo?access_token=" + tokens.AccessToken)
	if err == nil {
		defer userInfoResp.Body.Close()
		var ui struct {
			Sub string `json:"sub"`
		}
		json.NewDecoder(userInfoResp.Body).Decode(&ui)
		if userID == "" && ui.Sub != "" {
			userID = ui.Sub
		}
		log.Printf("[connectcb] userinfo sub=%s", ui.Sub)
	}

	if provider == "" {
		provider = "google-ads"
	}
	if userID == "" {
		log.Printf("[connectcb] no userID, redirecting with error")
		redirectError(w, r, baseURL, returnTo, "no_user_id")
		return
	}

	// Store connection in KV
	kvClient, kvErr := kv.New()
	if kvErr == nil {
		scopes := map[string][]string{
			"google-ads": {"https://www.googleapis.com/auth/adwords", "openid", "profile", "email"},
			"meta-ads":   {"ads_management", "ads_read", "email"},
		}
		names := map[string]string{
			"google-ads": "Google Ads",
			"meta-ads":   "Meta Ads",
		}

		type ConnStatus struct {
			Provider    string   `json:"provider"`
			Connected   bool     `json:"connected"`
			ConnectedAt string   `json:"connected_at"`
			TokenStatus string   `json:"token_status"`
			Scopes      []string `json:"scopes,omitempty"`
			AccountName string   `json:"account_name,omitempty"`
		}

		status := ConnStatus{
			Provider:    provider,
			Connected:   true,
			ConnectedAt: time.Now().UTC().Format(time.RFC3339),
			TokenStatus: "healthy",
			Scopes:      scopes[provider],
			AccountName: names[provider] + " Account",
		}
		data, _ := json.Marshal(status)
		_ = kvClient.Set("connection:"+userID+":"+provider, string(data))

		tokenData, _ := json.Marshal(map[string]string{
			"access_token": tokens.AccessToken,
		})
		_ = kvClient.Set("token:"+userID+":"+provider, string(tokenData))
		log.Printf("[connectcb] stored connection for %s:%s", userID, provider)
	} else {
		log.Printf("[connectcb] KV unavailable: %v", kvErr)
	}

	// Clear connect_state cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "connect_state",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	sep := "?"
	if strings.Contains(returnTo, "?") {
		sep = "&"
	}
	redirectURL := baseURL + returnTo + sep + "connected=" + provider
	log.Printf("[connectcb] success, redirecting to %s", redirectURL)
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

func redirectError(w http.ResponseWriter, r *http.Request, baseURL, returnTo, errMsg string) {
	sep := "?"
	if strings.Contains(returnTo, "?") {
		sep = "&"
	}
	http.Redirect(w, r, baseURL+returnTo+sep+"connect_error="+url.QueryEscape(errMsg), http.StatusFound)
}

func getBaseURL() string {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://adbrain-chi.vercel.app"
	}
	return baseURL
}
