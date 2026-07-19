# VisionOS Enterprise Terraform Variables (`infra/terraform/variables.tf`)

variable "gcp_project_id" {
  type        = string
  description = "The Google Cloud Project ID for VisionOS"
  default     = "visionos-stadium-prod"
}

variable "primary_region" {
  type        = string
  description = "Primary Cloud Run and Cloud SQL PostGIS region"
  default     = "us-central1"
}

variable "secondary_region" {
  type        = string
  description = "Active-active secondary failover region"
  default     = "us-east4"
}

variable "environment" {
  type        = string
  description = "Deployment environment (production vs staging)"
  default     = "production"
}
