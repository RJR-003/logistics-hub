import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../types/api";
import { ErrorCodes, ErrorCode } from "../constants/errorCodes";
import { ErrorMessages } from "../constants/errorMessages";

// Custom error class so we can attach a status code to any error
export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;

  constructor(code: ErrorCode, statusCode: number, details?: string) {
    super(ErrorMessages[code]);
    this.statusCode = statusCode;
    this.code = code;
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
  // Log the actual error for debugging — never shown to user
  console.error(`[Error] ${err.message}`, err.stack);

  // If it's our custom AppError, use its status code
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json(errorResponse(err.code, ErrorMessages[err.code]));
    return;
  }

  // Handle Prisma specific errors
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;

    // P2002 = unique constraint violation
    // e.g. trying to create a duplicate trackingId
    if (prismaError.code === "P2002") {
      res
        .status(409)
        .json(
          errorResponse(
            ErrorCodes.PACKAGE_ALREADY_EXISTS,
            ErrorMessages[ErrorCodes.PACKAGE_ALREADY_EXISTS],
            prismaError.message,
          ),
        );
      return;
    }

    // P2025 = record not found
    if (prismaError.code === "P2025") {
      res
        .status(404)
        .json(
          errorResponse(
            ErrorCodes.PACKAGE_NOT_FOUND,
            ErrorMessages[ErrorCodes.PACKAGE_NOT_FOUND],
            prismaError.message,
          ),
        );
      return;
    }

    res
      .status(500)
      .json(
        errorResponse(
          ErrorCodes.DATABASE_ERROR,
          ErrorMessages[ErrorCodes.DATABASE_ERROR],
          prismaError.message,
        ),
      );
    return;
  }

  // Fallback for anything unexpected
  res
    .status(500)
    .json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        ErrorMessages[ErrorCodes.INTERNAL_ERROR],
        err.message,
      ),
    );
};
