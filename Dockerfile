# ---- Stage 1: Build Frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Build Backend ----
FROM node:20-alpine AS backend-build
RUN apk add --no-cache openssl
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# ---- Stage 3: Production ----
FROM node:20-alpine AS production
WORKDIR /app

# Install OpenSSL (required by Prisma engine)
RUN apk add --no-cache openssl

# Install only production deps for backend
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy Prisma schema and generate client in production image
COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate

# Copy compiled backend
COPY --from=backend-build /app/backend/dist ./backend/dist

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create uploads directory
RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend

# Expose port (Railway sets PORT env var)
EXPOSE ${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/health || exit 1

# Copy startup script
COPY start.sh /app/backend/start.sh
RUN chmod +x /app/backend/start.sh

# Start the server (runs prisma db push, then node)
CMD ["./start.sh"]
