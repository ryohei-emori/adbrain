output "auth0_client_id" {
  description = "Client ID of the AdBrain Regular Web Application (SPA / server callbacks)."
  value       = auth0_client.adbrain_web.client_id
}

output "auth0_domain" {
  description = "Auth0 tenant domain configured for this stack."
  value       = var.auth0_domain
}

output "vercel_project_url" {
  description = "Default Vercel URL for the project (before custom domain)."
  value       = "https://${vercel_project.adbrain.name}.vercel.app"
}
