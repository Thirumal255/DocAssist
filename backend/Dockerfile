# DocAssist backend: Node 20 + Express + Prisma, built for Cloud Run.
# The same image runs the API service and the one-off jobs
# (migrations, medicine import, admin creation).

# --- Build stage ---
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

# --- Runtime stage ---
FROM node:20-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Schema, migrations and the medicine CSV (used by the import job).
COPY prisma ./prisma
# Generate the client and fetch the migration engine now, as root, so the
# migrate job never needs to download anything at runtime.
RUN npx prisma generate && npx prisma --version >/dev/null

COPY --from=builder /app/dist ./dist

USER node
EXPOSE 8080
# Cloud Run sets PORT; the server listens on process.env.PORT.
CMD ["node", "dist/index.js"]
