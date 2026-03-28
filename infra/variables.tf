# -----------------------------------------------------------------------------
# Auth0 provider (Terraform Management API client — typically an M2M application)
# -----------------------------------------------------------------------------
variable "auth0_domain" {
  type        = string
  description = "Auth0 tenant domain (e.g. adbrain-dev.us.auth0.com)."
}

variable "auth0_client_id" {
  type        = string
  description = "Client ID of the Auth0 application Terraform uses to call the Management API."
}

variable "auth0_client_secret" {
  type        = string
  sensitive   = true
  description = "Client secret for the Terraform Management API application."
}

# -----------------------------------------------------------------------------
# Vercel provider
# -----------------------------------------------------------------------------
variable "vercel_api_token" {
  type        = string
  sensitive   = true
  description = "Vercel API token with permission to manage the project."
}

variable "github_repo" {
  type        = string
  description = "GitHub repository connected to the Vercel project (format: owner/repo)."
}

variable "vercel_team_id" {
  type        = string
  default     = ""
  description = "Optional Vercel team ID. Leave empty for personal (Hobby) scope."
}

# -----------------------------------------------------------------------------
# Application / Auth0 API
# -----------------------------------------------------------------------------
variable "auth0_audience" {
  type        = string
  description = "Identifier (audience) of the AdBrain API resource server."
}

# Sign in with Google (Auth0 social connection) — distinct from Google Ads OAuth.
variable "google_oauth_client_id" {
  type        = string
  description = "Google OAuth 2.0 client ID for the google-oauth2 Auth0 connection."
}

variable "google_oauth_client_secret" {
  type        = string
  sensitive   = true
  description = "Google OAuth 2.0 client secret for the google-oauth2 Auth0 connection."
}

# -----------------------------------------------------------------------------
# Connected accounts (Token Vault) — Google Ads / Meta
# -----------------------------------------------------------------------------
variable "google_ads_client_id" {
  type        = string
  description = "Google OAuth client ID used for the custom Google Ads (adwords) connection."
}

variable "google_ads_client_secret" {
  type        = string
  sensitive   = true
  description = "Google OAuth client secret for the Google Ads connection."
}

variable "google_ads_developer_token" {
  type        = string
  sensitive   = true
  description = "Google Ads developer token (runtime API access)."
}

variable "meta_app_id" {
  type        = string
  description = "Meta (Facebook) app ID for the Meta Ads OAuth connection."
}

variable "meta_app_secret" {
  type        = string
  sensitive   = true
  description = "Meta app secret for the Meta Ads OAuth connection."
}

# -----------------------------------------------------------------------------
# LLM providers
# -----------------------------------------------------------------------------
variable "xai_api_key" {
  type        = string
  sensitive   = true
  description = "xAI (Grok) API key."
}

variable "google_ai_api_key" {
  type        = string
  sensitive   = true
  description = "Google AI (Gemini) API key."
}

# -----------------------------------------------------------------------------
# App secrets
# -----------------------------------------------------------------------------
variable "session_secret" {
  type        = string
  sensitive   = true
  description = "Secret used to protect cookies / server-side sessions."
}

variable "auth0_log_stream_token" {
  type        = string
  sensitive   = true
  description = "Bearer token verified by /api/webhooks/auth0-logs when receiving Auth0 Log Streams."
}

# -----------------------------------------------------------------------------
# Hostnames & environment
# -----------------------------------------------------------------------------
variable "vercel_domain" {
  type        = string
  description = "Canonical public hostname (e.g. dev.adbrain.vercel.app or custom domain)."
}

variable "environment" {
  type        = string
  description = "Deployment environment label: dev or prod."

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be \"dev\" or \"prod\"."
  }
}
