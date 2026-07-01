import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { ErrorCodes } from "../constants/errorCodes";
import { successResponse } from "../types/api";

export const confirmEtlBatch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { batchId, confirmations } = req.body;

    // confirmations: [{ trackingId, status }]
    if (
      !batchId ||
      !Array.isArray(confirmations) ||
      confirmations.length === 0
    ) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 400);
    }

    let confirmedCount = 0;

    for (const confirmation of confirmations) {
      const { trackingId, status } = confirmation;
      if (!trackingId || !status) continue;

      await prisma.package.updateMany({
        where: { trackingId },
        data: {
          lastSyncedStatus: status,
          lastSyncedAt: new Date(),
        },
      });

      confirmedCount++;
    }

    console.log(
      `[ETL Confirm] Batch ${batchId} — ${confirmedCount} packages marked as synced`,
    );

    res.json(
      successResponse(
        { batchId, confirmedCount },
        `${confirmedCount} package update${confirmedCount === 1 ? "" : "s"} confirmed as synced.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};
