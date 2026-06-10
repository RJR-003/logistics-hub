import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(`[Error] ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;
    if (prismaError.code === "P2002") {
      res
        .status(409)
        .json({ error: "A record with this value already exists" });
      return;
    }
    if (prismaError.code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
  }

  res.status(500).json({ error: "Internal server error" });
};
