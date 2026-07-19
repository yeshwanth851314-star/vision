# Multi-stage Dockerfile for @visionos/api-gateway in pnpm monorepo context
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS builder
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @visionos/api-gateway db:generate
RUN pnpm --filter @visionos/api-gateway... build

FROM base AS runner
ENV NODE_ENV=development
COPY --from=builder /app /app

EXPOSE 8080
WORKDIR /app/apps/api-gateway
CMD ["node", "dist/server.js"]
