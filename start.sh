#!/bin/sh
echo "Running Prisma migrations..."
DATABASE_URL=$DATABASE_URL npx prisma migrate deploy --schema=prisma/schema.prisma
echo "Starting server..."
node dist/server.js