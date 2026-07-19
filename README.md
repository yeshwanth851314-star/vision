# VisionOS — Grounded AI Stadium Operations Platform

VisionOS is a context-aware generative AI stadium operations and fan experience platform designed to handle complex tournament logistics. It provides real-time operational decision support, crowd surge routing, accessible navigation, and multi-language assistance for fans, volunteers, organizers, and venue staff.

---

## Live Demo

VisionOS is available as a public hackathon demonstration.

**Live Application:** [https://vision-web-sigma.vercel.app](https://vision-web-sigma.vercel.app)

The public demo uses the deployed VisionOS API Gateway on Render and live Gemini integration for natural-language reasoning/tool selection. Operational stadium telemetry and the final volunteer dispatch side effect are simulated in the current hackathon environment.

---

## 1. Value Proposition
VisionOS matches user roles, accessibility needs, and real-time crowd telemetry with verified stadium knowledge and Generative AI to deliver safe, compliant, and grounded navigational actions.

```text
User Context + Accessibility Profile + Simulated Crowd Telemetry + Verified Grounding Data
                                 ↓
              VisionOS Multi-Tier GenAI Router
                                 ↓
            Grounded Action & Active Tool Execution
```

---

## 2. Why Generative AI is Necessary
Traditional static applications fail to solve stadium operational issues dynamically. VisionOS requires GenAI because:
- **Unstructured Multi-Agent Interactions**: Dynamic translation of unstructured natural-language requests from international users (fans/staff) into structured tool executions.
- **Dynamic Action Dispatch**: Evaluating security access layers in real-time to dispatch volunteer tickets dynamically.

---

## 3. Hero Evaluation User Journey
A wheelchair fan encounters a crowd surge near Gate A and asks:
> *"Gate A is crowded and I use a wheelchair. What is the safest route to my destination?"*

1. **Intake**: System decodes JWT mapping user role (`FAN`) and accessibility profile (`WHEELCHAIR`).
2. **Retrieval**: The RAG layer retrieves relevant grounded context from the verified in-memory stadium knowledge store (keyword-weighted scoring over 5 curated operational chunks).
3. **Routing**: Standard steps and escalators are pruned. Step-free ramp coordinates are selected.
4. **Action**: Gemini performs live natural-language tool selection. Tool arguments are validated and RBAC authorization is enforced by the application. The final dispatch side effect is simulated in the current hackathon environment (no live Cloud SQL connection).

---

## 4. Tech Stack & Architecture
- **Core Platform**: Next.js 15 Monorepo, Fastify API Gateway, Prisma ORM, PostgreSQL/PostGIS.
- **AI Core**: Google AI Studio Gemini API (`gemini-3.1-flash-lite`), in-memory vector-style routing cache (ScaNN-tier deterministic).
- **Real-Time Layer**: Socket.io Server, Pub/Sub Event Topics (infrastructure configured; event processing simulated in local environment).
- **Infrastructure**: Terraform IaC for GCP Cloud Run + Vercel hybrid deployments (configured; staging deployment requires cloud credentials).

---

## 5. Security & Accessibility
- **Zero-Trust JWT/RBAC**: Cryptographically verified JSON Web Tokens enforcing role-based access limits on tool invocations.
- **CORS & Prompt Injection**: Hardened input schemas preventing prompt injection leaks.
- **WCAG 2.2 Accessibility**: Automated accessibility validation aligned with applicable WCAG 2.2 requirements using axe-core and keyboard E2E testing. Manual screen-reader validation pending.

---

## 6. How to Run & Test
### Setup Environment
```bash
# Copy template configs
cp .env.example .env
# Edit .env and insert your real GEMINI_API_KEY
```

### Installation & Build
```bash
# Install dependencies
pnpm install
# Compile and build the monorepo
pnpm build
```

### Test Suite Execution
```bash
# Run linting
pnpm lint
# Run typechecks
pnpm typecheck
# Run all unit/integration tests
npx vitest run
# Run Playwright E2E browser tests
npx playwright test
```
