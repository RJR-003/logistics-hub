# Use official Node.js image as base
FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /app

# Copy package files first
# Docker caches layers — copying package.json separately means
# npm install only reruns when dependencies change, not on every code change
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy prisma schema before generating client
COPY prisma ./prisma/

# Generate Prisma client inside the container
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Compile seed separately
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --esModuleInterop true --skipLibCheck true --resolveJsonModule true --ignoreConfig


# Expose the port the app runs on
EXPOSE 3001

COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh
CMD ["sh", "scripts/start.sh"]