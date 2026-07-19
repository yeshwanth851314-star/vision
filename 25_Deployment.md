# 25_Deployment: VisionOS Multi-Region Infrastructure & Terraform Manifests

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Multi-Region Infrastructure Topology, Cloud Run Active-Active Failover, & Terraform Manifests |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Cloud Systems Architect, Lead DevOps Architect |
| **Purpose** | To define the exact Infrastructure-as-Code (`Terraform 1.8+ / HCL`) specifications deploying our multi-region active-active cloud services (`us-central1` & `us-east4`), High-Availability Cloud SQL PostGIS replication, and Anycast Cloud Load Balancing. |
| **Scope** | Enforced across the `infra/terraform/` repository directly managing Google Cloud Platform (`GCP`) production accounts. |
| **Assumptions** | 1. Google Cloud Global External HTTP(S) Load Balancing (`Cloud Armor WAF enabled`) routes fans and staff to the nearest region with sub-$20\text{ms}$ edge latency.<br>2. If `us-central1` experiences a catastrophic regional fiber outage, Cloud Load Balancer shifts $100\%$ of traffic to `us-east4` within **< 15 seconds** (`0 data loss on PostGIS read replicas`). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `11_Backend_Schema.md` — Relational PostGIS Engine<br>• `22_Security_Model.md` — Cloud Armor & Zero-Trust VPC |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Cloud Systems Architect | Initial release of active-active Cloud Run topology and Terraform HCL manifests. |

---

## 1. Multi-Region Active-Active Topology (`ERD / Failover Map`)

```mermaid
graph TD
  UserTraffic[`120,000 Global Attendees & Staff`] --> AnycastIP[`Google Cloud Global Anycast IP` <br> (`Cloud Armor Enterprise WAF Shield`)]
  
  subgraph PrimaryRegion [`Primary Region: us-central1 (Iowa)`]
    RunCentral[`Cloud Run Cluster (`api-gateway`)` <br> (`Min: 20 instances, Max: 250 instances`)]
    SQLCentral[`Cloud SQL PostGIS Primary (`db-custom-16-65536`)` <br> (`Multi-Zone HA Master + Read Replica`)]
    RedisCentral[`Redis Enterprise Cluster` (`Multi-Zone HA`)]
  end

  subgraph FailoverRegion [`Secondary Failover Region: us-east4 (North Virginia)`]
    RunEast[`Cloud Run Cluster (`api-gateway`)` <br> (`Min: 10 instances, Max: 250 instances`)]
    SQLEast[`Cloud SQL PostGIS Cross-Region Read Replica`]
    RedisEast[`Redis Enterprise Active-Active Replica`]
  end

  AnycastIP -- `Normal Routing (80% Traffic)` --> RunCentral
  AnycastIP -- `Normal Routing (20% Traffic)` --> RunEast
  AnycastIP -. `Automatic Failover (<15s)` .-> RunEast

  RunCentral --> SQLCentral
  RunCentral --> RedisCentral
  RunEast --> SQLEast
  RunEast --> RedisEast

  SQLCentral -- `Continuous Async WAL Replication` --> SQLEast
```

---

## 2. Production Terraform HCL Specification (`infra/terraform/main.tf`)

Deploying the secure VPC network, Cloud Run multi-region services, and Cloud SQL PostGIS instance:

```hcl
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.38.0"
    }
  }
  backend "gcs" {
    bucket = "visionos-prod-terraform-state-2026"
    prefix = "stadium-core/state"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = "us-central1"
}

variable "gcp_project_id" {
  type    = string
  default = "visionos-prod-2026"
}

# =============================================================================
# RESOURCE 1: ZERO-TRUST VPC & PRIVATE SERVICE ACCESS
# =============================================================================
resource "google_compute_network" "stadium_vpc" {
  name                    = "visionos-zero-trust-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "central_subnet" {
  name          = "visionos-subnet-central1"
  ip_cidr_range = "10.240.0.0/18"
  region        = "us-central1"
  network       = google_compute_network.stadium_vpc.id
  private_ip_google_access = true
}

# =============================================================================
# RESOURCE 2: CLOUD SQL POSTGIS HIGH-AVAILABILITY CLUSTER
# =============================================================================
resource "google_sql_database_instance" "postgis_primary" {
  name             = "visionos-postgis-primary-v1"
  database_version = "POSTGRES_16"
  region           = "us-central1"

  settings {
    tier                        = "db-custom-16-65536" # 16 vCPU, 64 GB RAM
    availability_type           = "REGIONAL"          # Multi-Zone High Availability
    disk_size                   = 500
    disk_type                   = "PD_SSD"
    disk_autoresize             = true
    disk_autoresize_limit       = 4096
    user_labels                 = { environment = "production", component = "database" }

    ip_configuration {
      ipv4_enabled    = false # Zero Public IPs allowed (`FR-SEC-004`)
      private_network = google_compute_network.stadium_vpc.id
      require_ssl     = true
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 14
    }
  }
}

# =============================================================================
# RESOURCE 3: CLOUD RUN MULTI-REGION API GATEWAY (`us-central1`)
# =============================================================================
resource "google_cloud_run_v2_service" "api_gateway_central" {
  name     = "api-gateway-central1"
  location = "us-central1"
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = "api-gateway-sa@${var.gcp_project_id}.iam.gserviceaccount.com"
    timeout         = "60s"

    scaling {
      min_instance_count = 20  # Keep 20 warm instances during World Cup match day
      max_instance_count = 250
    }

    containers {
      image = "us-central1-docker.pkg.dev/${var.gcp_project_id}/stadium-services/api-gateway:latest"
      
      resources {
        limits = { cpu = "4", memory = "8Gi" }
        cpu_idle = false # Dedicated CPU allocation for real-time WebSocket processing
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://visionuser:${var.db_password}@${google_sql_database_instance.postgis_primary.private_ip_address}:5432/stadium_prod"
      }
      env {
        name  = "REDIS_ENTERPRISE_URL"
        value = "redis://10.240.10.15:6379"
      }
    }
  }
}
```

---

## 3. Disaster Recovery & Automated Failover SLAs

| Failure Scenario | Automated System Reaction & Recovery Mechanism | Target Recovery Time Objective (`RTO`) | Target Recovery Point Objective (`RPO`) |
| :--- | :--- | :--- | :--- |
| **Cloud Run Pod Crash / OOM Exception** | Kubernetes / Cloud Run healthcheck ($10\text{s interval}$) detects `Unhealthy` pod, terminates instance, and routes traffic instantly to adjacent warm pods. | **$< 3\text{ seconds}$** | **$0\text{ data loss}$** |
| **Primary Zone (`us-central1-a`) Power Failure** | Cloud SQL automatically triggers synchronous master failover to `us-central1-b` without changing the database connection string. | **$< 30\text{ seconds}$** | **$0\text{ seconds}$ (`ACID Master-Standby Sync`)** |
| **Total Regional Fiber Cut (`us-central1`)** | Google Cloud Anycast Load Balancer health checks fail across Iowa region. Anycast DNS routes $100\%$ of stadium traffic to `us-east4` read replicas within $15\text{ seconds}$. | **$< 15\text{ seconds}$** | **$< 1\text{ second}$ (`Async WAL Cross-Region Lag`)** |
