# DocAssist Backend Dockerfile

# --- STAGE 1: BUILDER ---
FROM node:20-slim AS builder

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# --- STAGE 2: PRODUCTION ---
FROM node:20-slim

# Install OpenSSL for Prisma to use at runtime!
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Give Prisma a dummy URL so it doesn't crash during the build phase
ENV DATABASE_URL="postgresql://dummy:dummy@localhost/dummy"

# Generate Prisma client for Debian
RUN npx prisma@5 generate

# Switch to the secure 'node' user built into the image
USER node

# Expose port (Cloud Run will override this with its own PORT variable, but it's good practice)
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]