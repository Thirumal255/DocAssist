# DocAssist Backend Dockerfile
# Node.js 20 LTS on Alpine for smaller image size

# Use the slim Debian image instead of Alpine
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

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Give Prisma a dummy URL so it doesn't crash during the build phase
ENV DATABASE_URL="postgresql://dummy:dummy@localhost/dummy"

# Generate Prisma client
RUN npx prisma@5 generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000


# Start server
CMD ["node", "dist/index.js"]
