# --------------------------
# 1️⃣ Build stage
# --------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cache-friendly)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# --------------------------
# 2️⃣ Production stage
# --------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create folder for SQLite database
RUN mkdir -p /app/data

# Copy package files and node_modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy Next.js build and public assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
