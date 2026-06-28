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

echo "Running seed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const regions = [
  { code: 'SOUTH-01', name: 'Chennai Region' },
  { code: 'SOUTH-02', name: 'Bangalore Region' },
  { code: 'NORTH-01', name: 'Delhi Region' },
  { code: 'NORTH-02', name: 'Mumbai Region' },
  { code: 'EAST-01',  name: 'Kolkata Region' },
  { code: 'WEST-01',  name: 'Ahmedabad Region' },
];

async function main() {
  for (const region of regions) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: {},
      create: region
    });
  }
  console.log('Seeded regions successfully');
  await prisma.\$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
"

# Start the app
echo "Starting server..."
npm start