import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { BagStatus, PackageStatus } from "../constants/packageStatus";
import { ErrorCodes } from "../constants/errorCodes";
import { successResponse } from "../types/api";
import { BagResponse } from "../types/logistics";

function toBagResponse(bag: any): BagResponse {
  return {
    id: bag.id,
    code: bag.code,
    direction: bag.direction,
    status: bag.status,
    truckId: bag.truckId,
    createdAt: bag.createdAt.toISOString(),
    updatedAt: bag.updatedAt.toISOString(),
    packages: bag.packages?.map((pkg: any) => ({
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
    })),
    truck: bag.truck
      ? {
          id: bag.truck.id,
          code: bag.truck.code,
          regionId: bag.truck.regionId,
          scheduledDeparture: bag.truck.scheduledDeparture.toISOString(),
          actualDeparture: bag.truck.actualDeparture?.toISOString() || null,
          status: bag.truck.status,
          createdAt: bag.truck.createdAt.toISOString(),
          updatedAt: bag.truck.updatedAt.toISOString(),
        }
      : null,
    delay: bag.delay
      ? {
          id: bag.delay.id,
          reason: bag.delay.reason,
          createdAt: bag.delay.createdAt.toISOString(),
        }
      : null,
  };
}

export const createBag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code, direction } = req.body;

    if (!code || !direction) {
      throw new AppError(ErrorCodes.INVALID_BAG_DATA, 400);
    }

    const bag = await prisma.bag.create({
      data: { code, direction },
    });

    res
      .status(201)
      .json(
        successResponse(
          { bag: toBagResponse(bag) },
          `Bag ${code} created successfully.`,
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const delayBag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { bagId, reason } = req.body;

    if (!bagId || !reason) {
      throw new AppError(ErrorCodes.INVALID_BAG_DATA, 400);
    }

    const bag = await prisma.bag.findUnique({
      where: { id: bagId },
      include: { packages: true, delay: true },
    });

    if (!bag) throw new AppError(ErrorCodes.BAG_NOT_FOUND, 404);
    if (bag.delay) throw new AppError(ErrorCodes.BAG_ALREADY_DELAYED, 400);

    await prisma.$transaction(async (tx) => {
      await tx.delay.create({ data: { bagId, reason } });

      await tx.bag.update({
        where: { id: bagId },
        data: { status: BagStatus.DELAYED },
      });

      for (const pkg of bag.packages) {
        await tx.package.update({
          where: { id: pkg.id },
          data: { status: PackageStatus.DELAYED },
        });

        await tx.statusUpdate.create({
          data: {
            packageId: pkg.id,
            status: PackageStatus.DELAYED,
            note: `Bag delayed: ${reason}`,
          },
        });
      }
    });

    res.json(
      successResponse(
        { affectedPackages: bag.packages.length },
        `Bag marked as delayed. ${bag.packages.length} package${bag.packages.length === 1 ? "" : "s"} updated.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getAllBags = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bags = await prisma.bag.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        packages: true,
        truck: true,
        delay: true,
      },
    });

    res.json(
      successResponse(
        { bags: bags.map(toBagResponse) },
        `${bags.length} bag${bags.length === 1 ? "" : "s"} found.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};
