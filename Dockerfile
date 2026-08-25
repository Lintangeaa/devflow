FROM node:24-alpine AS base
RUN npm install -g pnpm@11.23.0 --no-fund --no-audit
WORKDIR /app

# Install deps
FROM base AS deps
COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter=web...

# Build
FROM base AS builder
ARG API_INTERNAL_URL=http://devflow_api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV CI=true
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=web

# Runner (Standard Next.js 15 Standalone)
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static/
COPY --from=builder /app/apps/web/public ./apps/web/public/

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]