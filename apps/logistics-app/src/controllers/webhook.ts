import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { PackageStatus } from "../constants/packageStatus";

export const receivePackage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { trackingId, fromAddress, toAddress, weight } = req.body;

    if (!trackingId || !fromAddress || !toAddress || !weight) {
      throw new AppError(
        "trackingId, fromAddress, toAddress and weight are required",
        400,
      );
    }

    // Check if package already exists — webhook may fire twice
    const existing = await prisma.package.findUnique({
      where: { trackingId },
    });

    if (existing) {
      res.status(200).json({
        message: "Package already exists",
        package: existing,
      });
      return;
    }

    // Create package with initial status
    const newPackage = await prisma.package.create({
      data: {
        trackingId,
        fromAddress,
        toAddress,
        weight,
        status: PackageStatus.TO_BE_PICKED_UP,
      },
    });

    // Create first status update in audit log
    await prisma.statusUpdate.create({
      data: {
        packageId: newPackage.id,
        status: PackageStatus.TO_BE_PICKED_UP,
        note: "Package received from collection office",
      },
    });

    res.status(201).json({
      message: "Package received successfully",
      package: newPackage,
    });
  } catch (error) {
    next(error);
  }
};
