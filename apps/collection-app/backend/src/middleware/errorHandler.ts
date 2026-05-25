import { Request, Response, NextFunction } from "express";

// Custom error class so we can attach a status code to any error
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

// Central error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(`[Error] ${err.message}`);

  // If it's our custom AppError, use its status code
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Handle Prisma specific errors
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;

    // P2002 = unique constraint violation
    // e.g. trying to create a duplicate trackingId
    if (prismaError.code === "P2002") {
      res.status(409).json({
        error: "A record with this value already exists",
      });
      return;
    }

    // P2025 = record not found
    if (prismaError.code === "P2025") {
      res.status(404).json({
        error: "Record not found",
      });
      return;
    }
  }

  // Fallback for anything unexpected
  res.status(500).json({
    error: "Internal server error",
  });
};
