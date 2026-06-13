# Logistics Operations Hub

A full-stack courier logistics system built across two independent applications that work together to manage packages from drop-off to delivery.

---

## What This Project Is

The Logistics Operations Hub simulates a real-world courier company's internal systems — similar to how a company like Delhivery or DTDC operates internally.

A customer drops off a package at a front office. It gets registered, assigned a tracking ID, picked up by a regional hub, sorted into bags, loaded onto trucks, routed across regions, and finally delivered. At every step the customer can track their package online.

---

## The Two Applications

### App 1 — Courier Collection Application

The front-office application. Used by staff to register packages and by customers to track them.

- `apps/collection-app/`
- Runs on port `3000` (frontend) and `3001` (backend)
- See [collection-app README](apps/collection-app/README.md)

### App 2 — Courier Logistics Application

The back-office application. Used by regional hub operators to manage bags, trucks, and routing. Not accessible to the public.

- `apps/logistics-app/`
- Runs on port `3002`
- See [logistics-app README](apps/logistics-app/README.md)

---

## How the Two Apps Work Together

```
Customer drops package at front office
              ↓
    App 1 creates package
    generates tracking ID
              ↓
    App 1 fires webhook → App 2
              ↓
    App 2 creates package internally
    Hub operators manage routing:
      package → bag → truck → region
              ↓
    App 2 ETL job runs every 6 hours
    pushes status updates → App 1
              ↓
    App 1 processes updates
    applies to packages table
              ↓
    Customer tracks package on App 1
    sees live status ✓
```

### Integration Points

**Webhook (App 1 → App 2)**
When a new package is created in App 1, it immediately fires a `POST /webhook/package` to App 2. App 2 creates the package in its own system with status `TO_BE_PICKED_UP`.

**ETL Push Job (App 2 → App 1)**
App 2 runs a scheduled job every 6 hours (1 minute in development) that collects all updated packages and pushes them in bulk to App 1's `POST /api/raw-updates` endpoint. App 1 saves the raw payload to a staging table and processes it asynchronously every 30 seconds.

---

## Running the Full System

Each application runs independently via Docker Compose. To run the full system, start both apps in separate terminals.

**Terminal 1 — Start App 1:**

```bash
cd apps/collection-app
docker compose up --build
```

**Terminal 2 — Start App 2:**

```bash
cd apps/logistics-app
docker compose up --build
```

Once both are running:

| Service           | URL                   |
| ----------------- | --------------------- |
| App 1 Frontend    | http://localhost:3000 |
| App 1 Backend API | http://localhost:3001 |
| App 2 Backend API | http://localhost:3002 |

---

## Development Mode

For active development with hot reload, run only the databases in Docker and start the servers locally.

```bash
# App 1 database
cd apps/collection-app
docker compose up postgres -d

# App 2 database
cd apps/logistics-app
docker compose up postgres -d

# App 1 backend (new terminal)
cd apps/collection-app/backend
npm install && npm run dev

# App 1 frontend (new terminal)
cd apps/collection-app/frontend
npm install && npm run dev

# App 2 backend (new terminal)
cd apps/logistics-app
npm install && npm run dev
```

---

## Project Structure

```
logistics-hub/
├── apps/
│   ├── collection-app/          Stage 1 — Courier Collection Application
│   │   ├── backend/             Express API + Prisma
│   │   ├── frontend/            Next.js frontend
│   │   ├── docker-compose.yml
│   │   └── README.md
│   │
│   └── logistics-app/           Stage 2 + 3 — Courier Logistics Application
│       ├── src/                 Express API + ETL job
│       ├── prisma/              Schema + migrations + seed
│       ├── scripts/
│       ├── docker-compose.yml
│       └── README.md
│
├── docs/
│   └── architecture.md          Full system architecture documentation
└── README.md                    This file
```

---

## Tech Stack

| Concern          | Technology                             |
| ---------------- | -------------------------------------- |
| Language         | TypeScript                             |
| Backend          | Node.js + Express                      |
| Frontend         | Next.js 14 (App Router) + Tailwind CSS |
| Database         | PostgreSQL 15                          |
| ORM              | Prisma 5                               |
| Job Scheduling   | node-cron                              |
| Containerization | Docker + Docker Compose                |

---

## Ports Reference

| Service          | Port |
| ---------------- | ---- |
| App 1 Frontend   | 3000 |
| App 1 Backend    | 3001 |
| App 1 PostgreSQL | 5432 |
| App 2 Backend    | 3002 |
| App 2 PostgreSQL | 5433 |

---

## Documentation

- [Architecture Overview](docs/architecture.md) — full system design, data flow, and key decisions
- [Collection App README](apps/collection-app/README.md) — setup and API docs for App 1
- [Logistics App README](apps/logistics-app/README.md) — setup and API docs for App 2

---

## Stages

| Stage   | Description                                                               | Status     |
| ------- | ------------------------------------------------------------------------- | ---------- |
| Stage 1 | Courier Collection Application — package registration and public tracking | ✓ Complete |
| Stage 2 | Courier Logistics Application — regional hub operations                   | ✓ Complete |
| Stage 3 | Integration — webhook and ETL between both apps                           | ✓ Complete |
