locals {
  auth0_mgmt_audience = "https://${var.auth0_domain}/api/v2/"
  app_base_url        = "https://${var.vercel_domain}"
}

# -----------------------------------------------------------------------------
# Applications
# -----------------------------------------------------------------------------
resource "random_password" "adbrain_web_client_secret" {
  length  = 64
  special = true
}

resource "random_password" "adbrain_m2m_client_secret" {
  length  = 64
  special = true
}

resource "auth0_client" "adbrain_web" {
  name            = "AdBrain Web"
  app_type        = "regular_web"
  is_first_party  = true
  oidc_conformant = true

  callbacks           = ["${local.app_base_url}/api/auth/callback"]
  allowed_logout_urls = [local.app_base_url]
  allowed_origins     = [local.app_base_url]
  web_origins         = [local.app_base_url]
  initiate_login_uri  = local.app_base_url

  grant_types = [
    "authorization_code",
    "refresh_token",
    "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
  ]

  token_exchange {
    allow_any_profile_of_type = ["custom_authentication"]
  }

  jwt_configuration {
    alg = "RS256"
  }

  refresh_token {
    rotation_type   = "rotating"
    expiration_type = "expiring"
    leeway          = 0
    token_lifetime  = 2592000
  }
}

resource "auth0_client_credentials" "adbrain_web" {
  client_id             = auth0_client.adbrain_web.id
  authentication_method = "client_secret_post"
  client_secret         = random_password.adbrain_web_client_secret.result
}

resource "auth0_client" "adbrain_m2m" {
  name            = "AdBrain M2M"
  description     = "Machine-to-machine client for Auth0 Management API (backend automation)."
  app_type        = "non_interactive"
  is_first_party  = true
  oidc_conformant = true

  grant_types = ["client_credentials"]

  jwt_configuration {
    alg = "RS256"
  }
}

resource "auth0_client_credentials" "adbrain_m2m" {
  client_id             = auth0_client.adbrain_m2m.id
  authentication_method = "client_secret_post"
  client_secret         = random_password.adbrain_m2m_client_secret.result
}

resource "auth0_client_grant" "adbrain_m2m_management" {
  client_id = auth0_client.adbrain_m2m.id
  audience  = local.auth0_mgmt_audience
  scopes = [
    "read:users",
    "update:users",
    "read:connections",
    "update:connections",
    "read:client_grants",
    "read:user_idp_tokens",
  ]
}

# -----------------------------------------------------------------------------
# Connections
# -----------------------------------------------------------------------------
resource "auth0_connection" "google_oauth2" {
  name     = "google-oauth2"
  strategy = "google-oauth2"

  options {
    client_id                = var.google_oauth_client_id
    client_secret            = var.google_oauth_client_secret
    scopes                   = ["email", "profile", "openid"]
    set_user_root_attributes = "on_each_login"
  }
}

resource "auth0_connection" "google_ads" {
  name     = "google-ads"
  strategy = "oauth2"

  options {
    strategy_version         = 2
    client_id                = var.google_ads_client_id
    client_secret            = var.google_ads_client_secret
    authorization_endpoint   = "https://accounts.google.com/o/oauth2/v2/auth"
    token_endpoint           = "https://oauth2.googleapis.com/token"
    scopes                   = ["https://www.googleapis.com/auth/adwords"]
    set_user_root_attributes = "on_each_login"
    pkce_enabled             = true

    scripts = {
      fetchUserProfile = <<-JS
        function fetchUserProfile(accessToken, ctx, callback) {
          const https = require('https');
          const req = https.request(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              method: 'GET',
              headers: { Authorization: 'Bearer ' + accessToken },
            },
            (res) => {
              let body = '';
              res.on('data', (c) => { body += c; });
              res.on('end', () => {
                try {
                  const p = JSON.parse(body);
                  return callback(null, {
                    user_id: p.sub,
                    email: p.email,
                    name: p.name,
                    given_name: p.given_name,
                    family_name: p.family_name,
                    picture: p.picture,
                  });
                } catch (e) {
                  return callback(e);
                }
              });
            }
          );
          req.on('error', callback);
          req.end();
        }
      JS
    }
  }
}

resource "auth0_connection" "meta_ads" {
  name     = "meta-ads"
  strategy = "oauth2"

  options {
    strategy_version         = 2
    client_id                = var.meta_app_id
    client_secret            = var.meta_app_secret
    authorization_endpoint   = "https://www.facebook.com/v21.0/dialog/oauth"
    token_endpoint           = "https://graph.facebook.com/v21.0/oauth/access_token"
    scopes                   = ["ads_management", "ads_read"]
    set_user_root_attributes = "on_each_login"
    pkce_enabled             = true

    scripts = {
      fetchUserProfile = <<-JS
        function fetchUserProfile(accessToken, ctx, callback) {
          const https = require('https');
          const u = 'https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=' +
            encodeURIComponent(accessToken);
          https.get(u, (res) => {
            let body = '';
            res.on('data', (c) => { body += c; });
            res.on('end', () => {
              try {
                const p = JSON.parse(body);
                return callback(null, {
                  user_id: p.id,
                  email: p.email,
                  name: p.name,
                });
              } catch (e) {
                return callback(e);
              }
            });
          }).on('error', callback);
        }
      JS
    }
  }
}

resource "auth0_connection" "username_password" {
  name     = "Username-Password-Authentication"
  strategy = "auth0"

  options {
    strategy_version       = 2
    requires_username      = false
    disable_signup         = var.environment == "prod"
    brute_force_protection = true
    password_policy        = "good"

    password_complexity_options {
      min_length = 8
    }

    password_history {
      enable = true
      size   = 3
    }

    password_no_personal_info {
      enable = true
    }
  }
}

resource "auth0_connection_clients" "google_oauth2_clients" {
  connection_id   = auth0_connection.google_oauth2.id
  enabled_clients = [auth0_client.adbrain_web.id]
}

resource "auth0_connection_clients" "google_ads_clients" {
  connection_id   = auth0_connection.google_ads.id
  enabled_clients = [auth0_client.adbrain_web.id]
}

resource "auth0_connection_clients" "meta_ads_clients" {
  connection_id   = auth0_connection.meta_ads.id
  enabled_clients = [auth0_client.adbrain_web.id]
}

resource "auth0_connection_clients" "username_password_clients" {
  connection_id   = auth0_connection.username_password.id
  enabled_clients = [auth0_client.adbrain_web.id]
}

# -----------------------------------------------------------------------------
# Post Login Action — step-up MFA
# -----------------------------------------------------------------------------
resource "auth0_action" "step_up_mfa" {
  name    = "step-up-mfa"
  runtime = "node22"
  deploy  = true
  code    = file("${path.module}/actions/step-up-mfa.js")

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }
}

resource "auth0_trigger_action" "post_login_step_up" {
  trigger   = "post-login"
  action_id = auth0_action.step_up_mfa.id
}

# -----------------------------------------------------------------------------
# Log stream → Vercel webhook
# -----------------------------------------------------------------------------
resource "auth0_log_stream" "vercel_webhook" {
  name   = "vercel-log-drain"
  type   = "http"
  status = "active"

  sink {
    http_endpoint       = "${local.app_base_url}/api/webhooks/auth0-logs"
    http_content_type   = "application/json"
    http_content_format = "JSONOBJECT"
    http_authorization  = "Bearer ${var.auth0_log_stream_token}"
  }
}
