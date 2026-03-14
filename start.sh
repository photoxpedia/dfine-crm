#!/bin/sh

echo "Running database migrations..."
timeout -t 30 npx prisma db push --skip-generate 2>&1 || true
echo "Database push step completed (or skipped)."

echo "Starting server..."
exec node dist/index.js
