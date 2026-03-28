package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/adbrain/adbrain/pkg/auth"
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

	if errParam != "" {
		desc := r.URL.Query().Get("error_description")
		http.Error(w, fmt.Sprintf(`{"error":"%s","description":"%s"}`, errParam, desc), http.StatusBadRequest)
		return
	}

	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != state {
		http.Error(w, `{"error":"invalid state parameter"}`, http.StatusBadRequest)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:   "oauth_state",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	if code == "" {
		http.Error(w, `{"error":"missing authorization code"}`, http.StatusBadRequest)
		return
	}

	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	clientSecret := os.Getenv("AUTH0_CLIENT_SECRET")
	baseURL := getBaseURL()

	tokenParams := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"redirect_uri":  {baseURL + "/api/auth/callback"},
	}

	tokenResp, err := http.PostForm("https://"+domain+"/oauth/token", tokenParams)
	if err != nil {
		http.Error(w, `{"error":"token exchange failed"}`, http.StatusInternalServerError)
		return
	}
	defer tokenResp.Body.Close()

	tokenBody, _ := io.ReadAll(tokenResp.Body)
	if tokenResp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf(`{"error":"token exchange failed","details":%s}`, string(tokenBody)), http.StatusInternalServerError)
		return
	}

	var tokens tokenResponse
	if err := json.Unmarshal(tokenBody, &tokens); err != nil {
		http.Error(w, `{"error":"failed to parse token response"}`, http.StatusInternalServerError)
		return
	}

	userInfoReq, _ := http.NewRequest("GET", "https://"+domain+"/userinfo", nil)
	userInfoReq.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	userInfoResp, err := http.DefaultClient.Do(userInfoReq)
	if err != nil {
		http.Error(w, `{"error":"failed to get user info"}`, http.StatusInternalServerError)
		return
	}
	defer userInfoResp.Body.Close()

	var userInfo userInfoResponse
	if err := json.NewDecoder(userInfoResp.Body).Decode(&userInfo); err != nil {
		http.Error(w, `{"error":"failed to parse user info"}`, http.StatusInternalServerError)
		return
	}

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

func getBaseURL() string {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://adbrain.vercel.app"
	}
	return baseURL
}
