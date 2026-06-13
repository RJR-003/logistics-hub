# Courier Logistics Application

The back-office application of the Logistics Operations Hub. Used by regional hub operators to manage packages, bags, trucks, and status updates.

This application is not accessible to the public or front-office staff.

---

## Tech Stack

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| Backend          | Node.js + Express + TypeScript |
| Database         | PostgreSQL 15                  |
| ORM              | Prisma 5                       |
| Job Scheduler    | node-cron                      |
| Containerization | Docker + Docker Compose        |

---

## Prerequisites

- Docker
- Docker Compose

---

## Running the App

```bash
cd apps/logistics-app
docker compose up --build
```

API available at `http://localhost:3002`.

To stop:

```bash
docker compose down
```

Full reset including database:

```bash
docker compose down -v
```

---

## Development Mode

```bash
# Start database
docker compose up postgres -d

# Start server
npm install
npm run dev
```

---

## Environment Variables

```
PORT=3002
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/logistics_db
APP1_URL=http://localhost:3001
```

### Environment Variables

| Variable       | Dev Mode                              | Docker Mode                          |
| -------------- | ------------------------------------- | ------------------------------------ |
| `PORT`         | `3002`                                | `3002`                               |
| `DATABASE_URL` | `postgresql://...@localhost:5433/...` | `postgresql://...@postgres:5432/...` |
| `APP1_URL`     | `http://localhost:3001`               | `http://collection_backend:3001`     |

---

## Docker Networking

This app joins the `logistics_network` Docker network created by the
Courier Collection Application. The Collection Application must be
running before starting this app.

```bash
# Always start App 1 first
cd apps/collection-app && docker compose up --build

# Then start App 2
cd apps/logistics-app && docker compose up --build
```

---

## API Endpoints

| Method | URL                        | Description                      |
| ------ | -------------------------- | -------------------------------- |
| GET    | `/health`                  | Health check                     |
| POST   | `/webhook/package`         | Receive new package from App 1   |
| GET    | `/api/packages`            | Get all packages                 |
| POST   | `/api/packages/assign-bag` | Assign package to a bag          |
| PUT    | `/api/packages/status`     | Update package status            |
| GET    | `/api/bags`                | Get all bags                     |
| POST   | `/api/bags`                | Create a new bag                 |
| POST   | `/api/bags/delay`          | Mark bag and packages as delayed |
| GET    | `/api/dashboard`           | Operator dashboard               |

---

## ETL Push Job

Runs every 1 minute in development (every 6 hours in production).

Finds all packages updated since last run and pushes status updates to App 1's raw updates API.

To switch to production schedule, update `src/index.ts`:

```typescript
// Development
cron.schedule("* * * * *", () => runEtlPushJob());

// Production
cron.schedule("0 */6 * * *", () => runEtlPushJob());
```

---

## Package Statuses

| Status                   | Description                     |
| ------------------------ | ------------------------------- |
| `TO_BE_PICKED_UP`        | Registered, awaiting collection |
| `PICKED_UP`              | Collected from front office     |
| `ADDED_TO_BAG`           | Assigned to a sealed bag        |
| `EN_ROUTE`               | In transit to next region       |
| `ARRIVED`                | Arrived at regional hub         |
| `SCHEDULED_FOR_DELIVERY` | Queued for local delivery       |
| `OUT_FOR_DELIVERY`       | Out for final delivery          |
| `DELAYED`                | Delayed with reason             |

---

## Related Applications

- **Courier Collection Application** (`apps/collection-app`) — the front-office application customers interact with.
