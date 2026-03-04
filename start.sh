#!/bin/sh

echo "Running database migrations..."
npx prisma db push --skip-generate || echo "WARNING: Database push failed. Server will start anyway."

echo "Starting server..."
exec node dist/index.js
