import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { PackageStatus } from "../constants/packageStatus";
import { ErrorCodes } from "../constants/errorCodes";
import { successResponse } from "../types/api";
import { PackageResponse } from "../types/logistics";

function toPackageResponse(pkg: any): PackageResponse {
  return {
    id: pkg.id,
    trackingId: pkg.trackingId,
    fromAddress: pkg.fromAddress,
    toAddress: pkg.toAddress,
    weight: pkg.weight,
    status: pkg.status,
    currentLocation: pkg.currentLocation,
    bagId: pkg.bagId,
    regionId: pkg.regionId,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}

export const receivePackage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { trackingId, fromAddress, toAddress, weight } = req.body;

    if (!trackingId || !fromAddress || !toAddress || !weight) {
      throw new AppError(ErrorCodes.INVALID_PACKAGE_DATA, 400);
    }

    const existing = await prisma.package.findUnique({
      where: { trackingId },
    });

    if (existing) {
      res
        .status(200)
        .json(
          successResponse(
            { package: toPackageResponse(existing) },
            "Package already exists in the system.",
          ),
        );
      return;
    }

    const newPackage = await prisma.package.create({
      data: {
        trackingId,
        fromAddress,
        toAddress,
        weight,
        status: PackageStatus.TO_BE_PICKED_UP,
      },
    });

    await prisma.statusUpdate.create({
      data: {
        packageId: newPackage.id,
        status: PackageStatus.TO_BE_PICKED_UP,
        note: "Package received from collection office",
      },
    });

    res
      .status(201)
      .json(
        successResponse(
          { package: toPackageResponse(newPackage) },
          "Package received and registered successfully.",
        ),
      );
  } catch (error) {
    next(error);
  }
};
