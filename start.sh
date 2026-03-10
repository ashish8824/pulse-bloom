#!/bin/sh

echo "Syncing Prisma schema..."

npx prisma db push --schema=./prisma/schema.prisma || echo "Schema sync failed, continuing..."

echo "Starting server..."

node dist/server.js