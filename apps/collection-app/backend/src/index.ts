import express, { Application, Request, Response } from "express";

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json()); // lets Express read JSON request bodies

// Health check route — useful to confirm the server is running
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Collection app backend is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
