package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type Session struct {
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Picture      string `json:"picture"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

const (
	cookieName     = "adbrain_session"
	sessionMaxAge  = 7 * 24 * 3600 // 7 days
)

func getSessionSecret() ([]byte, error) {
	secret := os.Getenv("SESSION_SECRET")
	if secret == "" {
		return nil, errors.New("SESSION_SECRET environment variable is not set")
	}
	decoded, err := base64.StdEncoding.DecodeString(secret)
	if err != nil {
		return []byte(secret), nil
	}
	if len(decoded) != 32 {
		key := make([]byte, 32)
		copy(key, decoded)
		return key, nil
	}
	return decoded, nil
}

func encrypt(plaintext, key []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, plaintext, nil)
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

func decrypt(encoded string, key []byte) ([]byte, error) {
	ciphertext, err := base64.URLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := aesGCM.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	return aesGCM.Open(nil, nonce, ciphertext, nil)
}

func CreateSession(w http.ResponseWriter, session *Session) error {
	key, err := getSessionSecret()
	if err != nil {
		return err
	}

	session.ExpiresAt = time.Now().Add(time.Duration(sessionMaxAge) * time.Second).Unix()

	data, err := json.Marshal(session)
	if err != nil {
		return err
	}

	encrypted, err := encrypt(data, key)
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    encrypted,
		Path:     "/",
		MaxAge:   sessionMaxAge,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
	return nil
}

func GetSession(r *http.Request) (*Session, error) {
	// Strategy 1: encrypted session cookie
	cookie, err := r.Cookie(cookieName)
	if err == nil {
		key, err := getSessionSecret()
		if err == nil {
			plaintext, err := decrypt(cookie.Value, key)
			if err == nil {
				var session Session
				if json.Unmarshal(plaintext, &session) == nil && time.Now().Unix() <= session.ExpiresAt {
					return &session, nil
				}
			}
		}
	}

	// Strategy 2: Auth0 Bearer token
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token := authHeader[7:]
		session, err := resolveAuth0Token(token)
		if err != nil {
			log.Printf("[GetSession] Bearer token resolve failed: %v (token length: %d)", err, len(token))
		} else {
			log.Printf("[GetSession] Bearer token resolved: userID=%s", session.UserID)
			return session, nil
		}
	} else {
		log.Printf("[GetSession] No Bearer header found (auth header length: %d)", len(authHeader))
	}

	return nil, errors.New("not authenticated")
}

func resolveAuth0Token(accessToken string) (*Session, error) {
	// Try JWT decode first (Auth0 access tokens with audience are JWTs)
	if session, err := decodeJWTPayload(accessToken); err == nil {
		return session, nil
	}

	// Fallback: call Auth0 /userinfo for opaque tokens
	domain := os.Getenv("AUTH0_DOMAIN")
	if domain == "" {
		return nil, errors.New("AUTH0_DOMAIN not set")
	}

	req, err := http.NewRequest("GET", "https://"+domain+"/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, errors.New("auth0 userinfo returned " + resp.Status)
	}

	var info struct {
		Sub     string `json:"sub"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}

	return &Session{
		UserID:      info.Sub,
		Email:       info.Email,
		Name:        info.Name,
		Picture:     info.Picture,
		AccessToken: accessToken,
	}, nil
}

// decodeJWTPayload extracts claims from a JWT without signature verification.
// Auth0 JWTs are <header>.<payload>.<signature> — we decode the payload segment.
func decodeJWTPayload(token string) (*Session, error) {
	parts := strings.SplitN(token, ".", 3)
	if len(parts) != 3 {
		return nil, errors.New("not a JWT")
	}

	payload := parts[1]
	// base64url → standard base64
	payload = strings.ReplaceAll(payload, "-", "+")
	payload = strings.ReplaceAll(payload, "_", "/")
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}

	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return nil, err
	}

	var claims struct {
		Sub   string `json:"sub"`
		Email string `json:"email"`
		Name  string `json:"name"`
		Exp   int64  `json:"exp"`

		// Auth0 custom namespace claims or /userinfo fields
		Picture string `json:"picture"`
	}
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return nil, err
	}

	if claims.Sub == "" {
		return nil, errors.New("JWT missing sub claim")
	}

	if claims.Exp > 0 && time.Now().Unix() > claims.Exp {
		return nil, errors.New("JWT expired")
	}

	return &Session{
		UserID:      claims.Sub,
		Email:       claims.Email,
		Name:        claims.Name,
		Picture:     claims.Picture,
		AccessToken: token,
	}, nil
}

func DestroySession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
}
