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

# Build Prisma client + backend
RUN pnpm turbo run prisma:generate --filter=@samflix/prisma-client
RUN pnpm turbo run build --filter=@samflix/backend

# ---- Runtime image ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only built backend
COPY --from=builder /app/apps/samflix-backend/dist ./dist
COPY --from=builder /app/apps/samflix-backend/package.json ./

# Install only prod deps for backend
RUN corepack enable \
    && pnpm install --prod --filter @samflix/backend...

EXPOSE 3000
CMD ["node", "dist/index.js"]
