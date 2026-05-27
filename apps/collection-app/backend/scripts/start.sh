#!/bin/sh

echo "Waiting for postgres to be ready..."

# Keep trying to connect to postgres until it succeeds
while ! nc -z postgres 5432; do
  sleep 1
done

echo "Postgres is ready"

# Run any pending migrations
echo "Running migrations..."
npx prisma migrate deploy

# Start the app
echo "Starting server..."
npm start