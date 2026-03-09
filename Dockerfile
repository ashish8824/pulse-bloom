FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npm run build 2>&1

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
RUN npx prisma generate
EXPOSE 5000
CMD ["node", "dist/server.js"]