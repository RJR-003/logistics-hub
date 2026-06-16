import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../types/api";
import { ErrorCodes, ErrorCode } from "../constants/errorCodes";
import { ErrorMessages } from "../constants/errorMessages";

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;

  constructor(code: ErrorCode, statusCode: number) {
    super(ErrorMessages[code]);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json(errorResponse(err.code, ErrorMessages[err.code]));
    return;
  }

  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;

    if (prismaError.code === "P2002") {
      res
        .status(409)
        .json(
          errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            ErrorMessages[ErrorCodes.VALIDATION_ERROR],
            prismaError.message,
          ),
        );
      return;
    }

    if (prismaError.code === "P2025") {
      res
        .status(404)
        .json(
          errorResponse(
            ErrorCodes.DATABASE_ERROR,
            ErrorMessages[ErrorCodes.DATABASE_ERROR],
            prismaError.message,
          ),
        );
      return;
    }
  }

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
