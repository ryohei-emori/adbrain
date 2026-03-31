package handler

import (
	"encoding/json"
	"net/http"
	"os"
)

type Capabilities struct {
	LLMConfigured     bool     `json:"llm_configured"`
	LLMProviders      []string `json:"llm_providers"`
	ProxyReady        bool     `json:"proxy_ready"`
	GoogleDevToken    bool     `json:"google_developer_token"`
	MetaConfigured    bool     `json:"meta_configured"`
	KVAvailable       bool     `json:"kv_available"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	xaiKey := os.Getenv("XAI_API_KEY")
	geminiKey := os.Getenv("GOOGLE_AI_API_KEY")
	gadsDevToken := os.Getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
	metaAppSecret := os.Getenv("META_APP_SECRET")
	kvURL := os.Getenv("KV_REST_API_URL")
	kvToken := os.Getenv("KV_REST_API_TOKEN")

	var providers []string
	if xaiKey != "" {
		providers = append(providers, "xai-grok")
	}
	if geminiKey != "" {
		providers = append(providers, "google-gemini")
	}

	caps := Capabilities{
		LLMConfigured:  len(providers) > 0,
		LLMProviders:   providers,
		ProxyReady:     gadsDevToken != "" || metaAppSecret != "",
		GoogleDevToken: gadsDevToken != "",
		MetaConfigured: metaAppSecret != "",
		KVAvailable:    kvURL != "" && kvToken != "",
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=300")
	json.NewEncoder(w).Encode(caps)
}
