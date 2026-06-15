import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { ErrorCodes } from "../constants/errorCodes";
import { successResponse } from "../types/api";

export const receiveRawUpdates = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 400);
    }

    // Save the entire payload as one raw update record
    // Don't process it here — just store it safely
    const rawUpdate = await prisma.rawUpdate.create({
      data: {
        payload: updates,
      },
    });

    console.log(
      `[RawUpdates] Received ${updates.length} updates, saved as ${rawUpdate.id}`,
    );

    res
      .status(201)
      .json(
        successResponse(
          { rawUpdateId: rawUpdate.id, count: updates.length },
          `${updates.length} status update${updates.length === 1 ? "" : "s"} received and queued for processing.`,
        ),
      );
  } catch (error) {
    next(error);
  }
};
