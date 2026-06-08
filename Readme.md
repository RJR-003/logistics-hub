# Courier Collection Application

The front-office application of the Logistics Operations Hub. Used by front-office staff to register new packages and by customers to track their shipments.

---

## What This App Does

- Staff can register a new package and generate a tracking ID for the customer
- Staff can view a dashboard of all packages grouped by status
- Customers can track their package using the tracking ID on the public tracking page

---

## Tech Stack

| Layer            | Technology                             |
| ---------------- | -------------------------------------- |
| Frontend         | Next.js 14 (App Router) + Tailwind CSS |
| Backend          | Node.js + Express + TypeScript         |
| Database         | PostgreSQL 15                          |
| ORM              | Prisma 5                               |
| Containerization | Docker + Docker Compose                |

---

## Prerequisites

You only need two things installed on your machine:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

No Node.js, no PostgreSQL, no manual setup required.

---

## Running the App

### Full Docker Setup (Recommended)

Clone the repository and navigate to the app folder:

```bash
git clone https://github.com/yourname/logistics-hub.git
cd logistics-hub/apps/collection-app
```

Build and start all services:

```bash
docker compose up --build
```

This starts three services:

- **PostgreSQL** on port `5432`
- **Backend API** on port `3001`
- **Frontend** on port `3000`

Once all three are running, open your browser and go to:

```
http://localhost:3000
```

To stop the app:

```bash
docker compose down
```

To stop and delete the database volume (full reset):

```bash
docker compose down -v
```

---

### Development Mode (For Active Development)

If you are actively working on the code and want hot reload, run only the database in Docker and start the frontend and backend locally.

**Prerequisites for dev mode:**

- Node.js 20+
- npm

**Step 1 — Start the database:**

```bash
cd apps/collection-app
docker compose up postgres -d
```

**Step 2 — Start the backend:**

```bash
cd apps/collection-app/backend
npm install
npm run dev
```

Backend runs on `http://localhost:3001`.

**Step 3 — Start the frontend:**

```bash
cd apps/collection-app/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

---

## Environment Variables

### Backend (`apps/collection-app/backend/.env`)

```
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/collection_db
FRONTEND_URL=http://localhost:3000
```

> Note: When running via Docker Compose, environment variables are injected automatically. The `.env` file is only needed for development mode.

### Frontend (`apps/collection-app/frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Database Management

### Run Migrations

```bash
cd apps/collection-app/backend
npm run migrate
```

### Open Prisma Studio (Visual DB Browser)

```bash
cd apps/collection-app/backend
npm run studio
```

Opens at `http://localhost:5555`.

---

## API Endpoints

Base URL: `http://localhost:3001`

| Method | Endpoint                          | Description                 | Access |
| ------ | --------------------------------- | --------------------------- | ------ |
| GET    | `/health`                         | Health check                | Public |
| POST   | `/api/packages`                   | Create a new package        | Staff  |
| GET    | `/api/packages`                   | Get all packages            | Staff  |
| GET    | `/api/packages/dashboard`         | Dashboard grouped by status | Staff  |
| GET    | `/api/packages/track/:trackingId` | Track a package by ID       | Public |

### Create a Package — Example Request

```bash
curl -X POST http://localhost:3001/api/packages \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "12 Anna Salai, Chennai",
    "toAddress": "MG Road, Bangalore",
    "weight": 2.5,
    "amount": 250.00,
    "paymentMethod": "CASH"
  }'
```

### Track a Package — Example Request

```bash
curl http://localhost:3001/api/packages/track/your-tracking-id-here
```

---

## Pages

| URL             | Description                                  | Access |
| --------------- | -------------------------------------------- | ------ |
| `/`             | Home page                                    | Public |
| `/dashboard`    | Staff dashboard — packages grouped by status | Staff  |
| `/packages/new` | Create a new package                         | Staff  |
| `/track`        | Public package tracking page                 | Public |

---

## Package Statuses

| Status                   | Description                             |
| ------------------------ | --------------------------------------- |
| `TO_BE_PICKED_UP`        | Package registered, awaiting collection |
| `PICKED_UP`              | Package collected from front office     |
| `ADDED_TO_BAG`           | Package assigned to a sealed bag        |
| `EN_ROUTE`               | Package in transit to next region       |
| `ARRIVED`                | Package arrived at a regional hub       |
| `SCHEDULED_FOR_DELIVERY` | Package queued for local delivery       |
| `OUT_FOR_DELIVERY`       | Package out for final delivery          |
| `DELAYED`                | Package delayed — reason attached       |

---

## Project Structure

```
collection-app/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── packages.ts       API logic
│   │   ├── routes/
│   │   │   └── packages.ts       Route definitions
│   │   ├── middleware/
│   │   │   └── errorHandler.ts   Central error handling
│   │   ├── constants/
│   │   │   └── packageStatus.ts  Status constants
│   │   ├── lib/
│   │   │   └── prisma.ts         Prisma client instance
│   │   └── index.ts              Express server entry point
│   ├── prisma/
│   │   ├── schema.prisma         Database schema
│   │   └── migrations/           Migration history
│   ├── scripts/
│   │   └── start.sh              Docker startup script
│   ├── Dockerfile
│   └── .dockerignore
│
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   └── StatusBadge.tsx   Reusable status badge
│   │   ├── lib/
│   │   │   └── api.ts            API helper functions + types
│   │   ├── dashboard/
│   │   │   └── page.tsx          Staff dashboard
│   │   ├── packages/new/
│   │   │   └── page.tsx          New package form
│   │   ├── track/
│   │   │   └── page.tsx          Public tracking page
│   │   └── page.tsx              Home page
│   ├── Dockerfile
│   └── .dockerignore
│
└── docker-compose.yml
```

---

## Known Limitations

**Authentication**
The `/dashboard` and `/packages/new` routes are currently unprotected. In a production system these would require staff login via JWT-based authentication. The `/track` page is intentionally public and requires no login.

**Captcha**
The public tracking page does not currently implement captcha verification. This would be added before production deployment.

---

## Related Applications

This is Stage 1 of the Logistics Operations Hub. See also:

- **Courier Logistics Application** (`apps/logistics-app`) — the back-office application that handles regional hubs, bags, trucks, and routing.
