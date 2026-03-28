package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

type myAccountTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
	Scope       string `json:"scope"`
}

// GetMyAccountAPIToken exchanges an Auth0 refresh token for an access token
// scoped to the My Account API, which is required for Connected Accounts
// operations (connect, complete, disconnect, list).
func GetMyAccountAPIToken(refreshToken string) (string, error) {
	domain := os.Getenv("AUTH0_DOMAIN")
	clientID := os.Getenv("AUTH0_CLIENT_ID")
	clientSecret := os.Getenv("AUTH0_CLIENT_SECRET")

	if domain == "" || clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET must be set")
	}

	audience := "https://" + domain + "/me/"
	scope := strings.Join([]string{
		"openid",
		"profile",
		"offline_access",
		"create:me:connected_accounts",
		"read:me:connected_accounts",
		"delete:me:connected_accounts",
	}, " ")

	params := url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"refresh_token": {refreshToken},
		"audience":      {audience},
		"scope":         {scope},
	}

	resp, err := http.PostForm("https://"+domain+"/oauth/token", params)
	if err != nil {
		return "", fmt.Errorf("my account token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read my account token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("my account token exchange returned status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp myAccountTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("failed to parse my account token response: %w", err)
	}

	if tokenResp.AccessToken == "" {
		return "", fmt.Errorf("my account token exchange returned empty access_token")
	}

	return tokenResp.AccessToken, nil
}

type ConnectedAccount struct {
	Connection  string   `json:"connection"`
	Provider    string   `json:"provider"`
	AccountID   string   `json:"account_id,omitempty"`
	Scopes      []string `json:"scopes,omitempty"`
	ConnectedAt string   `json:"connected_at,omitempty"`
}

type ConnectInitiateResponse struct {
	ConnectURI  string `json:"connect_uri"`
	AuthSession string `json:"auth_session"`
}

// InitiateConnectedAccount calls the My Account API to start the Connected
// Accounts flow for a given connection (e.g. "google-ads", "meta-ads").
func InitiateConnectedAccount(myAccountToken, connection, redirectURI, state string, scopes []string) (*ConnectInitiateResponse, error) {
	domain := os.Getenv("AUTH0_DOMAIN")
	if domain == "" {
		return nil, fmt.Errorf("AUTH0_DOMAIN is not set")
	}

	reqBody := map[string]interface{}{
		"connection":   connection,
		"redirect_uri": redirectURI,
		"state":        state,
	}
	if len(scopes) > 0 {
		reqBody["scopes"] = scopes
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal connect request: %w", err)
	}

	endpoint := "https://" + domain + "/me/v1/connected-accounts/connect"
	req, err := http.NewRequest("POST", endpoint, strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, fmt.Errorf("failed to create connect request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+myAccountToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connect request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read connect response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("connect request returned status %d: %s", resp.StatusCode, string(body))
	}

	var result ConnectInitiateResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse connect response: %w", err)
	}

	return &result, nil
}

// CompleteConnectedAccount calls the My Account API to finalize the Connected
// Accounts flow after the user has authorized with the external provider.
func CompleteConnectedAccount(myAccountToken, connectCode, authSession string) error {
	domain := os.Getenv("AUTH0_DOMAIN")
	if domain == "" {
		return fmt.Errorf("AUTH0_DOMAIN is not set")
	}

	reqBody := map[string]string{
		"connect_code": connectCode,
		"auth_session": authSession,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal complete request: %w", err)
	}

	endpoint := "https://" + domain + "/me/v1/connected-accounts/complete"
	req, err := http.NewRequest("POST", endpoint, strings.NewReader(string(jsonBody)))
	if err != nil {
		return fmt.Errorf("failed to create complete request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+myAccountToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("complete request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("complete request returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// ListConnectedAccounts retrieves all connected accounts for the current user
// via the My Account API.
func ListConnectedAccounts(myAccountToken string) ([]ConnectedAccount, error) {
	domain := os.Getenv("AUTH0_DOMAIN")
	if domain == "" {
		return nil, fmt.Errorf("AUTH0_DOMAIN is not set")
	}

	endpoint := "https://" + domain + "/me/v1/connected-accounts"
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create list request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+myAccountToken)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("list connected accounts request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read list response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("list connected accounts returned status %d: %s", resp.StatusCode, string(body))
	}

	var accounts []ConnectedAccount
	if err := json.Unmarshal(body, &accounts); err != nil {
		return nil, fmt.Errorf("failed to parse connected accounts: %w", err)
	}

	return accounts, nil
}

// DeleteConnectedAccount removes a connected account via the My Account API.
func DeleteConnectedAccount(myAccountToken, connection string) error {
	domain := os.Getenv("AUTH0_DOMAIN")
	if domain == "" {
		return fmt.Errorf("AUTH0_DOMAIN is not set")
	}

	endpoint := "https://" + domain + "/me/v1/connected-accounts/" + url.PathEscape(connection)
	req, err := http.NewRequest("DELETE", endpoint, nil)
	if err != nil {
		return fmt.Errorf("failed to create delete request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+myAccountToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("delete connected account request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete connected account returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
