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

**What it does NOT do:**

- It does not handle any logistics operations (bagging, trucking, routing)
- It does not talk directly to the logistics system in real time — it receives updates via a scheduled job

---

### App 2 — Courier Logistics Application

This is the **back-office application**. It is strictly internal and not accessible to the public or front-office staff.

**Who uses it:**

- Regional logistics hub operators

**What it does:**

- Receives new packages from App 1 via a webhook
- Allows operators to assign packages to sealed bags
- Tracks which bags are loaded onto which trucks
- Manages outgoing package routing across regions (North, South, East, West)
- Records delays at the truck or bag level, which automatically marks all related packages as delayed
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

```
Customer drops package
        ↓
App 1: creates package, generates tracking ID
        ↓
App 1: fires POST webhook → App 2
        ↓
App 2: creates package in its system
```

### Integration 2 — ETL Push Job (App 2 → App 1)

App 2 runs a scheduled job every 6 hours (reduced to 1 minute for local development and testing).

This job collects all packages with a status update since the last run and pushes them in bulk to App 1's raw updates API.

App 1 saves this raw data into a staging table. A separate background job in App 1 then processes this staging table and updates the main packages table with the latest statuses.

This design ensures that if the ETL job fails or sends bad data, it does not directly corrupt App 1's live data — the staging layer acts as a buffer.

```
App 2: gathers all updated packages
        ↓
App 2: POST bulk payload → App 1 /raw-updates
        ↓
App 1: saves to raw_updates table (staging)
        ↓
App 1: background job processes raw_updates
        ↓
App 1: updates packages table
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
                                status: "To be picked up"
                                        ↓
                                Hub operator assigns to bag
                                status: "Added to bag"
                                        ↓
                                Bag loaded onto truck
                                status: "En route to {region}"
                                        ↓
                                Truck arrives at next region
                                status: "Arrived at {region}"
                                        ↓
                                (repeats across regions)
                                        ↓
                                Final region reached
                                status: "Scheduled for delivery"
                                        ↓
                    [App 2 ETL job] pushes updates every 6hrs
                    ↓
            [App 1] receives raw updates
            background job processes them
            updates package status in DB
                    ↓
[Customer] → visits public tracking page
             enters tracking ID
             sees current status ✓
```

---

## Package Statuses

These are the valid statuses a package can move through, in order:

| Status                    | Set By              | Description                                               |
| ------------------------- | ------------------- | --------------------------------------------------------- |
| To be picked up           | App 2 (via webhook) | Package registered, awaiting collection from front office |
| Picked up                 | App 2               | Package collected from front office                       |
| Added to bag              | App 2               | Package assigned to a sealed bag at a regional hub        |
| En route to {region-code} | App 2               | Bag loaded onto a truck heading to next region            |
| Arrived at {region-code}  | App 2               | Truck arrived at destination region                       |
| Scheduled for delivery    | App 2               | Package is in final region, queued for local delivery     |
| Out for delivery          | App 2               | Package is on its way to the recipient                    |

A package can also be marked as **Delayed** at any point, with a reason attached.

---

## Tech Stack

| Concern               | Technology              | Reason                                                                                |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| Backend (both apps)   | Node.js + Fastify       | Familiar JS ecosystem, production-grade, fast                                         |
| Database (both apps)  | PostgreSQL              | Relational data with strict integrity, excellent JSON support for raw updates staging |
| ORM                   | Prisma                  | Type-safe, auto-generated migrations, great developer experience                      |
| Frontend (App 1 only) | Next.js (App Router)    | Handles both the staff dashboard and the public tracking page                         |
| Dev containers        | Docker + Docker Compose | Each app runs independently via `docker compose up`                                   |
| Background jobs       | node-cron               | Lightweight cron scheduler for ETL processing and push jobs                           |
| Cloud deployment      | Railway                 | Managed Postgres + Node.js hosting, simple environment config                         |

---

## Database Design Summary

### App 1 — Courier Collection Application

| Table         | Purpose                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `packages`    | Core package records with tracking ID, addresses, weight, current status |
| `sales`       | Bill of sale details linked to each package                              |
| `raw_updates` | Staging table for bulk status updates received from App 2                |

### App 2 — Courier Logistics Application

| Table            | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `packages`       | Package records with full status history                      |
| `regions`        | Region codes and metadata                                     |
| `bags`           | Sealed bags that group packages heading in the same direction |
| `trucks`         | Truck records with scheduled and actual departure times       |
| `truck_bags`     | Join table linking bags to trucks                             |
| `status_updates` | Full audit log of every status change per package             |
| `delays`         | Delay records linked to bags or trucks, with reason           |

---

## Repository Structure

```
logistics-hub/                          ← monorepo root
├── apps/
│   ├── collection-app/                 ← App 1
│   │   ├── frontend/                   ← Next.js (staff dashboard + public tracking)
│   │   ├── backend/                    ← Fastify API + Prisma
│   │   └── docker-compose.yml
│   │
│   └── logistics-app/                  ← App 2
│       ├── src/
│       │   ├── routes/
│       │   ├── jobs/                   ← ETL push job + background processors
│       │   └── index.ts
│       ├── prisma/
│       └── docker-compose.yml
│
├── docs/
│   └── architecture.md                 ← this file
├── .gitignore
└── README.md
```

---

## Running Locally

Each application is fully self-contained and can be run independently.

```bash
# Run App 1
cd apps/collection-app
docker compose up

# Run App 2
cd apps/logistics-app
docker compose up
```

For Stage 3 integration testing, both apps must be running simultaneously. The webhook URL and ETL target URL are configured via environment variables in each app's `.env` file.

---

## Key Design Decisions

**Why two separate applications instead of one?**
The requirement explicitly states App 2 must not be accessible to the public or front-office staff. Keeping them as separate applications with separate databases enforces this boundary cleanly. They share no code and no database.

**Why a staging table for ETL updates instead of direct updates?**
Direct bulk updates from App 2 hitting App 1's main packages table is risky — bad data or a failed job midway could leave the table in an inconsistent state. The raw staging table acts as a buffer. The background processor handles transformation and validation before touching live data.

**Why a monorepo?**
Both apps are part of the same system, developed by the same team, and need to be tested together in Stage 3. A monorepo keeps documentation, environment setup, and integration testing in one place without coupling the applications themselves.
