# Logistics Operations Hub — Architecture

## Overview

The Logistics Operations Hub is made up of two independent applications that work together to manage a courier service end-to-end — from the moment a customer drops off a package at a front office, to the moment it is delivered at its destination.

The two applications are intentionally separated because they serve different audiences, have different access rules, and are operated by different teams.

---

## The Two Applications

### App 1 — Courier Collection Application

This is the **front-office application**. It is the customer-facing side of the system.

**Who uses it:**

- Front-office staff, to register new packages
- Customers, to track their packages via a public page

**What it does:**

- Allows staff to register a new package with sender details, receiver details, and weight
- Generates a unique tracking ID (UUID) for every package and prints it on the bill of sale
- Provides a public tracking page where anyone can enter a tracking ID and see the current status of their package
- Shows a dashboard to front-office staff with all packages grouped by their current state: pending pickup, actively moving, and delayed
- Fires a webhook to App 2 when a new package is created
- Receives bulk status updates from App 2 via an ETL push job every 6 hours
- Processes raw status updates asynchronously via a background job every 30 seconds

**What it does NOT do:**

- It does not handle any logistics operations (bagging, trucking, routing)
- It does not update package statuses directly — all status changes come from App 2 via the ETL pipeline

---

### App 2 — Courier Logistics Application

This is the **back-office application**. It is strictly internal and not accessible to the public or front-office staff.

**Who uses it:**

- Regional logistics hub operators

**What it does:**

- Receives new packages from App 1 via a webhook
- Allows operators to assign packages to sealed bags grouped by direction (NORTH, SOUTH, EAST, WEST)
- Tracks which bags are loaded onto which trucks
- Manages the full truck lifecycle — scheduled, loading, departed, arrived
- Supports multi-hop routing — packages are re-bagged at each regional hub until they reach their final destination
- Allows operators to mark packages for local delivery when they reach their destination region
- Records delays on bags and trucks, automatically marking all related packages as delayed
- Provides a dashboard for hub operators showing: unbagged arrivals, bagged packages, loaded trucks, and delayed packages
- Pushes status updates back to App 1 every 6 hours via an ETL job

**What it does NOT do:**

- It does not handle last-mile or local delivery (out of scope)
- It does not expose any public-facing pages

---

## How the Two Apps Talk to Each Other

There are two integration points between App 1 and App 2.

### Integration 1 — Webhook (App 1 → App 2)

When a new package is registered in App 1, App 1 immediately fires a webhook call to App 2.

App 2 receives this call and creates the package in its own system with an initial status of **"To be picked up"**.

The webhook call is non-blocking — if App 2 is unavailable, the package is still created in App 1 and the failure is logged. App 2 will receive the package on the next retry.

```
Customer drops package
        ↓
App 1: creates package, generates tracking ID
        ↓
App 1: fires POST webhook → App 2 (non-blocking)
        ↓
App 2: creates package in its system
       status: TO_BE_PICKED_UP
```

### Integration 2 — ETL Push Job (App 2 → App 1)

App 2 runs a scheduled job every 6 hours (reduced to 1 minute for local development and testing).

This job collects all packages with a status update since the last successful run and pushes them in bulk to App 1's raw updates API.

App 1 saves this raw data into a staging table. A separate background job in App 1 then processes this staging table every 30 seconds and updates the main packages table with the latest statuses.

This two-step design ensures that if the ETL job fails or sends bad data, it does not directly corrupt App 1's live data — the staging layer acts as a buffer.

```
App 2: gathers all updated packages since last run
        ↓
App 2: POST bulk payload → App 1 /api/raw-updates
        ↓
App 1: saves to raw_updates table (staging)
        ↓
App 1: background job runs every 30 seconds
        ↓
App 1: processes raw_updates → updates packages table
        ↓
Customer sees correct status on tracking page
```

---

## Full System Flow

```
[Customer] → drops package at front office
                    ↓
            [App 1] registers package
            generates tracking ID (UUID)
            prints bill of sale
                    ↓
            [App 1] fires webhook → [App 2]
                                        ↓
                                [App 2] creates package
                                status: TO_BE_PICKED_UP
                                        ↓
                                Hub operator assigns to bag
                                status: ADDED_TO_BAG
                                        ↓
                                Bag loaded onto truck
                                status: EN_ROUTE
                                        ↓
                                Operator marks truck departed
                                bags → IN_TRANSIT
                                        ↓
                                Operator marks truck arrived at hub
                                status: ARRIVED
                                bags opened, packages detached
                                        ↓
                                Two paths at each hub:
                                ├── Final destination reached
                                │   operator clicks Schedule Delivery
                                │   status: SCHEDULED_FOR_DELIVERY
                                │
                                └── More hops needed
                                    assign to new outgoing bag
                                    load onto next truck
                                    (repeats until final destination)
                                        ↓
                    [App 2 ETL job] pushes updates every 6hrs
                    ↓
            [App 1] receives raw updates
            background job processes every 30 seconds
            updates package status in DB
                    ↓
[Customer] → visits public tracking page
             enters tracking ID
             sees current status ✓
```

---

## Package Statuses

| Status                   | Set By                  | Description                                                    |
| ------------------------ | ----------------------- | -------------------------------------------------------------- |
| `TO_BE_PICKED_UP`        | App 2 (via webhook)     | Package registered, awaiting collection from front office      |
| `PICKED_UP`              | App 2 operator          | Package collected from front office                            |
| `ADDED_TO_BAG`           | App 2 operator          | Package assigned to a sealed bag at a regional hub             |
| `EN_ROUTE`               | App 2 (on bag load)     | Bag loaded onto a truck heading to next region                 |
| `ARRIVED`                | App 2 (on truck arrive) | Truck arrived at destination region, package detached from bag |
| `SCHEDULED_FOR_DELIVERY` | App 2 operator          | Package is in final region, queued for local delivery          |
| `OUT_FOR_DELIVERY`       | App 2 operator          | Package is on its way to the recipient                         |
| `DELAYED`                | App 2 operator          | Package delayed — reason attached                              |

---

## Tech Stack

| Concern              | Technology                                       | Reason                                                                                               |
| -------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Language             | TypeScript                                       | Type safety across frontend and backend, catches errors at compile time, familiar from React/Next.js |
| Backend (both apps)  | Node.js + Express                                | Most widely used Node framework, huge community, excellent for learning backend fundamentals         |
| Database (both apps) | PostgreSQL                                       | Relational data with strict integrity, excellent JSON support for raw updates staging                |
| ORM                  | Prisma 5                                         | Type-safe, auto-generated migrations, Prisma Client types pair perfectly with TypeScript             |
| Frontend (both apps) | Next.js 14 (App Router)                          | App Router with Server Components for fast data fetching, Tailwind for styling                       |
| Dev containers       | Docker + Docker Compose + VS Code Dev Containers | Each app has an isolated dev environment, zero manual setup for new developers                       |
| Background jobs      | node-cron                                        | Lightweight cron scheduler for ETL push job and raw update processor                                 |
| Cloud deployment     | Railway                                          | Managed Postgres + Node.js hosting, simple environment config                                        |

---

## Database Design

### App 1 — Courier Collection Application

| Table         | Description                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `packages`    | Core package records with tracking ID, addresses, weight, current status                                                   |
| `sales`       | Bill of sale details linked to each package                                                                                |
| `raw_updates` | Staging table for bulk status updates received from App 2. Uses PostgreSQL JSONB column to store unstructured bulk payload |

### App 2 — Courier Logistics Application

| Table            | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| `packages`       | Package records with full status tracking                     |
| `regions`        | Region codes and metadata — seeded on startup                 |
| `bags`           | Sealed bags that group packages heading in the same direction |
| `trucks`         | Truck records with scheduled and actual departure times       |
| `delays`         | Delay records linked to bags or trucks with reason            |
| `status_updates` | Full audit log of every status change per package             |
| `last_sync`      | Tracks the timestamp of the last successful ETL push job run  |

---

## Repository Structure

```
logistics-hub/
├── apps/
│   ├── collection-app/                   App 1
│   │   ├── .devcontainer/
│   │   │   ├── devcontainer.json         VS Code dev container config
│   │   │   └── docker-compose.yml        Dev container services
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   │   ├── controllers/
│   │   │   │   ├── routes/
│   │   │   │   ├── middleware/
│   │   │   │   ├── constants/
│   │   │   │   ├── jobs/                 Raw update processor
│   │   │   │   ├── lib/
│   │   │   │   └── index.ts
│   │   │   ├── prisma/
│   │   │   ├── scripts/
│   │   │   └── Dockerfile
│   │   ├── frontend/
│   │   │   ├── app/
│   │   │   │   ├── (staff)/              Route group for staff pages
│   │   │   │   ├── track/                Public tracking page
│   │   │   │   └── page.tsx              Home page
│   │   │   └── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── README.md
│   │
│   └── logistics-app/                    App 2
│       ├── .devcontainer/
│       │   ├── devcontainer.json
│       │   └── docker-compose.yml
│       ├── backend/
│       │   ├── src/
│       │   │   ├── controllers/
│       │   │   ├── routes/
│       │   │   ├── middleware/
│       │   │   ├── constants/
│       │   │   ├── jobs/                 ETL push job
│       │   │   ├── lib/
│       │   │   └── index.ts
│       │   ├── prisma/
│       │   ├── scripts/
│       │   └── Dockerfile
│       ├── frontend/
│       │   ├── app/
│       │   │   ├── packages/
│       │   │   ├── bags/
│       │   │   ├── trucks/
│       │   │   └── page.tsx              Hub dashboard
│       │   └── Dockerfile
│       ├── docker-compose.yml
│       └── README.md
│
├── docs/
│   └── architecture.md                   This file
├── README.md
└── .gitignore
```

---

## Running Locally

Each application is fully self-contained and can be run independently.

```bash
# App 1
cd apps/collection-app
docker compose up --build

# App 2
cd apps/logistics-app
docker compose up --build
```

Both apps can start in any order. The shared Docker network `logistics_network` is created automatically by whichever app starts first.

For Stage 3 integration testing, both apps must be running simultaneously.

---

## Docker Networking

Both applications share a Docker bridge network called `logistics_network`. This allows the two backend containers to communicate directly using container names as hostnames, without routing through the host machine.

This approach is required on Linux where `host.docker.internal` is not supported by default.

| Container      | Hostname             | Port                              |
| -------------- | -------------------- | --------------------------------- |
| App 1 backend  | `collection_backend` | `3001`                            |
| App 2 backend  | `logistics_backend`  | `3002`                            |
| App 1 postgres | `collection_db`      | `5432` (internal) / `5432` (host) |
| App 2 postgres | `logistics_db`       | `5432` (internal) / `5433` (host) |

Note: Both Postgres containers listen on internal port `5432`. They do not conflict because they have separate IPs on the Docker network. The host port for App 2's Postgres is mapped to `5433` to avoid conflicts when accessed from the host machine via Prisma Studio or Postman.

---

## Dev Containers

Both applications include a `.devcontainer/` folder for VS Code Dev Containers. This packages the entire development environment — Node.js, extensions, database — into a Docker container so any developer can clone and start coding immediately with zero manual setup.

Each developer gets their own isolated database. No shared state between developers.

**How to use:**

1. Install Docker and VS Code
2. Install the Dev Containers extension in VS Code
3. Open the app folder in VS Code
4. Click "Reopen in Container" when prompted
5. Run `npm install`, `npm run migrate`, `npm run dev` inside the container

---

## Ports Reference

| Service                 | Port |
| ----------------------- | ---- |
| App 1 Frontend          | 3000 |
| App 1 Backend           | 3001 |
| App 1 PostgreSQL (host) | 5432 |
| App 2 Backend           | 3002 |
| App 2 Frontend          | 3003 |
| App 2 PostgreSQL (host) | 5433 |

---

## Key Design Decisions

**Why two separate applications instead of one?**
The requirement explicitly states App 2 must not be accessible to the public or front-office staff. Keeping them as separate applications with separate databases enforces this boundary cleanly. They share no code and no database.

**Why a staging table for ETL updates instead of direct updates?**
Direct bulk updates from App 2 hitting App 1's main packages table is risky — bad data or a failed job midway could leave the table in an inconsistent state. The raw staging table acts as a buffer. The background processor handles transformation and validation before touching live data.

**Why a monorepo?**
Both apps are part of the same system, developed by the same team, and need to be tested together in Stage 3. A monorepo keeps documentation, environment setup, and integration testing in one place without coupling the applications themselves.

**Why Express and not Fastify?**
Fastify is technically superior in several ways (faster, built-in schema validation, better TypeScript support out of the box). However, Express was chosen here because it is the most widely documented Node.js framework with the largest community. For someone learning backend fundamentals for the first time, the abundance of learning resources, examples, and Stack Overflow answers outweighs Fastify's technical advantages. Express works perfectly well with TypeScript via `@types/express`. The core concepts transfer directly to Fastify or any other Node framework.

**Why PostgreSQL and not MongoDB?**
The data in this project is deeply relational — packages belong to bags, bags belong to trucks, trucks belong to regions, every status change is linked to a package. PostgreSQL's foreign key constraints enforce data integrity at the database level. MongoDB's flexibility is a feature when data shape is unpredictable — here the schema is well-defined from day one. The raw updates staging table in App 1 uses PostgreSQL's JSONB column type to handle the unstructured bulk payload, giving the best of both worlds.

**Why Prisma 5 and not Prisma 7?**
Prisma 7 changed how database configuration works, moving connection strings out of `schema.prisma` into a separate `prisma.config.ts` file. The majority of tutorials, Stack Overflow answers, and community documentation are written for Prisma 5. Prisma 5 was chosen to match available learning resources. Upgrading to Prisma 7 after the fundamentals are solid is straightforward.

**Why node-cron and not BullMQ?**
The ETL job runs every 6 hours and is a single-instance operation. node-cron is sufficient for this use case — zero extra infrastructure, simple setup, and teaches the concept of scheduled jobs. BullMQ would be the correct choice in production for retry logic, job persistence across restarts, and multi-instance coordination. node-cron is the right learning stepping stone before BullMQ.

---

## Known Limitations

**Authentication**
Neither application currently implements authentication. In production, App 1's staff pages would require JWT-based login and App 2's operator dashboard would require separate staff authentication.

**Captcha**
The public tracking page in App 1 does not implement captcha verification.

**Direction Validation**
When assigning a package to a bag in App 2, there is no validation that the package's destination matches the bag's direction. A package heading north could theoretically be assigned to a southbound bag.

**Raw Updates API Security**
The `/api/raw-updates` endpoint in App 1 is unprotected. In production this would require a shared secret or API key between the two applications.

**Automatic Truck Departure**
Trucks do not automatically depart when their scheduled time is reached. Hub operators manually mark trucks as departed. A cron job watching departure times is a planned improvement.
