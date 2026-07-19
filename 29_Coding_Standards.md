# 29_Coding_Standards: Enterprise Engineering & Architectural Standards

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Enterprise Engineering & Coding Standards |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Principal Software Engineer, Engineering Manager |
| **Purpose** | To define the absolute technical conventions, folder topologies, naming rules, error handling structures, logging protocols, and git workflows for human engineers and autonomous AI coding agents contributing to VisionOS. |
| **Scope** | Enforced across all multi-repository packages (`@visionos/shared`, `@visionos/mobile`, `@visionos/web`, `@visionos/api`, `@visionos/ai-router`, `@visionos/cv-pipeline`). |
| **Assumptions** | 1. All code is authored using TypeScript (`v5.6+`) with `strict: true` across all JavaScript/Node.js/React runtimes.<br>2. High-concurrency stadium operations require structured, zero-allocation logging and deterministic error propagation without swallowing stack traces. |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `30_Antigravity_Rules.md` — AI Coding Agent Mandates<br>• `31_Ponytail_Rules.md` — Architectural Simplicity Rules<br>• `24_CI_CD.md` — CI/CD Pipelines & Quality Gates |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Principal Software Engineer | Initial production release of VisionOS Enterprise Coding Standards. Enforces strict Monorepo conventions and structured logging. |

---

## 1. Monorepo Folder Structure & Topology

VisionOS is structured as an enterprise `Turborepo` / `pnpm` workspace monorepo. Every package and application must strictly adhere to the exact directory layout below. **Ad-hoc directories outside this hierarchy are strictly forbidden.**

```
visionos/
├── apps/
│   ├── mobile/                    # React Native (Expo / Bare) Client App for Fans & Volunteers
│   │   ├── src/
│   │   │   ├── app/               # Expo Router file-based navigation (app/_layout.tsx, app/(fan)/home.tsx)
│   │   │   ├── components/        # Atomic, mobile-specific UI components
│   │   │   ├── hooks/             # Custom mobile state and hardware hooks (BLE, NFC, AR)
│   │   │   ├── services/          # Local device services (MMKV storage, Offline Sync)
│   │   │   └── types/             # Mobile-specific DTO interfaces
│   │   ├── app.json
│   │   └── tsconfig.json
│   ├── web/                       # Next.js 15 (App Router) Command Center (COP) Dashboard
│   │   ├── src/
│   │   │   ├── app/               # Next.js App Router (layout.tsx, page.tsx, api/router/)
│   │   │   ├── components/        # 3D Dashboard, Mapbox, and Data Grid UI widgets
│   │   │   ├── lib/               # Server actions and server-side utilities
│   │   │   └── stores/            # Zustand client state graphs for live stadium telemetry
│   │   └── next.config.mjs
│   └── api-gateway/               # Node.js 22 + Cloud Run Fastify/Socket.io Real-Time Gateway
│       ├── src/
│       │   ├── controllers/       # HTTP and WebSocket route handlers
│       │   ├── middleware/        # OAuth2/JWT RBAC, Rate Limiting, OpenTelemetry hooks
│       │   ├── routes/            # REST endpoint declarations (Zod validated)
│       │   ├── sockets/           # WebSocket room managers (stadium:zone:*, alerts:emergency)
│       │   └── server.ts          # Server entry point and graceful shutdown orchestration
├── packages/
│   ├── shared/                    # Universal TypeScript DTOs, Enums, Zod Schemas, and Math utilities
│   │   ├── src/
│   │   │   ├── schemas/           # Zod schemas shared across Mobile, Web, and API (e.g., ZoneEventSchema)
│   │   │   ├── types/             # Inferred TypeScript interfaces (`z.infer<typeof ZoneEventSchema>`)
│   │   │   ├── constants/         # Global design tokens, API status codes, and threshold limits
│   │   │   └── utils/             # Pure geometric functions (IoU, bounding box math, string formatters)
│   │   └── package.json           # `@visionos/shared`
│   ├── ai-router/                 # Semantic Router, LangChain/Vertex AI orchestrator package
│   └── cv-client/                 # RTSP/WebRTC ingestion primitives and Edge DTO decoders
├── infra/                         # Terraform/Pulumi Infrastructure as Code (GCP, Cloud Run, PubSub, Vector DB)
├── docs/                          # The VisionOS Enterprise Documentation Repository (`00_Project_Vision` to `34`)
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

---

## 2. Naming Conventions & Grammar Rules

To eliminate cognitive friction across senior human developers and AI agents, all code must follow strict casing and semantic naming rules:

| Entity Type | Casing Convention | Regex / Syntax Standard | Exact Examples | Architectural Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Repository Directories** | `kebab-case` | `^[a-z0-9]+(-[a-z0-9]+)*$` | `apps/api-gateway`<br>`packages/ai-router` | Prevents cross-OS case-sensitivity build failures between Windows developer machines and Linux Docker build containers. |
| **React / Next.js Components** | `PascalCase` | `^[A-Z][a-zA-Z0-9]+(.tsx)$` | `Stadium3DCanvas.tsx`<br>`EmergencyEvacBanner.tsx` | Standard React community convention; distinguishes JSX components from standard HTML elements (`<Stadium3DCanvas />`). |
| **Standard TS Files & Utilities** | `camelCase` | `^[a-z][a-zA-Z0-9]+(.ts)$` | `evaluateQueueDensity.ts`<br>`formatCurrency.ts` | Distinguishes pure functional utilities and service modules from class/component declarations. |
| **Classes & Interfaces / Types** | `PascalCase` | `^[A-Z][a-zA-Z0-9]+$` | `type ZoneTelemetryDTO`<br>`interface IGateObserver` | Explicit type boundary identification during static analysis and IntelliSense completions. |
| **Zod Schemas** | `PascalCase` + `Schema` suffix | `^[A-Z][a-zA-Z0-9]+Schema$` | `CrowdAlertPayloadSchema`<br>`UserLoginRequestSchema` | Prevents namespace collisions between runtime Zod validation objects and inferred static TypeScript types (`type CrowdAlertPayload = z.infer<typeof CrowdAlertPayloadSchema>`). |
| **Constants & Env Variables** | `UPPER_SNAKE_CASE` | `^[A-Z0-9]+(_[A-Z0-9]+)*$` | `CROWD_DENSITY_MAX_LIMIT`<br>`FIREBASE_PROJECT_ID` | Visually alerts engineers that the value is immutable or injected via runtime process environment variables. |
| **Database Tables & Collections** | `snake_case` (SQL) / `camelCase` (Firestore) | `^[a-z0-9_]+$` (SQL)<br>`^[a-z][a-zA-Z0-9]+$` (NoSQL) | SQL: `stadium_turnstile_logs`<br>Firestore: `concourseAlerts` | SQL `snake_case` avoids quoting identifiers in PostGIS/PostgreSQL queries; Firestore `camelCase` aligns natively with JSON serializations over REST/WebSockets. |
| **Boolean Variables & Props** | `is/has/can/should` prefix + `PascalCase` | `^(is\|has\|can\|should)[A-Z][a-zA-Z0-9]+$` | `isEmergencyActive`<br>`hasADAWheelchairAccess` | Eliminates ambiguity regarding boolean state evaluations in JSX conditional rendering and service assertions. |

---

## 3. Architecture Rules & Dependency Boundaries

```mermaid
graph TD
  subgraph ClientLayer [Client Applications Tier]
    Web[Next.js Web Dashboard]
    Mobile[React Native Mobile App]
  end

  subgraph SharedLayer [Universal Shared Package Tier (`@visionos/shared`)]
    Schemas[Zod Runtime Schemas]
    Types[Inferred TypeScript Interfaces]
    Math[Geometric & Math Utilities]
  end

  subgraph ServiceLayer [API & Gateway Tier (`apps/api-gateway`)]
    Controllers[Fastify / Route Handlers]
    Sockets[Socket.io Room Managers]
  end

  subgraph AILayer [AI Orchestration Package (`packages/ai-router`)]
    Router[Semantic Router / Vertex Client]
    RAG[Vector Search Interface]
  end

  subgraph DataLayer [Storage & Persistence Tier]
    Firestore[(Google Cloud Firestore)]
    Postgres[(Cloud SQL PostGIS)]
    Vector[(Vertex AI Vector DB)]
  end

  ClientLayer --> SharedLayer
  ServiceLayer --> SharedLayer
  AILayer --> SharedLayer
  ClientLayer -->|HTTPS / WSS Only| ServiceLayer
  ServiceLayer --> AILayer
  ServiceLayer --> DataLayer
  AILayer --> Vector
  AILayer --> Firestore

  style ClientLayer fill:#1e293b,stroke:#38bdf8,stroke-width:2px
  style SharedLayer fill:#14532d,stroke:#4ade80,stroke-width:2px
  style ServiceLayer fill:#312e81,stroke:#818cf8,stroke-width:2px
  style AILayer fill:#4c1d95,stroke:#c084fc,stroke-width:2px
  style DataLayer fill:#701a75,stroke:#f472b6,stroke-width:2px
```

### 3.1 Strict Dependency Rules
1. **Frontend Isolation:** Client apps (`@visionos/mobile`, `@visionos/web`) can ONLY import `@visionos/shared`. They MUST NEVER import `@visionos/ai-router`, database drivers (`pg`, `firebase-admin`), or internal gateway utility files.
2. **Single Source of Truth for Types:** DTOs and API request/response contracts must NEVER be declared inside frontend components or backend controllers. All data structures MUST be authored as a `Zod` schema in `@visionos/shared/src/schemas/*.ts` and exported via static inference.
3. **Controller/Service Separation:** Controllers handle HTTP/WebSocket transport parsing, Zod validation, and HTTP status code returns (`200, 201, 400, 403, 500`). Pure business logic (e.g., computing dynamic evacuation paths or triggering RAG queries) MUST reside in standalone, stateless service functions inside `src/services/*.ts`.

---

## 4. Error Handling & Exception Management

Uncaught exceptions, un-typed `try/catch(e)` blocks, and swallowed errors (`catch(e) {}`) are strictly forbidden. Every error across the VisionOS stack must be wrapped in the standardized `VisionOSError` class and serialized cleanly over API and WebSocket boundaries.

### 4.1 Standardized Error Class Definition (`@visionos/shared/src/errors/VisionOSError.ts`)
```typescript
export type VisionOSErrorCode =
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_INSUFFICIENT_PERMISSIONS'
  | 'SPATIAL_ZONE_NOT_FOUND'
  | 'CROWD_DENSITY_EXCEEDED_SAFETY_LIMIT'
  | 'AI_ROUTER_LATENCY_TIMEOUT'
  | 'CV_INFERENCE_PAYLOAD_MALFORMED'
  | 'INTERNAL_DATABASE_SEVERED';

export interface VisionOSErrorSerialized {
  error: {
    code: VisionOSErrorCode;
    message: string;
    statusCode: number;
    timestamp: string;
    traceId: string;
    context?: Record<string, unknown>;
  };
}

export class VisionOSError extends Error {
  public readonly code: VisionOSErrorCode;
  public readonly statusCode: number;
  public readonly timestamp: string;
  public readonly traceId: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: VisionOSErrorCode,
    message: string,
    statusCode: number,
    traceId: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VisionOSError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.traceId = traceId;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): VisionOSErrorSerialized {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        traceId: this.traceId,
        ...(this.context ? { context: this.context } : {}),
      },
    };
  }
}
```

### 4.2 Error Handling Execution Rules
* **Controllers:** All route handlers must use global async error middleware (`Fastify` `setErrorHandler` or Next.js `error.tsx`). If a Zod validation error occurs, it must automatically convert to a `400 Bad Request` with structured field-level error messages.
* **Database & Third-Party APIs:** Always catch raw database driver (`PgError`, `FirebaseError`) and third-party API (`AxiosError`) exceptions, log their full stack traces via the OpenTelemetry logger, and re-throw them as a clean `VisionOSError` (`500 Internal Server Error` or `502 Bad Gateway`) to prevent exposing internal SQL schemas or API keys to external clients.

---

## 5. Structured Logging & Observability Standards

To trace complex, distributed events during live stadium tournaments, `console.log` and `console.error` are strictly forbidden across production runtimes. All applications must use the centralized `Pino` + `OpenTelemetry` JSON logger (`@visionos/shared/src/logger/index.ts`).

### 5.1 Required Log JSON Fields
Every log entry output to `stdout` must contain structured JSON with the exact mandatory fields below:

```json
{
  "level": "info",
  "time": "2026-07-13T16:25:00.123Z",
  "service": "api-gateway",
  "environment": "production",
  "traceId": "trace-98a76b54-1234-abcd",
  "spanId": "span-5678-efgh",
  "event": "CROWD_DENSITY_ALERT_DISPATCHED",
  "zoneId": "concourse_gate_b4",
  "densityPersonPerSqM": 3.85,
  "severity": "CRITICAL",
  "msg": "Dispatched emergency crowd dispersal alert to volunteer squad V-12 and updated COP digital signage."
}
```

### 5.2 Severity Level Allocation
* `FATAL (60)`: System-wide outages; Firestore cluster un-reachable, edge CV ingestion severed. Triggers immediate automated PagerDuty emergency wake-up.
* `ERROR (50)`: Unhandled exceptions, failed AI function executions, failed ticket validation transactions. Triggers PagerDuty high-priority alert.
* `WARN (40)`: Crowd density crossing warning thresholds (`>2.0 persons/m²`), rate-limit throttling triggered (`HTTP 429`), LLM fallback model triggered (`Gemini 1.5 Pro` $\rightarrow$ `Gemini 1.5 Flash`).
* `INFO (30)`: Standard operational state transitions: user authenticated, volunteer checked into zone, emergency evacuation drill initiated.
* `DEBUG (20)`: Detailed HTTP request/response payloads, vector similarity scores ($\cos(\theta)$), internal SQL execution timers. *Disabled in production by default (`LOG_LEVEL=info`).*

---

## 6. Testing Strategy Rules (`vitest` & `supertest`)

Every component across the monorepo must enforce the strict testing guarantees outlined below before merging:

```mermaid
graph TD
  Unit[Unit & Pure Math Tests (`vitest`)] -->|100% Geometry & Schema Coverage| Integration[Service & API Integration (`supertest`)]
  Integration -->|90% Controller & Route Coverage| E2E[End-to-End User Flow (`Playwright`)]
  E2E -->|Critical Path Ingress/Egress/Evac| Load[High-Concurrency Chaos & Load (`k6` / `Artillery`)]
```

1. **Test File Placement:** Tests must reside directly alongside the source file they test, using the exact `.spec.ts` or `.test.tsx` extension:
   * `src/utils/boundingMath.ts` $\rightarrow$ `src/utils/boundingMath.spec.ts`
   * `src/components/EmergencyBanner.tsx` $\rightarrow$ `src/components/EmergencyBanner.test.tsx`
2. **Deterministic Mocking:** Network calls (`fetch`, `axios`), database drivers, and Vertex AI API responses MUST be mocked using `vitest.mock()` or `msw` (Mock Service Worker) during unit test execution. Tests must execute with zero external network connectivity.
3. **Clean Teardown:** All database integration tests must run against ephemeral, containerized test databases (`Testcontainers` PostGIS / Firebase Local Emulator Suite) and must clear all collections inside an `afterEach()` hook.

---

## 7. Git Workflow, Branching & Conventional Commit Rules

VisionOS enforces Trunk-Based Development with short-lived feature branches (`<48 hours duration`) merging into protected `main` and `staging` branches via formal Pull Requests.

### 7.1 Protected Branch Policies (`main` & `staging`)
* **Direct pushes are strictly blocked.**
* **Mandatory CI Quality Gates:** Pull requests must pass 100% of automated checks (`knip` dead code audit, `tsc --noEmit` zero compilation errors, `eslint --max-warnings=0`, `vitest` unit test suite) before the merge button unlocks (`24_CI_CD.md`).
* **Code Review Approvals:** Minimum 2 human Senior Principal Engineer approvals or 1 human + 1 verified AI Agent acceptance checklist pass (`32_Acceptance_Checklists.md`).

### 7.2 Conventional Commit Specification
All git commit messages MUST strictly obey the **Conventional Commits (`v1.0.0`)** syntax. Non-conforming commit messages are rejected by `husky` + `commitlint` pre-commit hooks:

```text
<type>(<scope>): <short imperative summary in lower case without period>

[optional body: explain WHY the change was made, structural tradeoffs, or Jira/Ticket link]

[optional footer: BREAKING CHANGE: <explanation> / Closes #<issue-id>]
```

#### Permitted Commit Types (`<type>`)
* `feat`: A new user-facing capability or system feature (e.g., `feat(stadium): add real-time crowd density AR overlay to fan app`).
* `fix`: A bug resolution (e.g., `fix(api): resolve race condition in gate turnstile concurrency check`).
* `docs`: Documentation updates across `docs/*.md` (e.g., `docs(schema): update Firestore indexes for live alert subcollection`).
* `style`: Formatting, indentation, or lint fixes without logic change (`style(web): run prettier across 3D dashboard widgets`).
* `refactor`: Code restructuring that neither fixes a bug nor adds a feature (`refactor(ai-router): simplify semantic similarity threshold evaluation`).
* `perf`: Code optimizations specifically aimed at reducing latency or bundle size (`perf(cv-client): replace JSON parsing with binary protobuf for edge frame metrics`).
* `test`: Adding missing tests or refactoring existing test suites (`test(shared): add 100% branch coverage for IoU bounding box math`).
* `chore`: Build configuration, dependency upgrades, or CI/CD workflow updates (`chore(deps): bump pnpm to v9.15.0 across workspace`).

---

## 8. Code Review & Pull Request Checklist

Before merging any pull request, the reviewer (Human or AI Coding Agent) must explicitly verify and check off the following 10-point inspection matrix inside the PR description:

- [ ] **1. Architecture Compliance:** Does the code strictly respect layer boundaries (`apps/*` $\rightarrow$ `packages/shared`) without illegal imports or bypasses?
- [ ] **2. Zero Hallucination & Schema Validity:** Are all data payloads explicitly validated using existing `Zod` runtime schemas (`@visionos/shared`)?
- [ ] **3. Error Propagation:** Are all potential failure points caught and wrapped in `VisionOSError` with explicit trace IDs and context?
- [ ] **4. Ponytail Simplicity Check:** Is the code minimal, readable, and free of speculative factory patterns, dead imports, or duplicate utility functions (`31_Ponytail_Rules.md`)?
- [ ] **5. Test Coverage:** Do new/modified unit and integration tests accompany the change (`*.spec.ts`), maintaining $\ge 90\%$ branch coverage?
- [ ] **6. No Console Logs:** Are all console print statements (`console.log`, `console.debug`) replaced by structured OpenTelemetry/Pino JSON logging (`logger.info({ ... })`)?
- [ ] **7. Design Token Compliance:** If UI components were modified, do they exclusively use pre-defined design tokens (`03_UI_UX_Design_System.md`) instead of hardcoded hex colors or arbitrary pixel sizes?
- [ ] **8. Documentation Synchronicity:** Have all relevant documentation files (`01_PRD.md`, `11_Backend_Schema.md`, `13_API_Specification.md`) been updated in this exact same commit if schemas or contracts changed?
- [ ] **9. Security & RBAC Enforcement:** Does any new endpoint in `apps/api-gateway` execute mandatory OAuth2/JWT middleware and verify user role permissions (`ORGANIZER`, `VOLUNTEER`, `FAN`)?
- [ ] **10. Backward Compatibility:** If a public API or database schema field was altered, does it maintain backwards compatibility for active legacy mobile clients (`30_Antigravity_Rules.md`)?
