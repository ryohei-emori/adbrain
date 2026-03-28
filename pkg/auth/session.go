package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
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
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return nil, errors.New("no session cookie")
	}

	key, err := getSessionSecret()
	if err != nil {
		return nil, err
	}

	plaintext, err := decrypt(cookie.Value, key)
	if err != nil {
		return nil, errors.New("invalid session: decryption failed")
	}

	var session Session
	if err := json.Unmarshal(plaintext, &session); err != nil {
		return nil, errors.New("invalid session: malformed data")
	}

	if time.Now().Unix() > session.ExpiresAt {
		return nil, errors.New("session expired")
	}

	return &session, nil
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
