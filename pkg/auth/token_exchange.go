package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

type TokenExchangeResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type TokenExchangeError struct {
	ErrorCode   string `json:"error"`
	Description string `json:"error_description"`
}

func (e *TokenExchangeError) Error() string {
	return fmt.Sprintf("token exchange failed: %s - %s", e.ErrorCode, e.Description)
}

func BuildTokenExchangeParams(refreshToken, connection string) url.Values {
	return url.Values{
		"grant_type":           {"urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token"},
		"subject_token":        {refreshToken},
		"subject_token_type":   {"urn:ietf:params:oauth:token-type:refresh_token"},
		"requested_token_type": {"urn:auth0:params:oauth:token-type:external-provider-token"},
		"client_id":            {os.Getenv("AUTH0_CLIENT_ID")},
		"client_secret":        {os.Getenv("AUTH0_CLIENT_SECRET")},
		"connection":           {connection},
	}
}

// ExchangeToken performs Auth0 Token Exchange (RFC 8693) to obtain an external
// provider token from Token Vault, given the user's Auth0 refresh token.
func ExchangeToken(refreshToken, connection string) (string, time.Duration, error) {
	domain := os.Getenv("AUTH0_DOMAIN")
	if domain == "" {
		return "", 0, fmt.Errorf("AUTH0_DOMAIN is not set")
	}

	params := BuildTokenExchangeParams(refreshToken, connection)

	start := time.Now()
	resp, err := http.PostForm("https://"+domain+"/oauth/token", params)
	elapsed := time.Since(start)
	if err != nil {
		return "", elapsed, fmt.Errorf("token exchange request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", elapsed, fmt.Errorf("failed to read token exchange response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var tokenErr TokenExchangeError
		if json.Unmarshal(body, &tokenErr) == nil && tokenErr.ErrorCode != "" {
			return "", elapsed, &tokenErr
		}
		return "", elapsed, fmt.Errorf("token exchange returned status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenExchangeResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", elapsed, fmt.Errorf("failed to parse token exchange response: %w", err)
	}

	if tokenResp.AccessToken == "" {
		return "", elapsed, fmt.Errorf("token exchange returned empty access_token")
	}

	return tokenResp.AccessToken, elapsed, nil
}
