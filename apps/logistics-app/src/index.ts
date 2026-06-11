import express, { Application, Request, Response } from "express";
import cors from "cors";
import cron from "node-cron";
import prisma from "./lib/prisma";
import { errorHandler } from "./middleware/errorHandler";
import webhookRoutes from "./routes/webhook";
import packageRoutes from "./routes/packages";
import bagRoutes from "./routes/bags";
import dashboardRoutes from "./routes/dashboard";
import { runEtlPushJob } from "./jobs/etlPushJob";

const app: Application = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use("/webhook", webhookRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/bags", bagRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/health", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      app: "Courier Logistics API",
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.use(errorHandler);

// Schedule ETL job — every 1 minute for testing
// Change to '0 */6 * * *' for production (every 6 hours)
cron.schedule("* * * * *", () => {
  runEtlPushJob();
});

console.log("[ETL] Push job scheduled — runs every minute");

app.listen(PORT, () => {
  console.log(`Logistics app running on http://localhost:${PORT}`);
});

export default app;
