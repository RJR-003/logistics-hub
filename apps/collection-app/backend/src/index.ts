import express, { Application, Request, Response } from "express";
import cors from "cors";
import cron from "node-cron";
import prisma from "./lib/prisma";
import packageRoutes from "./routes/packages";
import { errorHandler } from "./middleware/errorHandler";
import rawUpdateRoutes from "./routes/rawUpdates";
import { runRawUpdateProcessor } from "./jobs/rawUpdateProcessor";

const app: Application = express();
const PORT = process.env.PORT || 3001;

// CORS — must be before all routes
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use("/api/packages", packageRoutes);
app.use("/api/raw-updates", rawUpdateRoutes);

app.get("/health", async (req: Request, res: Response) => {
  try {
    // This runs a real query against Postgres
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

//error handling
app.use(errorHandler);

// Process raw updates every 30 seconds
cron.schedule("*/30 * * * * *", () => {
  runRawUpdateProcessor();
});

console.log(
  "[Processor] Raw update processor scheduled — runs every 30 seconds",
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
