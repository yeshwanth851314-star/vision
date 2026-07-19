# 24_CI_CD: VisionOS Automated Pipeline & Delivery Governance

| Attribute | Value |
| :--- | :--- |
| **Title** | VisionOS Continuous Integration, Continuous Delivery (`CI/CD`), & Turborepo Build Governance |
| **Version** | 1.0.0 |
| **Status** | APPROVED |
| **Owner** | Lead DevOps Architect, Principal Software Engineer |
| **Purpose** | To establish the deterministic, high-velocity GitHub Actions pipeline, Turborepo remote build caching, multi-stage Docker containerization, and automated Canary deployment gates for VisionOS. |
| **Scope** | Enforced across the entire `pnpm` monorepo (`apps/*`, `packages/*`) for every commit, branch, and release tag. |
| **Assumptions** | 1. Build and test validation (`pnpm lint && pnpm test`) must complete across all 14 monorepo packages in $<4\text{ minutes}$ via Turborepo Remote Caching (`Google Cloud Storage`).<br>2. Production deployments to Google Cloud Run are gated by automated canary health checks (`10% traffic for 15 minutes`). |
| **Dependencies** | `00_Project_Vision.md` — Strategic Architecture Charter |
| **References** | • `23_Testing_Strategy.md` — Automated Test Tiers<br>• `25_Deployment.md` — Infrastructure Manifests<br>• `29_Coding_Standards.md` — Monorepo Governance |

## Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-07-13 | Lead DevOps Architect | Initial release of GitHub Actions pipeline YAML, Dockerfile, and Turborepo remote caching setup. |

---

## 1. CI/CD Pipeline DAG & Stage Orchestration

```mermaid
graph TD
  PR[`Push / Pull Request to main`] --> Checkout[`1. Checkout & Setup Node 22 (`pnpm v9.15`)`]
  Checkout --> Cache[`2. Pull Turborepo Remote Cache (`GCS CDN`)`]
  Cache --> Lint[`3. Parallel Lint & Type Check (`pnpm check`)`]
  Lint --> Unit[`4. Atomic Unit & FSM Tests (`Vitest / Jest`)`]
  Unit --> Integration[`5. Testcontainers RLS & PostGIS Integration Tests`]
  
  Integration --> Build[`6. Monorepo Production Build (`pnpm build`)`]
  Build --> Docker[`7. Multi-Stage Docker Image Build (`node:22-alpine`)`]
  Docker --> Scan[`8. Trivy / Snyk Vulnerability & Container Scan (`Severity >= HIGH blocked`)`]
  
  Scan -- Branch == main --> PushArtifact[`9. Push Image to Google Artifact Registry (`us-central1-docker.pkg.dev`)`]
  PushArtifact --> CanaryDeploy[`10. Deploy Canary Service (`10% Traffic` via Cloud Run)`]
  CanaryDeploy --> HealthCheck[`11. Automated Prometheus / OpenTelemetry Health Verification`]
  HealthCheck -- `Error Rate == 0% for 15 mins` --> FullPromote[`12. Promote to 100% Production Traffic`]
  HealthCheck -- `Error Rate > 0.1%` --> AutoRollback[`13. Instant Automated Rollback to Previous Image Revision`]
```

---

## 2. GitHub Actions Production Workflow (`.github/workflows/production_pipeline.yml`)

```yaml
name: VisionOS Production CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  TURBO_TOKEN: ${{ secrets.TURBO_REMOTE_CACHE_TOKEN }}
  TURBO_TEAM: visionos-stadium-core
  GCP_PROJECT_ID: visionos-prod-2026
  GCP_REGION: us-central1

jobs:
  validate-and-test:
    name: 1. Code Quality, RLS & Unit Verification
    runs-on: ubuntu-24.04-core-16 # High-throughput 16-core runner
    timeout-minutes: 10
    steps:
      - name: Checkout Monorepo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install pnpm v9.15 & Node.js 22
        uses: pnpm/action-setup@v3
        with:
          version: 9.15.0

      - name: Setup Node environment
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Execute Parallel Type Check & ESLint
        run: pnpm turbo run check lint --continue

      - name: Execute Atomic Unit & FSM Tests
        run: pnpm turbo run test:unit --coverage

      - name: Execute Testcontainers PostGIS Integration Tests
        run: pnpm turbo run test:integration
        env:
          POSTGRES_DOCKER_IMAGE: postgis/postgis:16-3.4

  build-and-deploy:
    name: 2. Container Build & Canary Deployment
    needs: validate-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Checkout Monorepo
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud Platform
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider'
          service_account: 'ci-cd-deployer@visionos-prod-2026.iam.gserviceaccount.com'

      - name: Configure Docker for Google Artifact Registry
        run: gcloud auth configure-docker ${{ env.GCP_REGION }}-docker.pkg.dev --quiet

      - name: Build & Push API Gateway Docker Image
        run: |
          IMAGE_TAG="${{ env.GCP_REGION }}-docker.pkg.dev/${{ env.GCP_PROJECT_ID }}/stadium-services/api-gateway:${{ github.sha }}"
          docker build -f apps/api-gateway/Dockerfile -t $IMAGE_TAG .
          docker push $IMAGE_TAG

      - name: Execute Trivy Container Security Scan
        uses: aquasecurity/trivy-action@0.18.0
        with:
          image-ref: '${{ env.GCP_REGION }}-docker.pkg.dev/${{ env.GCP_PROJECT_ID }}/stadium-services/api-gateway:${{ github.sha }}'
          format: 'table'
          exit-code: '1'
          ignore-unfixed: true
          severity: 'CRITICAL,HIGH'

      - name: Deploy Canary Revision to Google Cloud Run (`10% Traffic`)
        run: |
          gcloud run deploy api-gateway \
            --image=${{ env.GCP_REGION }}-docker.pkg.dev/${{ env.GCP_PROJECT_ID }}/stadium-services/api-gateway:${{ github.sha }} \
            --region=${{ env.GCP_REGION }} \
            --service-account=api-gateway-sa@visionos-prod-2026.iam.gserviceaccount.com \
            --cpu=4 --memory=8Gi \
            --min-instances=10 --max-instances=200 \
            --no-traffic
          
          # Route exactly 10% of live production traffic to the new revision canary
          LATEST_REVISION=$(gcloud run services describe api-gateway --region=${{ env.GCP_REGION }} --format='value(status.latestCreatedRevisionName)')
          gcloud run services update-traffic api-gateway --region=${{ env.GCP_REGION }} --to-revisions=$LATEST_REVISION=10
```

---

## 3. Production Multi-Stage Dockerfile (`apps/api-gateway/Dockerfile`)

To minimize cold starts ($<800\text{ms}$) and prevent root-privilege exploits (`FR-SEC-004`), the production container is constructed from a stripped `node:22-alpine` image:

```dockerfile
# =============================================================================
# STAGE 1: Prune & Dependency Build (`pruner`)
# =============================================================================
FROM node:22-alpine AS pruner
WORKDIR /app
RUN npm install -g pnpm@9.15.0 turbo@2.0.0
COPY . .
RUN turbo prune --scope=api-gateway --docker

# =============================================================================
# STAGE 2: Compile TypeScript & Native Addons (`builder`)
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9.15.0
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN pnpm turbo run build --filter=api-gateway

# =============================================================================
# STAGE 3: Production Minimal Runtime (`runner`)
# =============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# Create non-root system user and group for maximum runtime security
RUN addgroup --system --gid 1001 visiongroup && \
    adduser --system --uid 1001 visionuser && \
    apk add --no-cache curl tzdata && \
    cp /usr/share/zoneinfo/UTC /etc/localtime

ENV NODE_ENV=production
ENV PORT=8080

# Copy compiled artifacts from builder stage
COPY --from=builder --chown=visionuser:visiongroup /app/apps/api-gateway/dist ./dist
COPY --from=builder --chown=visionuser:visiongroup /app/node_modules ./node_modules
COPY --from=builder --chown=visionuser:visiongroup /app/package.json ./package.json

USER visionuser
EXPOSE 8080

# Healthcheck probing Fastify status route
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]
```
