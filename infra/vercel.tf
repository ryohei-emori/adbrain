locals {
  vercel_team = var.vercel_team_id != "" ? var.vercel_team_id : null

  # Vercel project environment variables (single map → for_each).
  env_vars = {
    AUTH0_DOMAIN = {
      value     = var.auth0_domain
      sensitive = false
    }
    AUTH0_CLIENT_ID = {
      value     = auth0_client.adbrain_web.client_id
      sensitive = false
    }
    AUTH0_CLIENT_SECRET = {
      value     = random_password.adbrain_web_client_secret.result
      sensitive = true
    }
    AUTH0_AUDIENCE = {
      value     = var.auth0_audience
      sensitive = false
    }
    AUTH0_M2M_CLIENT_ID = {
      value     = auth0_client.adbrain_m2m.client_id
      sensitive = false
    }
    AUTH0_M2M_CLIENT_SECRET = {
      value     = random_password.adbrain_m2m_client_secret.result
      sensitive = true
    }
    GOOGLE_ADS_CLIENT_ID = {
      value     = var.google_ads_client_id
      sensitive = false
    }
    GOOGLE_ADS_CLIENT_SECRET = {
      value     = var.google_ads_client_secret
      sensitive = true
    }
    GOOGLE_ADS_DEVELOPER_TOKEN = {
      value     = var.google_ads_developer_token
      sensitive = true
    }
    META_APP_ID = {
      value     = var.meta_app_id
      sensitive = false
    }
    META_APP_SECRET = {
      value     = var.meta_app_secret
      sensitive = true
    }
    XAI_API_KEY = {
      value     = var.xai_api_key
      sensitive = true
    }
    GOOGLE_AI_API_KEY = {
      value     = var.google_ai_api_key
      sensitive = true
    }
    SESSION_SECRET = {
      value     = var.session_secret
      sensitive = true
    }
    AUTH0_LOG_STREAM_TOKEN = {
      value     = var.auth0_log_stream_token
      sensitive = true
    }
    ENVIRONMENT = {
      value     = var.environment
      sensitive = false
    }
    PUBLIC_APP_URL = {
      value     = "https://${var.vercel_domain}"
      sensitive = false
    }
  }
}

resource "vercel_project" "adbrain" {
  name      = "adbrain"
  framework = "vite"

  git_repository = {
    type = "github"
    repo = var.github_repo
  }

  build_command    = "npm run build"
  output_directory = "dist"

  team_id = local.vercel_team
}

resource "vercel_project_environment_variable" "env" {
  for_each = local.env_vars

  project_id = vercel_project.adbrain.id
  team_id    = local.vercel_team
  key        = each.key
  value      = each.value.value
  target     = ["production", "preview", "development"]
  sensitive  = each.value.sensitive
}

resource "vercel_project_domain" "primary" {
  project_id = vercel_project.adbrain.id
  team_id    = local.vercel_team
  domain     = var.vercel_domain
}
