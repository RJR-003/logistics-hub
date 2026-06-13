import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export const receiveRawUpdates = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw new AppError("updates must be a non-empty array", 400);
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

    res.status(201).json({
      message: `Received ${updates.length} updates`,
      rawUpdateId: rawUpdate.id,
    });
  } catch (error) {
    next(error);
  }
};
