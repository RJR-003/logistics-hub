import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../types/api";
import { ErrorCodes } from "../constants/errorCodes";
import { ErrorMessages } from "../constants/errorMessages";

export const serviceAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.INTER_SERVICE_API_KEY;

  if (!expectedKey) {
    console.error("[ServiceAuth] INTER_SERVICE_API_KEY is not set");
    res
      .status(500)
      .json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          ErrorMessages[ErrorCodes.INTERNAL_ERROR],
        ),
      );
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.warn(
      `[ServiceAuth] Rejected request from ${req.ip} — invalid or missing API key`,
    );
    res
      .status(401)
      .json(
        errorResponse(
          ErrorCodes.UNAUTHORIZED,
          ErrorMessages[ErrorCodes.UNAUTHORIZED],
        ),
      );
    return;
  }

  next();
};
