FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
WORKDIR /app

# Install deps
FROM base AS deps
COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/shared/package.json ./packages/
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter=web

# Build
FROM base AS builder
COPY . .
RUN pnpm turbo run build --filter=web

# Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static/
COPY --from=builder /app/apps/web/public ./public/

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]