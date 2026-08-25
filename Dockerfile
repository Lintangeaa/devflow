FROM node:24-alpine AS base
RUN npm install -g pnpm@11.23.0 --no-fund --no-audit
WORKDIR /app

# Install deps (only manifests, so build-base layers cache well)
FROM base AS deps
COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json .npmrc ./
RUN mkdir -p /app/packages/db /app/packages/shared /app/apps/web
COPY packages/db/package.json /app/packages/db/package.json
COPY packages/shared/package.json /app/packages/shared/package.json
COPY apps/web/package.json /app/apps/web/package.json
RUN pnpm install --frozen-lockfile --filter=web

# Build
FROM base AS builder
COPY . .
RUN pnpm turbo run build --filter=web

# Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=127.0.0.1
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static/
COPY --from=builder /app/apps/web/public ./apps/web/public/
COPY --from=builder /app/apps/web/server.js ./apps/web/server.js

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]