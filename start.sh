#!/bin/sh
echo "Syncing Prisma schema..."
DATABASE_URL="postgresql://pulsebloom_admin:PulseBloom8824@pulsebloom-db.cbsye8yacfd0.ap-south-1.rds.amazonaws.com:5432/pulsebloom" npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>&1 || echo "Schema sync failed, continuing..."
echo "Starting server..."
node dist/server.js