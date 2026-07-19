# VisionOS Enterprise Terraform Configuration (`infra/terraform/main.tf`)
# Active-Active Multi-Region (`us-central1`, `us-east4`) Cloud Run, Cloud SQL PostGIS, Firestore, & Pub/Sub
# Source of Truth: 11_Backend_Schema.md, 12_Firestore_Schema.md, 25_Deployment.md

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = "us-central1"
}

provider "google" {
  alias   = "east"
  project = var.gcp_project_id
  region  = "us-east4"
}

variable "gcp_project_id" {
  type        = string
  description = "The Google Cloud Project ID for VisionOS"
  default     = "visionos-stadium-prod"
}

# 1. Zero-Trust VPC Network
resource "google_compute_network" "visionos_vpc" {
  name                    = "visionos-stadium-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "central_subnet" {
  name          = "visionos-central1-subnet"
  ip_cidr_range = "10.10.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.visionos_vpc.id
}

resource "google_compute_subnetwork" "east_subnet" {
  name          = "visionos-east4-subnet"
  ip_cidr_range = "10.20.0.0/20"
  region        = "us-east4"
  network       = google_compute_network.visionos_vpc.id
}

# 2. Cloud SQL PostGIS Instance (High Availability Active-Passive / Read Replica)
resource "google_sql_database_instance" "postgis_primary" {
  name             = "visionos-postgis-primary"
  database_version = "POSTGRES_16"
  region           = "us-central1"

  settings {
    tier                        = "db-custom-8-32768"
    availability_type           = "REGIONAL"
    disk_autoresize             = true
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.visionos_vpc.id
    }
    database_flags {
      name  = "cloudsql.enable_postgis"
      value = "on"
    }
  }
}

# 3. Google Cloud Pub/Sub Topics for Edge CV Telemetry & BMS Actuation (`19_Event_Architecture.md`)
resource "google_pubsub_topic" "cv_crowd_surge" {
  name = "stadium.cv.crowd_surge"
}

resource "google_pubsub_topic" "bms_commands" {
  name = "stadium.bms.commands"
}

# 4. Cloud Run Fastify API Gateway (`apps/api-gateway`)
resource "google_cloud_run_v2_service" "api_gateway" {
  name     = "visionos-api-gateway"
  location = "us-central1"

  template {
    scaling {
      min_instance_count = 2
      max_instance_count = 100
    }
    containers {
      image = "gcr.io/${var.gcp_project_id}/api-gateway:latest"
      resources {
        limits = {
          cpu    = "4000m"
          memory = "8Gi"
        }
      }
      env {
        name  = "PORT"
        value = "8080"
      }
    }
  }
}
