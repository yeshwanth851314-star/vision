# VisionOS Enterprise Terraform Outputs (`infra/terraform/outputs.tf`)

output "vpc_network_name" {
  description = "Name of the zero-trust VPC network"
  value       = google_compute_network.visionos_vpc.name
}

output "postgis_instance_connection_name" {
  description = "Cloud SQL PostGIS connection string (`project:region:instance`)"
  value       = google_sql_database_instance.postgis_primary.connection_name
}

output "api_gateway_service_url" {
  description = "URL of the primary Cloud Run API Gateway cluster"
  value       = google_cloud_run_v2_service.api_gateway.uri
}

output "pubsub_cv_topic" {
  description = "Pub/Sub topic for 1 Hz Concourse CV queue telemetry"
  value       = google_pubsub_topic.cv_crowd_surge.name
}
