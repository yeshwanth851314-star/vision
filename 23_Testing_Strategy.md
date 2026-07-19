# 23_Testing_Strategy: VisionOS Verification & Load Testing Architecture

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Verification Strategy, Automated Test Pyramid, Accessibility Compliance (`WCAG 2.2 AAA`), & 120,000 Concurrent Socket Load Testing |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Principal QA Engineer, Lead Systems Architect |
| **Purpose** | To define the exhaustive verification methodologies, automated testing frameworks (`Vitest`, `Playwright`, `Testcontainers`, `k6`), accessibility compliance rules (`axe-core`), and chaos engineering benchmarks required to certify VisionOS for a FIFA World Cup final. |
| **Scope** | Enforced across all pull requests in `apps/mobile`, `apps/web`, `apps/api-gateway`, `packages/ai-router`, and `apps/edge-cv`. |
| **Assumptions** | 1. No pull request may merge without $\ge 85\%$ statement coverage across critical business logic (`Zustand stores, AI routing, PostGIS queries`).<br>2. Load testing must simulate **120,000 concurrent WebSocket connections** emitting telemetry bursts at $1\text{ Hz}$ without exceeding $P_{95}$ latency of $50\text{ms}$. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `01_PRD.md` — Product Requirements Document<br>• `20_WebSocket_Flow.md` — Socket.io Push Mesh<br>• `29_Coding_Standards.md` — Enterprise Coding Governance |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Principal QA Engineer | Initial release of automated test tiers, accessibility checks, and k6 120,000-socket load script. |

---

## 1. Automated Test Pyramid & Framework Allocation

```mermaid
graph TD
  subgraph TestPyramid [VisionOS Verification Tiers]
    Tier4[`k6 / Chaos Mesh` <br> (`120,000 Concurrent Sockets & Network Blackout Injection`)]
    Tier3[`Playwright / Cypress / Maestro` <br> (`Cross-Platform E2E User Journeys & Offline Recovery`)]
    Tier2[`Testcontainers (`PostgreSQL / Redis / PubSub emulator`)` <br> (`Integration & API Contract Testing`)]
    Tier1[`Vitest / Jest (`@testing-library/react-native`)` <br> (`Atomic Unit Tests & Zustand FSM Logic`)]
  end

  Tier1 --> Tier2
  Tier2 --> Tier3
  Tier3 --> Tier4
```

| Verification Tier | Primary Execution Frameworks | Target Coverage Scope & Execution SLAs | CI/CD Gate Enforcement |
| :--- | :--- | :--- | :--- |
| **Tier 1 (`Unit Testing`)** | **Vitest / Jest (`Node.js 22`)** | Atomic UI components, Zod validation schemas (`CheckInRequestSchema`), Zustand reducer transitions (`useNavigationStore`), pure math/A* distance utilities. | Enforced on every commit (`< 45s total execution`). Must achieve $\ge 85\%$ line coverage. |
| **Tier 2 (`Integration`)** | **Testcontainers (`Postgres / Redis`) + Fastify Supertest** | Database RLS isolation policies, PostGIS bounding box queries (`ST_DWithin`), Pub/Sub message ordering, Redis sliding window rate limits. | Enforced on every Pull Request merge gate (`< 3 mins execution`). Zero RLS leakage tolerated. |
| **Tier 3 (`End-to-End`)** | **Playwright (`Web COP`) + Maestro (`Mobile iOS/Android`)** | Full critical user workflows (`08_User_Journeys.md`): Turnstile QR check-in, PTT P0 volunteer dispatch acknowledgment, emergency banner override lockout. | Executed nightly and on staging deployments (`< 15 mins execution`). Multi-device screen snapshot diffing. |
| **Tier 4 (`Load & Chaos`)** | **k6 Distributed Load Engine + Chaos Mesh (`Kubernetes`)** | World Cup final stress simulation: 120,000 concurrent sockets emitting $1\text{ Hz}$ telemetry while injecting random $30\%$ packet drops and node evictions. | Executed prior to production release (`Weekly 4-Hour Burn-In`). $P_{95}$ latency must remain $< 50\text{ms}$. |

---

## 2. Accessibility & ADA Verification (`WCAG 2.2 AAA & axe-core`)

To guarantee full accessibility for disabled and visually/acoustically sensitive attendees (`FR-ACC-001`, `FR-ACC-002`):
1. **Automated Accessibility Linting:** All React / React Native components are wrapped with `@axe-core/react` (`web`) and `@react-native-aria/interactions` (`mobile`). Any component lacking valid `aria-label`, `role`, or failing the $48\text{px} \times 48\text{px}$ touch target threshold (`04_UX_Research.md`) throws a fatal compile error during `pnpm check`.
2. **Color Contrast Automated Checks:** Nightly E2E Playwright runs execute automated contrast ratios checks against our `#03_UI_UX_Design_System` tokens. Both Dark (`#0D1117`) and Light (`#F8FAFC`) modes must maintain a **minimum contrast ratio of 7:1 (`AAA`)** for all body text and directional AR icons (`#00F0FF`).
3. **Screen Reader Integration Tests:** iOS VoiceOver and Android TalkBack are tested via Maestro scripts to confirm that `SensoryAlertSnackbar` (`role="alert"`) interrupts general screen speech immediately (`aria-live="assertive"`).

---

## 3. Production k6 Load Testing Script (`tests/load/load_test_120k_sockets.js`)

Simulates **120,000 concurrent fans and volunteers** establishing WebSocket connections over TLS, authenticating via OAuth2 JWT, and receiving $1\text{ Hz}$ concourse crowd density broadcasts (`20_WebSocket_Flow.md`).

```javascript
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

export const wsHandshakeLatency = new Trend('ws_handshake_latency_ms');
export const emergencyBroadcastLatency = new Trend('emergency_broadcast_latency_ms');
export const connectionErrors = new Counter('ws_connection_errors');

export const options = {
  scenarios: {
    world_cup_final_surge: {
      executor: 'ramping-vus',
      startVUs: 1000,
      stages: [
        { duration: '3m', target: 50000 },  // Ramp to 50k VUs in 3 minutes
        { duration: '5m', target: 120000 }, // Peak World Cup capacity: 120,000 concurrent sockets
        { duration: '10m', target: 120000 }, // Sustain peak capacity during halftime match events
        { duration: '2m', target: 0 },      // Post-match egress ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'ws_handshake_latency_ms': ['p(95)<50', 'p(99)<120'], // 95% of handshakes must complete in < 50ms
    'emergency_broadcast_latency_ms': ['p(99)<50'],       // 99% of emergency overrides must be received in < 50ms
    'ws_connection_errors': ['count<50'],                 // Less than 50 dropped connections across 120k users
  },
};

export default function () {
  const userId = `usr_test_fan_${__VU}`;
  const mockJwtToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: userId, role: 'ROLE_FAN', sectorCode: 'SECTOR_112' }))}.signature`;
  const url = `wss://api.visionos.ai/api/v1/realtime/mesh?token=${mockJwtToken}&bleAnchor=BEACON_B4_TEST`;

  const startTime = Date.now();
  
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      wsHandshakeLatency.add(Date.now() - startTime);
    });

    socket.on('message', (message) => {
      const event = JSON.parse(message);
      
      // Measure real-time density update delivery
      if (event.event === 'stadium:zone:update') {
        check(event.payload, {
          'density value is positive number': (p) => typeof p.density === 'number' && p.density >= 0,
        });
      }

      // Measure critical emergency broadcast delivery latency
      if (event.event === 'EMERGENCY_OVERRIDE') {
        const serverEmitTime = new Date(event.payload.broadcastTimestampUtc).getTime();
        const clientReceiveTime = Date.now();
        emergencyBroadcastLatency.add(clientReceiveTime - serverEmitTime);
      }
    });

    socket.on('error', (e) => {
      connectionErrors.add(1);
      console.error(`Socket error for ${userId}: ${e.error()}`);
    });

    // Keep connection alive for 60 seconds before cycling VU
    sleep(60);
    socket.close();
  });

  check(res, { 'WebSocket handshake status is 101 Switching Protocols': (r) => r && r.status === 101 });
}
```
