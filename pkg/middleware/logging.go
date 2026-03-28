package middleware

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type contextKey string

const RequestIDKey contextKey = "request_id"

type RequestLog struct {
	RequestID         string  `json:"request_id"`
	Method            string  `json:"method"`
	Path              string  `json:"path"`
	UserID            string  `json:"user_id,omitempty"`
	StatusCode        int     `json:"status_code"`
	DurationMs        float64 `json:"duration_ms"`
	TokenExchangeMs   float64 `json:"token_exchange_ms,omitempty"`
	ExternalAPIMs     float64 `json:"external_api_ms,omitempty"`
	ExternalAPIStatus int     `json:"external_api_status,omitempty"`
	Provider          string  `json:"provider,omitempty"`
	RiskLevel         string  `json:"risk_level,omitempty"`
	Error             string  `json:"error,omitempty"`
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func GetRequestID(ctx context.Context) string {
	if id, ok := ctx.Value(RequestIDKey).(string); ok {
		return id
	}
	return ""
}

func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, RequestIDKey, requestID)
}

func Logging(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqID := generateUUID()
		ctx := WithRequestID(r.Context(), reqID)
		start := time.Now()

		rec := &statusRecorder{ResponseWriter: w, statusCode: 200}
		handler(rec, r.WithContext(ctx))

		entry := RequestLog{
			RequestID:  reqID,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: rec.statusCode,
			DurationMs: float64(time.Since(start).Milliseconds()),
		}

		data, err := json.Marshal(entry)
		if err == nil {
			log.Println(string(data))
		}
	}
}
