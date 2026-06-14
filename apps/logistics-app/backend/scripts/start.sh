#!/bin/sh

echo "Waiting for postgres to be ready..."

while ! nc -z postgres 5432; do
  sleep 1
done

echo "Postgres is ready"

echo "Running migrations..."
npx prisma migrate deploy

echo "Running seed..."
node dist/prisma/seed.js

echo "Starting server..."
npm start