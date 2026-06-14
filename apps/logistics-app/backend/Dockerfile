FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl netcat-openbsd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3002

COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh
CMD ["sh", "scripts/start.sh"]