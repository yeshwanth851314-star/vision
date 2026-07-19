# EVALUATION EVIDENCE ROADMAP

This document maps hackathon evaluation criteria to specific implementations and verifiable outputs. All links are repository-relative and resolve from the project root.

---

## Criterion & Traceability Matrix

| Criterion | Implementation | Verification Tests | Evidence |
| :--- | :--- | :--- | :--- |
| **Problem Alignment** | [apps/api-gateway/src/controllers/copController.ts](apps/api-gateway/src/controllers/copController.ts) | [tests/integration/api-gateway.test.ts](tests/integration/api-gateway.test.ts) | Grounded crowd-management, navigation, volunteer dispatch responses |
| **Code Quality** | [packages/ai-router/src/index.ts](packages/ai-router/src/index.ts) | [tests/unit/shared-and-router.test.ts](tests/unit/shared-and-router.test.ts) | `LOCALLY VALIDATED` — Typecheck: 0 errors; Lint: 0 errors |
| **Security** | [apps/api-gateway/src/middleware/auth.ts](apps/api-gateway/src/middleware/auth.ts) | [apps/api-gateway/tests/security.test.ts](apps/api-gateway/tests/security.test.ts) | `LOCALLY VALIDATED` — JWT, RBAC, CORS, rate-limit, prompt injection |
| **Efficiency** | [packages/ai-router/src/index.ts](packages/ai-router/src/index.ts) | [tests/performance/load-benchmark.test.ts](tests/performance/load-benchmark.test.ts) | `LOCALLY BENCHMARKED` — In-memory ScaNN-tier cache avoids live Gemini for routine queries |
| **Testing** | All packages | [tests/integration/phase2-compliance.test.ts](tests/integration/phase2-compliance.test.ts) | `LOCALLY VALIDATED` — 294 tests passing, 0 failures |
| **Accessibility** | [apps/web/src/app/layout.tsx](apps/web/src/app/layout.tsx) | [tests/e2e/keyboard.spec.ts](tests/e2e/keyboard.spec.ts) | `LOCALLY VALIDATED` — Axe-core 0 violations; keyboard E2E verified; manual screen-reader: NOT EXECUTED |
| **Smart Assistant** | [packages/ai-router/src/index.ts](packages/ai-router/src/index.ts) | [apps/api-gateway/tests/e2e-ai.test.ts](apps/api-gateway/tests/e2e-ai.test.ts) | `LIVE EXTERNAL VALIDATED` — Real Gemini API invocation with `gemini-3.1-flash-lite` |
| **Contextual Decisions** | [apps/api-gateway/src/services/dispatchService.ts](apps/api-gateway/src/services/dispatchService.ts) | [packages/ai-router/tests/evals/evalRunner.test.ts](packages/ai-router/tests/evals/evalRunner.test.ts) | `LOCALLY VALIDATED` — Role + zone + priority context; multilingual eval 80% accuracy |
| **Practical Usability** | [apps/web/src/app/(cop)/dashboard/page.tsx](apps/web/src/app/(cop)/dashboard/page.tsx) | [tests/e2e/cop.spec.ts](tests/e2e/cop.spec.ts) | `LOCALLY VALIDATED` — Monorepo builds clean; E2E viewports verified |

---

## Actual RAG Implementation

The retrieval component is an **in-memory keyword-scored knowledge store** — not a vector database or embedding model.

**File**: [packages/ai-router/src/rag.ts](packages/ai-router/src/rag.ts)

- `STADIUM_KNOWLEDGE_BASE`: A static array of 5 curated operational knowledge chunks (restrooms, ADA exits, emergency SOP, HVAC zones, gate hours).
- `retrieveGroundedContext(queryText)`: Tokenises the query, scores each chunk by keyword overlap (title weighted ×2), and returns the top 2 matching chunks as a grounded prompt prefix.

**Classification: `IN-MEMORY KEYWORD-SCORED KNOWLEDGE STORE`**

No embeddings, no vector index, no external retrieval database are used.

Correct wording: *"The RAG layer retrieves relevant grounded context from the verified in-memory stadium knowledge store."*

---

## Actual Dispatch Tool Execution Classification

The `dispatch_volunteer_ticket` Gemini tool-calling flow:

| Step | Component | Status |
| :--- | :--- | :--- |
| Natural-language intent | Fastify route → AI router | `LOCALLY VALIDATED` |
| Live Gemini invocation | `@google/generative-ai` SDK | `LIVE EXTERNAL VALIDATED` |
| Tool selection (`dispatch_volunteer_ticket`) | Gemini function call | `LIVE EXTERNAL VALIDATED` |
| Argument generation (`zoneId`, `taskType`, `priority`) | Gemini structured output | `LIVE EXTERNAL VALIDATED` |
| Schema validation (required fields present, typed) | AI router | `IMPLEMENTED` |
| RBAC authorization (role must be `ROLE_ORGANIZER` / `ROLE_RESPONDER`) | AI router | `IMPLEMENTED AND TESTED` |
| Dispatch service execution (`dispatchService.ts`) | **Inline simulation** — ticket ID computed in AI router; `DispatchService.createFieldDispatch()` is NOT called | `SIMULATED` |

> **Classification: `LIVE GEMINI TOOL SELECTION + REAL ARGUMENT VALIDATION + REAL RBAC AUTHORIZATION + SIMULATED DISPATCH EXECUTION`**
>
> Gemini performs live natural-language tool selection. Tool arguments are validated and authorization is enforced by the application. The final dispatch side effect is simulated — `DispatchService` is not invoked in the current hackathon environment (no live Cloud SQL/PostGIS connection).

---

## Hero AI Journey Evidence

For the crowd surge + wheelchair accessibility scenario:

| Step | Input Source | Status |
| :--- | :--- | :--- |
| Natural-language intent | User query | `LOCALLY VALIDATED` |
| JWT decode + role mapping | Bearer token | `LOCALLY VALIDATED` |
| In-memory knowledge store retrieval | Keyword scoring | `LOCALLY VALIDATED` |
| Gemini model invocation | Live Gemini API | `LIVE EXTERNAL VALIDATED` |
| Tool argument generation | Gemini structured output | `LIVE EXTERNAL VALIDATED` |
| RBAC authorization check | Role from JWT | `LOCALLY VALIDATED` |
| Dispatch service execution | Inline simulation | `SIMULATED` |
| Grounded response delivery | AI router → Fastify | `LOCALLY VALIDATED` |

---

## Claim Accuracy Index

| Claim | Actual Classification |
| :--- | :--- |
| In-memory routing cache response `<10ms` | `LOCALLY BENCHMARKED` |
| Live Gemini invocation | `LIVE EXTERNAL VALIDATED` |
| Gemini tool selection | `LIVE EXTERNAL VALIDATED` |
| RBAC authorization enforcement | `IMPLEMENTED AND TESTED` |
| RAG / grounding | `IN-MEMORY KEYWORD-SCORED KNOWLEDGE STORE` |
| 294 unit/integration tests pass | `LOCALLY VALIDATED` |
| 50 Playwright E2E tests pass | `LOCALLY VALIDATED` |
| Axe-core 0 violations | `LOCALLY VALIDATED` |
| Step-free wheelchair routing | `LOCALLY VALIDATED (simulated telemetry)` |
| 120,000-VU stress-test | `SCENARIO CONFIGURED — NOT EXECUTED` |
| Simulated crowd telemetry | `SIMULATED` |
| Cloud Run / Vercel staging deploy | `CONFIGURED — BLOCKED (cloud credentials required)` |
| WCAG 2.2 accessibility | `AUTOMATED VALIDATION ONLY — MANUAL SCREEN-READER: NOT EXECUTED` |
| Dispatch service execution | `SIMULATED — dispatchService.ts not called in current environment` |
