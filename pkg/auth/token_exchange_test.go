package auth

import (
	"os"
	"testing"
)

func TestBuildTokenExchangeParams_GrantType(t *testing.T) {
	os.Setenv("AUTH0_CLIENT_ID", "test-client-id")
	os.Setenv("AUTH0_CLIENT_SECRET", "test-client-secret")
	defer func() {
		os.Unsetenv("AUTH0_CLIENT_ID")
		os.Unsetenv("AUTH0_CLIENT_SECRET")
	}()

	params := BuildTokenExchangeParams("test-refresh-token", "google-ads")

	expected := "urn:auth0:params:oauth:grant-type:token-exchange"
	if got := params.Get("grant_type"); got != expected {
		t.Errorf("grant_type = %q, want %q", got, expected)
	}
}

func TestBuildTokenExchangeParams_SubjectToken(t *testing.T) {
	os.Setenv("AUTH0_CLIENT_ID", "test-client-id")
	os.Setenv("AUTH0_CLIENT_SECRET", "test-client-secret")
	defer func() {
		os.Unsetenv("AUTH0_CLIENT_ID")
		os.Unsetenv("AUTH0_CLIENT_SECRET")
	}()

	refreshToken := "my-refresh-token-123"
	params := BuildTokenExchangeParams(refreshToken, "google-ads")

	if got := params.Get("subject_token"); got != refreshToken {
		t.Errorf("subject_token = %q, want %q", got, refreshToken)
	}
}

func TestBuildTokenExchangeParams_SubjectTokenType(t *testing.T) {
	os.Setenv("AUTH0_CLIENT_ID", "test-client-id")
	os.Setenv("AUTH0_CLIENT_SECRET", "test-client-secret")
	defer func() {
		os.Unsetenv("AUTH0_CLIENT_ID")
		os.Unsetenv("AUTH0_CLIENT_SECRET")
	}()

	params := BuildTokenExchangeParams("token", "google-ads")

	expected := "urn:ietf:params:oauth:token-type:refresh_token"
	if got := params.Get("subject_token_type"); got != expected {
		t.Errorf("subject_token_type = %q, want %q", got, expected)
	}
}

func TestBuildTokenExchangeParams_RequestedTokenType(t *testing.T) {
	os.Setenv("AUTH0_CLIENT_ID", "test-client-id")
	os.Setenv("AUTH0_CLIENT_SECRET", "test-client-secret")
	defer func() {
		os.Unsetenv("AUTH0_CLIENT_ID")
		os.Unsetenv("AUTH0_CLIENT_SECRET")
	}()

	params := BuildTokenExchangeParams("token", "google-ads")

	expected := "urn:auth0:params:oauth:token-type:external-provider-token"
	if got := params.Get("requested_token_type"); got != expected {
		t.Errorf("requested_token_type = %q, want %q", got, expected)
	}
}

func TestBuildTokenExchangeParams_ClientCredentials(t *testing.T) {
	os.Setenv("AUTH0_CLIENT_ID", "my-client-id")
	os.Setenv("AUTH0_CLIENT_SECRET", "my-client-secret")
	defer func() {
		os.Unsetenv("AUTH0_CLIENT_ID")
		os.Unsetenv("AUTH0_CLIENT_SECRET")
	}()

	params := BuildTokenExchangeParams("token", "google-ads")

	if got := params.Get("client_id"); got != "my-client-id" {
		t.Errorf("client_id = %q, want %q", got, "my-client-id")
	}
	if got := params.Get("client_secret"); got != "my-client-secret" {
		t.Errorf("client_secret = %q, want %q", got, "my-client-secret")
	}
}

func TestBuildTokenExchangeParams_Connection(t *testing.T) {
	os.Setenv("AUTH0_CLIENT_ID", "test-client-id")
	os.Setenv("AUTH0_CLIENT_SECRET", "test-client-secret")
	defer func() {
		os.Unsetenv("AUTH0_CLIENT_ID")
		os.Unsetenv("AUTH0_CLIENT_SECRET")
	}()

	tests := []struct {
		connection string
	}{
		{"google-ads"},
		{"meta-ads"},
	}

	for _, tt := range tests {
		t.Run(tt.connection, func(t *testing.T) {
			params := BuildTokenExchangeParams("token", tt.connection)
			if got := params.Get("connection"); got != tt.connection {
				t.Errorf("connection = %q, want %q", got, tt.connection)
			}
		})
	}
}

func TestBuildTokenExchangeParams_AllFieldsPresent(t *testing.T) {
	os.Setenv("AUTH0_CLIENT_ID", "cid")
	os.Setenv("AUTH0_CLIENT_SECRET", "csecret")
	defer func() {
		os.Unsetenv("AUTH0_CLIENT_ID")
		os.Unsetenv("AUTH0_CLIENT_SECRET")
	}()

	params := BuildTokenExchangeParams("refresh", "google-ads")

	requiredKeys := []string{
		"grant_type",
		"subject_token",
		"subject_token_type",
		"requested_token_type",
		"client_id",
		"client_secret",
		"connection",
	}

	for _, key := range requiredKeys {
		if params.Get(key) == "" {
			t.Errorf("expected parameter %q to be present and non-empty", key)
		}
	}
}

func TestTokenExchangeError_ErrorString(t *testing.T) {
	err := &TokenExchangeError{
		ErrorCode:   "invalid_grant",
		Description: "the refresh token is expired",
	}

	got := err.Error()
	expected := "token exchange failed: invalid_grant - the refresh token is expired"
	if got != expected {
		t.Errorf("Error() = %q, want %q", got, expected)
	}
}
