import express, { Application, Request, Response } from "express";
import prisma from "./lib/prisma";
import packageRoutes from "./routes/packages";
import { errorHandler } from "./middleware/errorHandler";

const app: Application = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use("/api/packages", packageRoutes);

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
