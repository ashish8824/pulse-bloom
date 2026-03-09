# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — Production runner
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
RUN npx prisma generate
EXPOSE 5000
CMD ["node", "dist/server.js"]