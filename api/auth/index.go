package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/adbrain/adbrain/pkg/auth"
	"github.com/adbrain/adbrain/pkg/kv"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	switch action {
	case "login":
		handleLogin(w, r)
	case "logout":
		handleLogout(w, r)
	case "me":
		handleMe(w, r)
	case "callback":
		handleCallback(w, r)
	default:
		http.Error(w, `{"error":"unknown auth action"}`, http.StatusNotFound)
	}
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
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
	state := hex.EncodeToString(stateBytes)

	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	params := url.Values{
		"response_type": {"code"},
		"client_id":     {clientID},
		"redirect_uri":  {baseURL + "/api/auth/callback"},
		"scope":         {"openid email profile offline_access"},
		"connection":    {"google-oauth2"},
		"state":         {state},
	}

	authorizeURL := "https://" + domain + "/authorize?" + params.Encode()
	http.Redirect(w, r, authorizeURL, http.StatusFound)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	auth.DestroySession(w)

	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	baseURL := getBaseURL()

	params := url.Values{
		"client_id": {clientID},
		"returnTo":  {baseURL},
	}

	logoutURL := "https://" + domain + "/v2/logout?" + params.Encode()
	http.Redirect(w, r, logoutURL, http.StatusFound)
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	session, err := auth.GetSession(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "not authenticated",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"user_id": session.UserID,
		"email":   session.Email,
		"name":    session.Name,
		"picture": session.Picture,
	})
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

type userInfoResponse struct {
	Sub     string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func handleCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	errParam := r.URL.Query().Get("error")
	baseURL := getBaseURL()

	// Detect Connect flow via ?flow=connect query param (set in redirect_uri)
	flowParam := r.URL.Query().Get("flow")
	providerParam := r.URL.Query().Get("provider")
	isConnectFlow := flowParam == "connect" && providerParam != ""
	connectProvider := providerParam

	// Read connect_state cookie for userID and returnTo
	var connectCookie *http.Cookie
	if c, err := r.Cookie("connect_state"); err == nil && c.Value != "" {
		connectCookie = c
	}

	// Fallback detection: state prefix or cookie
	if !isConnectFlow {
		if strings.HasPrefix(state, "connect:") {
			isConnectFlow = true
			parts := strings.SplitN(state, ":", 3)
			if len(parts) >= 2 {
				connectProvider = parts[1]
			}
		} else if connectCookie != nil {
			isConnectFlow = true
			cookieParts := strings.SplitN(connectCookie.Value, "|", 3)
			stateParts := strings.SplitN(cookieParts[0], ":", 3)
			if len(stateParts) >= 2 {
				connectProvider = stateParts[1]
			}
		}
	}

	log.Printf("[callback] flow=%q provider=%q isConnect=%v state_prefix=%q cookie=%v",
		flowParam, providerParam, isConnectFlow, state[:min(len(state), 20)], connectCookie != nil)

	if errParam != "" {
		desc := r.URL.Query().Get("error_description")
		if isConnectFlow {
			connectReturnTo := "/dashboard/connections"
			if connectCookie != nil {
				parts := strings.SplitN(connectCookie.Value, "|", 3)
				if len(parts) >= 3 {
					connectReturnTo = parts[2]
				}
			}
			sep := "?"
			if strings.Contains(connectReturnTo, "?") {
				sep = "&"
			}
			http.Redirect(w, r, baseURL+connectReturnTo+sep+"connect_error="+url.QueryEscape(desc), http.StatusFound)
			return
		}
		http.Error(w, fmt.Sprintf(`{"error":"%s","description":"%s"}`, errParam, desc), http.StatusBadRequest)
		return
	}

	if !isConnectFlow {
		stateCookie, err := r.Cookie("oauth_state")
		if err != nil || stateCookie.Value != state {
			log.Printf("[callback] No valid oauth_state or connect_state, redirecting to landing")
			http.Redirect(w, r, baseURL+"/", http.StatusFound)
			return
		}
		http.SetCookie(w, &http.Cookie{
			Name:   "oauth_state",
			Value:  "",
			Path:   "/",
			MaxAge: -1,
		})
	}

	if code == "" {
		if isConnectFlow {
			connectErrorRedirect(w, r, baseURL, "missing_code")
			return
		}
		http.Error(w, `{"error":"missing authorization code"}`, http.StatusBadRequest)
		return
	}

	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	clientSecret := os.Getenv("AUTH0_CLIENT_SECRET")

	// redirect_uri must match exactly what was used in /authorize
	redirectURI := baseURL + "/api/auth/callback"
	if isConnectFlow && connectProvider != "" {
		redirectURI = baseURL + "/api/auth/callback?flow=connect&provider=" + url.QueryEscape(connectProvider)
	}

	tokenParams := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	}

	tokenResp, err := http.PostForm("https://"+domain+"/oauth/token", tokenParams)
	if err != nil {
		if isConnectFlow {
			connectErrorRedirect(w, r, baseURL, "token_exchange_failed")
			return
		}
		http.Error(w, `{"error":"token exchange failed"}`, http.StatusInternalServerError)
		return
	}
	defer tokenResp.Body.Close()

	tokenBody, _ := io.ReadAll(tokenResp.Body)
	if tokenResp.StatusCode != http.StatusOK {
		if isConnectFlow {
			log.Printf("connect token exchange failed (status %d): %s", tokenResp.StatusCode, string(tokenBody))
			connectErrorRedirect(w, r, baseURL, "token_exchange_error")
			return
		}
		http.Error(w, fmt.Sprintf(`{"error":"token exchange failed","details":%s}`, string(tokenBody)), http.StatusInternalServerError)
		return
	}

	var tokens tokenResponse
	if err := json.Unmarshal(tokenBody, &tokens); err != nil {
		if isConnectFlow {
			connectErrorRedirect(w, r, baseURL, "parse_error")
			return
		}
		http.Error(w, `{"error":"failed to parse token response"}`, http.StatusInternalServerError)
		return
	}

	userInfoReq, _ := http.NewRequest("GET", "https://"+domain+"/userinfo", nil)
	userInfoReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	userInfoResp, err := http.DefaultClient.Do(userInfoReq)
	if err != nil {
		if isConnectFlow {
			connectErrorRedirect(w, r, baseURL, "userinfo_failed")
			return
		}
		http.Error(w, `{"error":"failed to get user info"}`, http.StatusInternalServerError)
		return
	}
	defer userInfoResp.Body.Close()

	var userInfo userInfoResponse
	if err := json.NewDecoder(userInfoResp.Body).Decode(&userInfo); err != nil {
		if isConnectFlow {
			connectErrorRedirect(w, r, baseURL, "userinfo_parse_error")
			return
		}
		http.Error(w, `{"error":"failed to parse user info"}`, http.StatusInternalServerError)
		return
	}

	// Connect flow: store connection in KV, redirect to originating page
	if isConnectFlow && connectProvider != "" {
		returnTo := "/dashboard/connections"
		originalUserID := userInfo.Sub
		if connectCookie != nil {
			parts := strings.SplitN(connectCookie.Value, "|", 3)
			if len(parts) >= 2 && parts[1] != "" {
				originalUserID = parts[1]
			}
			if len(parts) >= 3 {
				returnTo = parts[2]
			}
		}
		log.Printf("[callback] Connect callback: provider=%s userID=%s returnTo=%s", connectProvider, originalUserID, returnTo)
		handleConnectCallback(w, r, originalUserID, connectProvider, tokens.AccessToken, baseURL, returnTo)
		return
	}

	// Normal login flow: create session
	session := &auth.Session{
		UserID:       userInfo.Sub,
		Email:        userInfo.Email,
		Name:         userInfo.Name,
		Picture:      userInfo.Picture,
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	}

	if err := auth.CreateSession(w, session); err != nil {
		http.Error(w, `{"error":"failed to create session"}`, http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, baseURL+"/dashboard", http.StatusFound)
}

func handleConnectCallback(w http.ResponseWriter, r *http.Request, userID, provider, accessToken, baseURL, returnTo string) {
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
			"access_token": accessToken,
		})
		_ = kvClient.Set("token:"+userID+":"+provider, string(tokenData))
	}

	http.SetCookie(w, &http.Cookie{
		Name:   "connect_state",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	log.Printf("OAuth connect successful: provider=%s user=%s return_to=%s", provider, userID, returnTo)
	sep := "?"
	if strings.Contains(returnTo, "?") {
		sep = "&"
	}
	http.Redirect(w, r, baseURL+returnTo+sep+"connected="+provider, http.StatusFound)
}

func connectErrorRedirect(w http.ResponseWriter, r *http.Request, baseURL, errMsg string) {
	returnTo := "/dashboard/connections"
	if cookie, err := r.Cookie("connect_state"); err == nil {
		parts := strings.SplitN(cookie.Value, "|", 3)
		if len(parts) >= 3 {
			returnTo = parts[2]
		}
	}
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
