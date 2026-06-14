# Courier Logistics Application

The back-office application of the Logistics Operations Hub. Used by regional hub operators to manage packages, bags, trucks, and routing across regions.

This application is not accessible to the general public or front-office staff.

---

## What This App Does

- Receives new packages from the Courier Collection Application via webhook
- Allows hub operators to assign packages to sealed bags by direction
- Tracks bags loaded onto trucks with scheduled departure times
- Manages the full truck lifecycle — scheduled, loading, departed, arrived
- Supports multi-hop routing — packages re-bagged at each regional hub until final destination
- Marks packages for local delivery when they reach their destination region
- Records delays on bags and trucks, automatically marking all related packages as delayed
- Pushes status updates to the Courier Collection Application every 6 hours via ETL job

---

## Tech Stack

| Layer            | Technology                             |
| ---------------- | -------------------------------------- |
| Backend          | Node.js + Express + TypeScript         |
| Frontend         | Next.js 14 (App Router) + Tailwind CSS |
| Database         | PostgreSQL 15                          |
| ORM              | Prisma 5                               |
| Job Scheduler    | node-cron                              |
| Containerization | Docker + Docker Compose                |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

---

## Running the App

### Full Docker Setup (Recommended)

> **Note:** The Courier Collection Application (`apps/collection-app`) should be started first as it creates the shared Docker network. However App 2 can also run standalone — it will create the network itself if it doesn't exist.

```bash
cd apps/logistics-app
docker compose up --build
```

This starts three services:

- **PostgreSQL** on port `5433`
- **Backend API** on port `3002`
- **Frontend** on port `3003`

Regions are automatically seeded on first startup.

Open the operator dashboard at:

```
http://localhost:3003
```

To stop:

```bash
docker compose down
```

Full reset including database:

```bash
docker compose down -v
```

---

### Development Mode

Run only the database in Docker and start the servers locally for hot reload.

**Prerequisites:**

- Node.js 20+
- npm

**Step 1 — Start the database:**

```bash
cd apps/logistics-app
docker compose up postgres -d
```

**Step 2 — Start the backend:**

```bash
cd apps/logistics-app/backend
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev
```

Backend runs on `http://localhost:3002`.

**Step 3 — Start the frontend:**

```bash
cd apps/logistics-app/frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs on `http://localhost:3003`.

---

### Dev Container (VS Code)

Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension in VS Code.

```bash
# Open the logistics-app folder in VS Code
code apps/logistics-app

# VS Code will detect .devcontainer/ and prompt:
# "Reopen in Container" → click it
```

Once inside the container, open a terminal and run:

```bash
# Backend
cd backend
cp .env.example .env
npm run migrate
npm run seed
npm run dev

# Frontend (new terminal tab)
cd frontend
cp .env.example .env.local
npm run dev
```

Each developer gets their own isolated database. No shared state between developers.

---

## Environment Variables

### Backend (`apps/logistics-app/backend/.env`)

| Variable       | Dev Mode                                                     | Docker Mode                                                 |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `PORT`         | `3002`                                                       | `3002`                                                      |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/logistics_db` | `postgresql://postgres:postgres@postgres:5432/logistics_db` |
| `APP1_URL`     | `http://localhost:3001`                                      | `http://collection_backend:3001`                            |

### Frontend (`apps/logistics-app/frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

> Note: When running via Docker Compose, environment variables are injected automatically. `.env` files are only needed for development mode.

---

## API Endpoints

Base URL: `http://localhost:3002`

### Health

| Method | Endpoint  | Description  |
| ------ | --------- | ------------ |
| GET    | `/health` | Health check |

### Webhook

| Method | Endpoint           | Description                    |
| ------ | ------------------ | ------------------------------ |
| POST   | `/webhook/package` | Receive new package from App 1 |

### Packages

| Method | Endpoint                       | Description                     |
| ------ | ------------------------------ | ------------------------------- |
| GET    | `/api/packages`                | Get all packages                |
| POST   | `/api/packages/assign-bag`     | Assign package to a bag         |
| PUT    | `/api/packages/status`         | Update package status           |
| POST   | `/api/packages/local-delivery` | Mark package for local delivery |

### Bags

| Method | Endpoint          | Description                              |
| ------ | ----------------- | ---------------------------------------- |
| GET    | `/api/bags`       | Get all bags                             |
| POST   | `/api/bags`       | Create a new bag                         |
| POST   | `/api/bags/delay` | Mark bag and all its packages as delayed |

### Trucks

| Method | Endpoint               | Description                                    |
| ------ | ---------------------- | ---------------------------------------------- |
| GET    | `/api/trucks`          | Get all trucks                                 |
| POST   | `/api/trucks`          | Create a new truck                             |
| POST   | `/api/trucks/load-bag` | Load a bag onto a truck                        |
| POST   | `/api/trucks/depart`   | Mark truck as departed                         |
| POST   | `/api/trucks/arrive`   | Mark truck as arrived at a region              |
| POST   | `/api/trucks/delay`    | Mark truck and all related packages as delayed |

### Regions

| Method | Endpoint       | Description     |
| ------ | -------------- | --------------- |
| GET    | `/api/regions` | Get all regions |

### Dashboard

| Method | Endpoint         | Description                          |
| ------ | ---------------- | ------------------------------------ |
| GET    | `/api/dashboard` | Operator dashboard grouped by status |

---

## Frontend Pages

| URL         | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `/`         | Hub dashboard — four sections                                |
| `/packages` | All packages — assign to bag or schedule delivery            |
| `/bags`     | All bags — create bags, mark delayed                         |
| `/trucks`   | All trucks — create, load bags, depart, arrive, mark delayed |

---

## Hub Operator Workflow

### Receiving New Packages

New packages arrive automatically via webhook from App 1 when a customer drops off a package. They appear in the dashboard under "New Packages — Current Shift".

### Processing Packages

```
1. Go to Bags page → create a bag with direction (NORTH/SOUTH/EAST/WEST)
2. Go to Packages page → assign packages to the bag
3. Go to Trucks page → create a truck with scheduled departure time
4. Load the bag onto the truck
5. When truck departs → click "Mark Departed"
6. When truck arrives at next hub → click "Mark Arrived" and select the region
```

### At the Destination Hub

After a truck arrives, packages are detached from their bags and appear in the dashboard under "Arrived — Pending Bagging". The operator then:

```
Option A — Package has reached its final destination
  → Go to Packages page → click "Schedule Delivery"
  → Status becomes SCHEDULED_FOR_DELIVERY

Option B — Package needs to continue to another region
  → Create a new outgoing bag
  → Assign the package to the new bag
  → Load onto the next truck
```

---

## Package Statuses

| Status                   | Description                                    | Set By                   |
| ------------------------ | ---------------------------------------------- | ------------------------ |
| `TO_BE_PICKED_UP`        | Registered, awaiting collection                | Webhook from App 1       |
| `PICKED_UP`              | Collected from front office                    | Hub operator             |
| `ADDED_TO_BAG`           | Assigned to a sealed bag                       | Hub operator             |
| `EN_ROUTE`               | Loaded onto a truck                            | System (on bag load)     |
| `ARRIVED`                | Truck arrived at a regional hub                | System (on truck arrive) |
| `SCHEDULED_FOR_DELIVERY` | Reached destination, queued for local delivery | Hub operator             |
| `OUT_FOR_DELIVERY`       | Out for final delivery                         | Hub operator             |
| `DELAYED`                | Delayed with reason                            | Hub operator             |

## Bag Statuses

| Status       | Description                      |
| ------------ | -------------------------------- |
| `OPEN`       | Accepting packages               |
| `SEALED`     | No more packages                 |
| `LOADED`     | Assigned to a truck              |
| `IN_TRANSIT` | Truck has departed               |
| `ARRIVED`    | Truck has arrived at destination |
| `DELAYED`    | Bag delayed                      |

## Truck Statuses

| Status      | Description               |
| ----------- | ------------------------- |
| `SCHEDULED` | Created, not yet loading  |
| `LOADING`   | Bags being loaded         |
| `DEPARTED`  | Truck has left the hub    |
| `ARRIVED`   | Truck reached destination |
| `DELAYED`   | Truck delayed             |

---

## Background Jobs

### ETL Push Job

Runs every 1 minute in development (every 6 hours in production).

Finds all packages updated since the last successful run and pushes them in bulk to App 1's `/api/raw-updates` endpoint.

To switch to production schedule update `src/index.ts`:

```typescript
// Development — every minute
cron.schedule("* * * * *", () => runEtlPushJob());

// Production — every 6 hours
cron.schedule("0 */6 * * *", () => runEtlPushJob());
```

---

## Database Tables

| Table            | Description                                        |
| ---------------- | -------------------------------------------------- |
| `regions`        | Region codes and names — seeded on startup         |
| `packages`       | Package records with full status tracking          |
| `bags`           | Sealed bags grouping packages by direction         |
| `trucks`         | Trucks with scheduled and actual departure times   |
| `delays`         | Delay records linked to bags or trucks with reason |
| `status_updates` | Full audit log of every status change per package  |
| `last_sync`      | Tracks last successful ETL push job run time       |

---

## Docker Networking

This app shares a Docker bridge network called `logistics_network` with the Courier Collection Application. The network is created automatically if it doesn't exist — so this app can run standalone or alongside App 1 in either order.

| Container      | Hostname on network  | Port                              |
| -------------- | -------------------- | --------------------------------- |
| App 2 backend  | `logistics_backend`  | `3002`                            |
| App 2 postgres | `logistics_db`       | `5432` (internal) / `5433` (host) |
| App 1 backend  | `collection_backend` | `3001`                            |

---

## Project Structure

```
logistics-app/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── webhook.ts         Receives packages from App 1
│   │   │   ├── packages.ts        Package assignment and status updates
│   │   │   ├── bags.ts            Bag creation and delay management
│   │   │   ├── trucks.ts          Truck lifecycle management
│   │   │   ├── regions.ts         Region data
│   │   │   └── dashboard.ts       Dashboard data
│   │   ├── routes/
│   │   │   ├── webhook.ts
│   │   │   ├── packages.ts
│   │   │   ├── bags.ts
│   │   │   ├── trucks.ts
│   │   │   ├── regions.ts
│   │   │   └── dashboard.ts
│   │   ├── middleware/
│   │   │   └── errorHandler.ts    Central error handling
│   │   ├── constants/
│   │   │   └── packageStatus.ts   Status constants
│   │   ├── jobs/
│   │   │   └── etlPushJob.ts      ETL push job to App 1
│   │   ├── lib/
│   │   │   └── prisma.ts          Prisma client instance
│   │   └── index.ts               Express server + cron scheduler
│   ├── prisma/
│   │   ├── schema.prisma          Database schema
│   │   ├── seed.ts                Region seed data
│   │   └── migrations/            Migration history
│   ├── scripts/
│   │   └── start.sh               Docker startup script
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── StatusBadge.tsx    Reusable status badge
│   │   │   └── EmptyState.tsx     Empty state component
│   │   ├── lib/
│   │   │   └── api.ts             API helper functions + types
│   │   ├── packages/
│   │   │   └── page.tsx           Packages management page
│   │   ├── bags/
│   │   │   └── page.tsx           Bags management page
│   │   ├── trucks/
│   │   │   └── page.tsx           Trucks management page
│   │   ├── layout.tsx             Root layout with navbar
│   │   └── page.tsx               Hub dashboard
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
│
├── .devcontainer/
│   ├── devcontainer.json          VS Code dev container config
│   └── docker-compose.yml         Dev container services
│
└── docker-compose.yml
```

---

## Known Limitations

**Direction Validation**
Packages are not currently validated against the bag direction when being assigned. A package heading north could theoretically be assigned to a southbound bag. Direction validation is a planned improvement.

**Authentication**
The operator dashboard is currently unprotected. In production this would require staff authentication.

**Automatic Departure**
Trucks do not automatically depart when their scheduled time is reached. Hub operators manually mark trucks as departed. Automated departure via cron job is a planned improvement.

---

## Related Applications

- **Courier Collection Application** (`apps/collection-app`) — the front-office application customers interact with for package registration and tracking.
