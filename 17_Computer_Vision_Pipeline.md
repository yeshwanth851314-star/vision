# 17_Computer_Vision_Pipeline: VisionOS Edge AI & DeepStream Specification

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Edge Computer Vision Pipeline, DeepStream 7.0 Architecture & YOLOv9 Model Specification |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead Computer Vision Engineer, AI Systems Architect |
| **Purpose** | To establish the exact edge hardware specifications, GStreamer / DeepStream 7.0 processing DAGs, TensorRT-optimized YOLOv9 models, privacy-preserving face blurring rules, and $1\text{ Hz}$ crowd density JSON telemetry structures (`FR-CRD-001`). |
| **Scope** | Deployed across 800 physical NVIDIA Jetson AGX Orin (`64GB`) edge nodes mounted inside concourse ring ceilings and security turnstile overheads (`apps/edge-cv`). |
| **Assumptions** | 1. Camera feeds are ingested via local RTSP (`H.265 / 1080p @ 30 FPS`) directly over isolated fiber optical switches (`10 GbE`).<br>2. To strictly comply with international privacy regulations (`GDPR / CCPA / FIFA Privacy Charters`), raw video frames containing unblurred human faces are **NEVER written to persistent storage or transmitted to the cloud** (`FR-SEC-004`). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `12_Firestore_Schema.md` — Telemetry Sharding Topologies<br>• `19_Event_Architecture.md` — Pub/Sub Ingestion Topics |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead CV Engineer | Initial production release detailing Jetson AGX Orin hardware, DeepStream 7.0 DAG, and YOLOv9 ONNX export parameters. |

---

## 1. Edge Hardware & System Architecture (`apps/edge-cv`)

Each physical concourse zone ($100\text{m linear span}$) is monitored by a dedicated hardware cluster executing local inference ($30\text{ FPS pipeline throughput, <15ms frame latency}$):

| Hardware / Software Layer | Exact Production Specification | Operational Justification & Performance Budget |
| :--- | :--- | :--- |
| **Edge Compute Node** | **NVIDIA Jetson AGX Orin (`64GB LPDDR5`)** | Delivers $275\text{ TOPS}$ of INT8/FP16 AI compute. Easily processes 8 simultaneous $1080\text{p RTSP streams}$ at $30\text{ FPS}$ with $<40\%$ GPU utilization. |
| **Edge Operating System** | **JetPack 6.0 (`Linux Kernel 5.15 / Ubuntu 22.04 LTS`)** | Provides native CUDA 12.2, cuDNN 8.9, and TensorRT 8.6 libraries required for zero-copy unified memory frame processing. |
| **Vision Framework** | **NVIDIA DeepStream SDK 7.0 (`GStreamer C++ / Python Bindings`)** | Eliminates CPU-GPU memory copy overhead by keeping Decoded frames (`NVMM buffer`) exclusively inside GPU VRAM from decode to bounding box inference. |
| **Camera Sensor Feed** | **Axis Q1656-LE Fixed Network Camera (`RTSP / H.265`)** | $4\text{ MP resolution @ 30 FPS}$ with WDR (`Wide Dynamic Range`) and integrated IR illumination for low-light stairwell accuracy. |

---

## 2. DeepStream 7.0 Processing Pipeline DAG (`GStreamer Graph`)

```mermaid
graph TD
  RTSP[`rtspsrc` <br> Ingest H.265 1080p @ 30 FPS] --> Depay[`rtph265depay` <br> RTP Payload Depacketizer]
  Depay --> Parse[`h265parse` <br> NAL Unit Stream Parser]
  Parse --> Decode[`nvv4l2decoder` <br> Hardware GPU Video Decoder (`NVMM Buffer`)]
  Decode --> StreamMux[`nvstreammux` <br> Batching Engine (`Batch Size = 8, Width=1920, Height=1080`)]
  
  StreamMux --> PGIE[`nvinfer (Primary GIE)` <br> `YOLOv9-C-FP16.engine` — Crowd & Weapon Detection]
  PGIE --> Tracker[`nvtracker` <br> `NvMultiObjectTracker (NvSORT)` — Persistent ID Assignment]
  Tracker --> SGIE[`nvinfer (Secondary GIE)` <br> `FaceDetect-INT8.engine` — Facial Bounding Box Extraction]
  
  SGIE --> PrivacyBlur[`nvds_privacy_blur_plugin` <br> Apply CUDA Gaussian Blur (`Kernel 31x31`) over Face Boxes]
  PrivacyBlur --> OSD[`nvdsosd` <br> Draw Crowd Boxes (`#00E676`) & Density Polygon HUD]
  
  OSD --> Tee[`GstTee (Branch Graph)`]
  Tee -- Branch 1: Telemetry Emitter --> Probe[`Custom Pad Probe (C++)` <br> Calculate $D_{crowd}$ & $V_{flow}$ every $1,000\text{ms}$]
  Probe --> MQTT[`mosquitto_pub / gRPC` <br> Emit JSON to Cloud Gateway / Pub/Sub]
  
  Tee -- Branch 2: Blurred Local Loop --> Sink[`nvfakesink / RTSP Out` <br> Stream Privacy-Safe CCTV to Organizer COP]
```

---

## 3. YOLOv9 TensorRT Model Specification (`PGIE`)

* **Base Model Architecture:** `YOLOv9-C` (`GELAN + PGI Auxiliary Reversible Branches`).
* **Input Tensor Shapes:** `[batch_size=8, channels=3, height=640, width=640]` (`FP16 precision`).
* **Target Classes Enforced (`names.txt`):**
  * `Class 0: PERSON` (Used for concourse crowd counting, density calculation, and bottleneck clustering).
  * `Class 1: WEAPON_FIREARM` (Triggers immediate `CRITICAL_SECURITY` preemption).
  * `Class 2: WEAPON_BLADE` (Triggers immediate volunteer/security alert).
  * `Class 3: WHEELCHAIR_ADA` (Used to verify step-free corridor velocity `FR-ACC-001`).
* **Hyperparameters & NMS Settings:**
  * `confidence_threshold = 0.45`
  * `nms_iou_threshold = 0.50`
  * `clustering_mode = 2` (`NVIDIA NMS with Weighted Bounding Box Fusion`).

---

## 4. Privacy-Preserving Facial Blurring (`SGIE + CUDA Plugin`)

To guarantee absolute compliance with `FR-SEC-004`:
1. The Secondary GIE (`SGIE`) runs a specialized light-weight RetinaFace (`INT8`) model operating exclusively on `Class 0 (PERSON)` bounding box crops.
2. For every detected facial bounding box $B_{face} = (x_1, y_1, x_2, y_2)$, a custom CUDA kernel applies a $31 \times 31$ Gaussian Blur directly inside the `NVMM` video memory buffer before the frame is passed to `nvdsosd` or output stream buffers.
3. **Audit Verification:** If the privacy blur plugin fails to initialize (`CUDA_ERROR`), the Jetson node triggers an automatic hardware watchdog interlock (`systemd service kill`), cutting off frame transmission instantly rather than risking unblurred video broadcast.

---

## 5. Real-Time Telemetry Emission Contract (`1 Hz JSON Payload`)

Every $1,000\text{ms}$, the custom GStreamer Pad Probe (`apps/edge-cv/src/probes/density_probe.cpp`) computes bounding box intersection polygon metrics and emits the following exact JSON over mutual TLS gRPC directly to `stadium.cv.crowd_surge` (`Pub/Sub`):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EdgeCVZoneTelemetryEvent",
  "sourceEdgeNodeId": "JETSON_AGX_ORIN_NODE_04",
  "cameraRtspUri": "rtsp://10.240.12.44:554/stream1",
  "monitoredConcourseZoneId": "CONCOURSE_B4_EAST",
  "frameTimestampUtc": "2026-07-13T18:45:12.050Z",
  "metrics": {
    "totalPersonBoundingBoxes": 420,
    "zoneAreaSquareMeters": 123.5,
    "calculatedDensityPerSqM": 3.4008,
    "flowVelocityPersonsPerMinute": 1140,
    "detectedAdaWheelchairs": 2,
    "detectedWeaponBoxes": 0
  },
  "safetyClassification": {
    "status": "WARNING",
    "recommendedAction": "THROTTLE_INCOMING_TURNSTILES_GATE_B4"
  },
  "hardwareTelemetry": {
    "gpuUtilizationPct": 38.4,
    "gpuTemperatureCelsius": 52.1,
    "inferenceLatencyMs": 11.2
  }
}
```
