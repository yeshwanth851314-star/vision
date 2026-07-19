# 22_Security_Model: VisionOS Zero-Trust Perimeter, RBAC & Cryptographic Specifications

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Zero-Trust Security Architecture, RBAC Claims, ECDSA Rotating Ticketing, & FirstNet Network Isolation |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Principal Security Architect, Cloud Systems Architect |
| **Purpose** | To define the exhaustive, implementation-ready Zero-Trust security boundaries, OAuth2/JWT claims structure, dynamic ECDSA ticket anti-scalping protocols (`FR-SEC-002`), FirstNet network prioritization (`FR-SEC-001`), and encryption standards (`AES-256-GCM / TLS 1.3`). |
| **Scope** | Enforced across `apps/api-gateway`, `apps/mobile`, `apps/web`, `apps/edge-cv`, and Google Cloud IAM policies. |
| **Assumptions** | 1. Public Wi-Fi and standard cellular bands (`5G NSA`) are treated as untrusted, hostile network segments subject to high packet loss and potential interception.<br>2. Staff devices (`ROLE_VOLUNTEER`, `ROLE_RESPONDER`, `ROLE_ORGANIZER`) authenticate over FirstNet / Priority Cellular Band 14 ($700\text{ MHz}$) to ensure absolute command continuity during public network congestion. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `11_Backend_Schema.md` — Row-Level Security Policies<br>• `17_Computer_Vision_Pipeline.md` — Edge Privacy Blurring |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Principal Security Architect | Initial production release detailing dynamic ECDSA ticketing, FirstNet isolation, and OAuth2/OIDC claims. |

---

## 1. Zero-Trust Network & Priority Band Architecture (`FR-SEC-001`)

To guarantee absolute command stability when 120,000 fans simultaneously flood local cell towers during a match goal, VisionOS enforces strict network segment isolation across physical and radio spectrum tiers:

```mermaid
graph TD
  subgraph PublicUntrustedSegment [Untrusted Public Network Segment (`Hostile Zone`)]
    FanDevices[`apps/mobile` (`ROLE_FAN`)] --> PublicRadio[`Public Wi-Fi 6E / Commercial 5G Towers`]
    PublicRadio --> Cloudflare[`Cloudflare Enterprise WAF & DDoS Shield` <br> (Rate Limit: `100 req/min/IP`)]
  end

  subgraph ProtectedPrioritySegment [Priority FirstNet Spectrum (`Band 14 / 700 MHz`)]
    StaffDevices[`apps/mobile` (`ROLE_VOLUNTEER`)] --> FirstNetRadio[`AT&T FirstNet Dedicated LTE Band 14`]
    FirstNetRadio --> VPNMesh[`Mutual TLS (`mTLS 1.3`) Dedicated Gateway` <br> (Rate Limit: `1,000 req/min/IP`)]
  end

  subgraph SecureCloudPerimeter [Google Cloud Zero-Trust VPC (`us-central1`)]
    Cloudflare --> APIGateway[`apps/api-gateway` (`Cloud Run`)]
    VPNMesh --> APIGateway
    APIGateway --> CloudSQL[`PostgreSQL / Cloud SQL (`Private Service Access / No Public IP`)`]
    APIGateway --> Firestore[`Cloud Firestore (`Enforced via `firestore.rules`)`]
  end
```

---

## 2. OAuth2 / OIDC Authorization & RBAC Claims Structure

Authentication relies on Google Cloud Identity Platform (`OIDC / OAuth 2.0`). Upon successful verification (with mandatory **FIDO2 WebAuthn / MFA** required for `ROLE_ORGANIZER` and `ROLE_RESPONDER`), the API Gateway issues a short-lived ($15\text{-minute expiration}$) signed JWT (`RS256 / ES256`):

```json
{
  "iss": "https://identity.visionos.ai/oauth2/v1/token",
  "sub": "usr_oauth_mateo_vance_8819",
  "aud": "https://api.visionos.ai",
  "exp": 1784055660,
  "nbf": 1784054760,
  "iat": 1784054760,
  "jti": "jwt_token_id_990141",
  "claims": {
    "role": "ROLE_FAN",
    "sectorCode": "SECTOR_112",
    "ticketHash": "a8f5f167f44f4964e6c998dee827110c",
    "vipTier": false,
    "adaAccessible": true
  }
}
```

### 2.1 Role-Based Access Control (`RBAC`) Permission Matrix
| Role Identifier | Primary Persona | Allowed REST Endpoints | Allowed WebSocket Rooms (`20_WebSocket_Flow.md`) | Administrative Capabilities & Interlocks |
| :--- | :--- | :--- | :--- | :--- |
| **`ROLE_FAN`** | Mateo (`Fan`) | `POST /auth/checkin`<br>`POST /navigation/route` | `sector:{sectorCode}`<br>`global:stadium` | Read-only access to localized crowd density and AR navigation. Cannot view staff dispatches or issue BMS overrides. |
| **`ROLE_VOLUNTEER`** | Sarah (`Steward`) | All `ROLE_FAN` +<br>`POST /dispatches/ack`<br>`WSS /ai/speech-translate` | All `ROLE_FAN` +<br>`role:ROLE_VOLUNTEER` | Can acknowledge and resolve assigned field hazard tickets (`FR-COP-002`). Cannot trigger emergency overrides. |
| **`ROLE_ORGANIZER`** | Commander Vance (`COP`) | **All Endpoints Globally** (`POST /cop/gates/override`<br>`POST /cop/emergency/trigger`) | **All Rooms Globally** (`role:ROLE_ORGANIZER`) | Full read/write over turnstiles, HVAC automation, signage, and `CRITICAL_EMERGENCY` preemption (`FR-EMR-001`). Requires MFA on all mutations. |
| **`ROLE_RESPONDER`** | Elena (`Paramedic`) | All `ROLE_VOLUNTEER` +<br>`POST /navigation/green-corridor` | `role:ROLE_RESPONDER`<br>`global:stadium` | Can trigger local Green Corridor clearances (`FR-EMR-003`) and view medical certification dispatches (`15_Agent_Specifications.md`). |

---

## 3. Cryptographic Ticket Integrity & Anti-Scalping (`FR-SEC-002`)

To eradicate counterfeit paper/screenshot tickets and unauthorized sector hopping, VisionOS implements **Rotating Dynamic ECDSA QR/NFC Passcodes**:

1. **Cryptographic Seed:** At ticket purchase, the user's mobile device securely stores an asymmetric ECDSA private key $K_{priv}$ inside the iOS Secure Enclave / Android Keystore.
2. **Dynamic TOTP Barcode Generation:** Every $30\text{ seconds}$, `apps/mobile` generates a cryptographic payload signed with $K_{priv}$:
   $$\text{Payload} = \text{SHA256}(\text{TicketID} \parallel \text{Timestamp}_{UTC} \parallel \text{BLEAnchorID})$$
   $$\text{Signature} = \text{ECDSA\_Sign}(K_{priv}, \text{Payload})$$
3. **Turnstile Verification:** When tapped against Gate B4 NFC readers, the turnstile verifies the signature against the public key $K_{pub}$ stored in Cloud SQL (`attendee_tickets`). If $\text{Timestamp}_{UTC}$ is older than $30\text{ seconds}$ or has already been checked in (`is_checked_in == true`), the turnstile locks instantly and flashes `#FF1E1E`.

---

## 4. Encryption at Rest & in Transit (`Compliance Mandates`)

* **In Transit:** Every network hop (`Mobile -> Gateway -> Cloud SQL / Firestore`) strictly requires **TLS 1.3** using strong cipher suites (`TLS_AES_256_GCM_SHA384` or `TLS_CHACHA20_POLY1305_SHA256`). Weak TLS 1.0/1.1 protocols and unencrypted HTTP connections (`port 80`) are dropped at the edge by Cloudflare WAF.
* **At Rest:** Database volumes (`Cloud SQL PostGIS`, `Cloud Firestore`, `Google Cloud Storage CDN backups`) are encrypted using **AES-256-GCM** via Customer-Managed Encryption Keys (`CMEK`) managed in Google Cloud KMS with automatic $90\text{-day key rotation}$.
* **Client Device Storage:** Local MMKV storage (`useNavigationStore`, `useOfflineQueueStore`) encrypts its underlying SQLite/JSI files using **AES-256-XTS** via `react-native-mmkv` encryption keys retrieved directly from the OS secure hardware keyring (`iOS Keychain / Android Keystore`).

---

## 5. Edge AI Privacy & Facial Blurring Interlock (`FR-SEC-004`)

To comply with global biometric privacy laws during World Cup broadcast operations:
1. All video processing occurs strictly **on-device at the edge** inside `apps/edge-cv` (`NVIDIA Jetson AGX Orin 64GB`).
2. The DeepStream 7.0 pipeline (`17_Computer_Vision_Pipeline.md`) applies real-time GPU Gaussian Blurring ($31 \times 31\text{ kernel}$) to all detected facial bounding boxes before any frame leaves the `NVMM` video memory buffer.
3. **Fail-Closed Hardware Interlock:** If the GPU blurring plugin fails to load or experiences a CUDA out-of-memory exception, the system **instantly kills the RTSP transmission socket**. Raw, unblurred video frames are **cryptographically impossible** to store or stream to Cloud Storage or Commander Vance's 3D COP.
