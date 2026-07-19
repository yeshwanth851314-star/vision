# 26_Monitoring: VisionOS Observability, OpenTelemetry Tracing & SLAs

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Observability Architecture, OpenTelemetry Tracing, Prometheus Metrics, Grafana Dashboards, & Error Budgets (`99.99% SLA`) |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Principal SRE, Lead DevOps Architect |
| **Purpose** | To define the exact OpenTelemetry SDK instrumentation, Prometheus telemetry metrics, Grafana dashboard JSON models, PagerDuty alerting thresholds, and Service Level Objectives (`SLOs`) enforcing our $99.99\%$ World Cup match SLA. |
| **Scope** | Enforced across `apps/api-gateway`, `apps/edge-cv`, `packages/ai-router`, `apps/mobile`, and `apps/web`. |
| **Assumptions** | 1. All log entries and trace spans must inject `trace_id` and `span_id` headers (`W3C Trace Context`) to enable end-to-end tracing across REST, WebSocket, and Pub/Sub hops.<br>2. Error budgets are tracked on a rolling $30\text{-day window}$; if error budget consumption exceeds $50\%$ within a $24\text{-hour period}$, automated canary promotions (`24_CI_CD.md`) are frozen immediately. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `19_Event_Architecture.md` — Pub/Sub Mesh<br>• `24_CI_CD.md` — Automated Canary Gates |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Principal SRE | Initial release detailing OpenTelemetry setup, Prometheus metrics, Grafana JSON, and SLA targets. |

---

## 1. Observability Topology (`OpenTelemetry & Prometheus Pipeline`)

```mermaid
graph TD
  subgraph InstrumentationSources [Distributed Tracing & Metrics Emitters]
    Mobile[`apps/mobile` (`OpenTelemetry JS SDK`)]
    Gateway[`apps/api-gateway` (`Fastify OTel Collector`)]
    AIRouter[`packages/ai-router` (`LangGraph Tracing SDK`)]
    EdgeCV[`apps/edge-cv` (`DeepStream Prometheus Exporter`)]
  end

  subgraph CollectorMesh [OpenTelemetry Collector Cluster (`Cloud Run`)]
    OTelCollector[`OTel Gateway Collector` <br> Batching, Sampling (`100% P0 Errors, 10% Normal Traffic`), & Scrubbing]
  end

  subgraph TelemetrySinks [Enterprise Storage Sinks]
    Prometheus[`Google Cloud Managed Service for Prometheus` <br> ($15\text{s scrape interval}$)]
    CloudTrace[`Google Cloud Trace` <br> (Distributed End-to-End Span Visualization)]
    CloudLogging[`Google Cloud Logging` <br> (`JSONB Structured Logs`)]
  end

  subgraph VisualizationAlerting [Dashboards & PagerDuty Alerts]
    Grafana[`Grafana Enterprise 3D COP Dashboard` (`apps/web`)]
    PagerDuty[`PagerDuty / Opsgenie Incident Escalation` (`P0 / P1 Alerts`)]
  end

  Mobile --> OTelCollector
  Gateway --> OTelCollector
  AIRouter --> OTelCollector
  EdgeCV --> OTelCollector

  OTelCollector --> Prometheus
  OTelCollector --> CloudTrace
  OTelCollector --> CloudLogging

  Prometheus --> Grafana
  Prometheus --> PagerDuty
  CloudLogging --> PagerDuty
```

---

## 2. Core Prometheus Metrics Specification

| Metric Name | Type | Labels | Description & Operational Significance | Target SLA / Alert Trigger Threshold |
| :--- | :--- | :--- | :--- | :--- |
| `stadium_concourse_density_per_sqm` | Gauge | `zone_id`, `concourse_level` | Real-time crowd density ($\text{persons/m}^2$) computed by NVIDIA Jetson edge nodes (`17_Computer_Vision_Pipeline.md`). | **Alert P0 (`CRITICAL`) if $> 3.5$ for $\ge 30\text{s}$**. |
| `stadium_websocket_latency_ms` | Histogram | `event_type`, `client_role` | Round-trip delivery latency of server-sent events (`stadium:zone:update`, `EMERGENCY_OVERRIDE`). | **$P_{95} \le 50\text{ms}$ / $P_{99} \le 120\text{ms}$**. |
| `stadium_ai_ttft_ms` | Histogram | `model_tier`, `language_code` | Time-To-First-Token (`TTFT`) for Gemini 1.5 Flash (`Tier 2`) conversational responses. | **$P_{95} \le 180\text{ms}$ / $P_{99} \le 350\text{ms}$**. |
| `stadium_turnstile_checkin_total` | Counter | `gate_id`, `status` | Total count of ECDSA cryptographic ticket verifications (`SUCCESS` vs `INVALID_SIGNATURE`). | **Alert P1 if `INVALID_SIGNATURE` exceeds $5\%$ per minute**. |
| `stadium_hvac_power_savings_kwh` | Counter | `zone_id`, `ahu_id` | Cumulative kilowatt-hours saved via automated zero-occupancy HVAC throttling (`SustainabilityAgent`). | Tracked for ESG carbon reduction reports (`FR-SUS-001`). |

---

## 3. Grafana Dashboard JSON Model (`stadium_cop_overview.json`)

To embed real-time telemetry graphs into Commander Vance's 3D COP (`apps/web`), the following exact Prometheus PromQL panel specification is deployed:

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 1,
  "id": 104,
  "links": [],
  "liveNow": true,
  "panels": [
    {
      "datasource": { "type": "prometheus", "uid": "gcp-prometheus-prod" },
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "thresholds" },
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "color": "#00E676", "value": null },
              { "color": "#FFAB00", "value": 2.1 },
              { "color": "#FF1E1E", "value": 3.5 }
            ]
          },
          "unit": "short"
        }
      },
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "id": 1,
      "options": { "reduceOptions": { "calcs": ["lastNotNull"], "values": false } },
      "pluginVersion": "11.0.0",
      "targets": [
        {
          "editorMode": "code",
          "expr": "max by (zone_id) (stadium_concourse_density_per_sqm{status != 'NORMAL'})",
          "legendFormat": "{{zone_id}} - Density",
          "refId": "A"
        }
      ],
      "title": "Concourse Crowd Density Warnings (Persons/m²)",
      "type": "stat"
    },
    {
      "datasource": { "type": "prometheus", "uid": "gcp-prometheus-prod" },
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "id": 2,
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(stadium_websocket_latency_ms_bucket[1m])) by (le, event_type))",
          "legendFormat": "P95 Latency - {{event_type}}",
          "refId": "B"
        }
      ],
      "title": "Real-Time WebSocket Push Latency (P95 in ms)",
      "type": "timeseries"
    }
  ],
  "refresh": "5s",
  "schemaVersion": 39,
  "title": "VisionOS 3D COP Telemetry Overview",
  "uid": "visionos-cop-main-v1",
  "version": 1
}
```

---

## 4. Alerting & Incident Escalation SLAs (`PagerDuty Matrix`)

| Severity Tier | Trigger Conditions & Prometheus Expression | Automated Mitigation & PagerDuty Escalation Path | Response Time SLA |
| :--- | :--- | :--- | :--- |
| **P0 (`CRITICAL`)** | `stadium_concourse_density_per_sqm >= 3.5` for $30\text{s}$<br>**OR** `stadium_websocket_latency_ms (P95) >= 250ms` | **1. Instant Automated Action:** `CrowdAgent` dispatches turnstile lock warning to COP (`15_Agent_Specifications.md`).<br>**2. PagerDuty Alert:** Pushes high-priority SMS/phone call directly to Commander Marcus Vance (`ROLE_ORGANIZER`) and Lead SRE. | **$< 60\text{ seconds}$** |
| **P1 (`HIGH`)** | `rate(stadium_turnstile_checkin_total{status="INVALID_SIGNATURE"}[5m]) > 50`<br>**OR** `stadium_dlq_unprocessed_depth > 10` | **1. Instant Automated Action:** Isolates affected turnstile IP block at Cloud Armor WAF.<br>**2. PagerDuty Alert:** Pushes alert to Security Operations Duty Officer (`ROLE_RESPONDER`). | **$< 5\text{ minutes}$** |
| **P2 (`MEDIUM`)** | `stadium_ai_ttft_ms (P95) >= 300ms` for $5\text{ mins}$<br>**OR** `stadium_hvac_power_savings_kwh == 0` for $1\text{ hr}$ | **1. Automated Action:** Trips AI Router circuit breaker, falling back to L1 semantic cache (`14_AI_Architecture.md`).<br>**2. Slack Alert:** Emits detailed trace log to `#engineering-alerts`. | **$< 30\text{ minutes}$** |
| **P3 (`LOW`)** | Single edge camera frame loss (`rtsp_connection_dropped == true`) on non-critical gate corridor. | **1. Automated Action:** DeepStream pipeline re-attempts RTSP socket connection every $10\text{ seconds}$.<br>**2. Jira Ticket:** Automatically creates low-priority maintenance task for tomorrow morning's shift. | **$< 24\text{ hours}$** |
