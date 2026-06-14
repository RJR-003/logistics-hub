FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl netcat-openbsd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# Compile seed separately outside of tsconfig scope
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --esModuleInterop true --skipLibCheck true --resolveJsonModule true --ignoreConfig

EXPOSE 3002

COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh
CMD ["sh", "scripts/start.sh"]