# ---- Builder image ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy monorepo files (only what's needed)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY apps/samflix-backend ./apps/samflix-backend
COPY packages/prisma-client-for-samflix ./packages/prisma-client-for-samflix
COPY packages/tsconfig ./packages/tsconfig
COPY packages/eslint-config-samflix ./packages/eslint-config-samflix
COPY packages/prettier-config ./packages/prettier-config

RUN pnpm install --no-frozen-lockfile

# Build backend (includes Prisma client generation)
RUN pnpm turbo run build --filter=@samflix/backend

# ---- Runtime image ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy monorepo structure needed for pnpm workspace
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/samflix-backend/package.json ./apps/samflix-backend/
COPY --from=builder /app/packages/prisma-client-for-samflix/package.json ./packages/prisma-client-for-samflix/

# Install only prod deps
RUN corepack enable \
    && pnpm install --prod --frozen-lockfile --filter @samflix/backend...

# Copy built files
COPY --from=builder /app/apps/samflix-backend/dist ./apps/samflix-backend/dist
COPY --from=builder /app/packages/prisma-client-for-samflix/dist ./packages/prisma-client-for-samflix/dist
COPY --from=builder /app/packages/prisma-client-for-samflix/src/generated ./packages/prisma-client-for-samflix/src/generated

EXPOSE 3000
CMD ["node", "apps/samflix-backend/dist/app.js"]
