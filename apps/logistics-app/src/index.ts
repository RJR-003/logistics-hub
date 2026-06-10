import express, { Application, Request, Response } from "express";
import cors from "cors";

const app: Application = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", app: "Courier Logistics API" });
});

app.listen(PORT, () => {
  console.log(`Logistics app running on http://localhost:${PORT}`);
});

export default app;
