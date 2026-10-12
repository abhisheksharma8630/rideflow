# RideFlow API image. Built from the monorepo root context.
FROM node:20-alpine AS base
RUN apk add --no-cache wget openssl
WORKDIR /app

# Copy workspace manifests for install caching.
COPY package.json package-lock.json* ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
COPY services/api/package.json ./services/api/

# Install all workspace deps (no scripts yet).
RUN npm install --no-audit --no-fund

# Copy sources.
COPY packages ./packages
COPY services/api ./services/api

# Build shared packages, generate Prisma client, build API.
RUN npm run build:packages \
  && npm run -w @rideflow/api prisma:generate \
  && npm run -w @rideflow/api build

EXPOSE 4000

# On start: apply migrations, seed, then launch. Seeding is idempotent.
CMD ["sh", "-c", "npm run -w @rideflow/api prisma:migrate && npm run -w @rideflow/api prisma:seed && npm run -w @rideflow/api start:prod"]
