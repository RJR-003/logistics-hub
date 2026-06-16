import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  TruckStatus,
  BagStatus,
  PackageStatus,
} from "../constants/packageStatus";
import { ErrorCodes } from "../constants/errorCodes";
import { successResponse } from "../types/api";
import { TruckResponse } from "../types/logistics";

function toTruckResponse(truck: any): TruckResponse {
  return {
    id: truck.id,
    code: truck.code,
    regionId: truck.regionId,
    scheduledDeparture: truck.scheduledDeparture.toISOString(),
    actualDeparture: truck.actualDeparture?.toISOString() || null,
    status: truck.status,
    createdAt: truck.createdAt.toISOString(),
    updatedAt: truck.updatedAt.toISOString(),
    region: truck.region
      ? {
          id: truck.region.id,
          code: truck.region.code,
          name: truck.region.name,
          createdAt: truck.region.createdAt.toISOString(),
        }
      : null,
    bags: truck.bags?.map((bag: any) => ({
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
    })),
    delay: truck.delay
      ? {
          id: truck.delay.id,
          reason: truck.delay.reason,
          createdAt: truck.delay.createdAt.toISOString(),
        }
      : null,
  };
}

export const createTruck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code, regionId, scheduledDeparture } = req.body;

    if (!code || !regionId || !scheduledDeparture) {
      throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);
    }

    const truck = await prisma.truck.create({
      data: {
        code,
        regionId,
        scheduledDeparture: new Date(scheduledDeparture),
        status: TruckStatus.SCHEDULED,
      },
      include: { region: true },
    });

    res
      .status(201)
      .json(
        successResponse(
          { truck: toTruckResponse(truck) },
          `Truck ${code} created and scheduled successfully.`,
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const getAllTrucks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const trucks = await prisma.truck.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        region: true,
        bags: { include: { packages: true } },
        delay: true,
      },
    });

    res.json(
      successResponse(
        { trucks: trucks.map(toTruckResponse) },
        `${trucks.length} truck${trucks.length === 1 ? "" : "s"} found.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const loadBagOntoTruck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { bagId, truckId } = req.body;

    if (!bagId || !truckId) {
      throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);
    }

    const bag = await prisma.bag.findUnique({
      where: { id: bagId },
      include: { packages: true },
    });

    if (!bag) throw new AppError(ErrorCodes.BAG_NOT_FOUND, 404);

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
    });

    if (!truck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);

    if (truck.status === TruckStatus.DEPARTED) {
      throw new AppError(ErrorCodes.TRUCK_ALREADY_DEPARTED, 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.bag.update({
        where: { id: bagId },
        data: { truckId, status: BagStatus.LOADED },
      });

      await tx.truck.update({
        where: { id: truckId },
        data: { status: TruckStatus.LOADING },
      });

      for (const pkg of bag.packages) {
        await tx.package.update({
          where: { id: pkg.id },
          data: { status: PackageStatus.EN_ROUTE },
        });

        await tx.statusUpdate.create({
          data: {
            packageId: pkg.id,
            status: PackageStatus.EN_ROUTE,
            note: `Loaded onto truck ${truck.code}`,
          },
        });
      }
    });

    res.json(
      successResponse(
        { bagCode: bag.code, truckCode: truck.code },
        `Bag ${bag.code} loaded onto truck ${truck.code} successfully.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const departTruck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { truckId } = req.body;

    if (!truckId) throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: { bags: { include: { packages: true } } },
    });

    if (!truck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);

    if (truck.status === TruckStatus.DEPARTED) {
      throw new AppError(ErrorCodes.TRUCK_ALREADY_DEPARTED, 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.truck.update({
        where: { id: truckId },
        data: {
          status: TruckStatus.DEPARTED,
          actualDeparture: new Date(),
        },
      });

      for (const bag of truck.bags) {
        await tx.bag.update({
          where: { id: bag.id },
          data: { status: BagStatus.IN_TRANSIT },
        });

        for (const pkg of bag.packages) {
          await tx.statusUpdate.create({
            data: {
              packageId: pkg.id,
              status: PackageStatus.EN_ROUTE,
              note: `Truck ${truck.code} departed`,
            },
          });
        }
      }
    });

    const totalPackages = truck.bags.reduce(
      (sum, bag) => sum + bag.packages.length,
      0,
    );

    res.json(
      successResponse(
        { truckCode: truck.code, totalPackages },
        `Truck ${truck.code} has departed with ${totalPackages} package${totalPackages === 1 ? "" : "s"}.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const arriveTruck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { truckId, regionCode } = req.body;

    if (!truckId || !regionCode) {
      throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);
    }

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: { bags: { include: { packages: true } } },
    });

    if (!truck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);

    if (truck.status !== TruckStatus.DEPARTED) {
      throw new AppError(ErrorCodes.TRUCK_NOT_DEPARTED, 400);
    }

    let totalPackages = 0;

    await prisma.$transaction(async (tx) => {
      await tx.truck.update({
        where: { id: truckId },
        data: { status: TruckStatus.ARRIVED },
      });

      for (const bag of truck.bags) {
        await tx.bag.update({
          where: { id: bag.id },
          data: { status: BagStatus.ARRIVED },
        });

        for (const pkg of bag.packages) {
          await tx.package.update({
            where: { id: pkg.id },
            data: {
              status: PackageStatus.ARRIVED,
              currentLocation: regionCode,
              bagId: null,
            },
          });

          await tx.statusUpdate.create({
            data: {
              packageId: pkg.id,
              status: PackageStatus.ARRIVED,
              location: regionCode,
              note: `Arrived at ${regionCode} hub`,
            },
          });

          totalPackages++;
        }
      }
    });

    res.json(
      successResponse(
        { truckCode: truck.code, regionCode, totalPackages },
        `Truck ${truck.code} arrived at ${regionCode}. ${totalPackages} package${totalPackages === 1 ? "" : "s"} ready for processing.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const delayTruck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { truckId, reason } = req.body;

    if (!truckId || !reason) {
      throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);
    }

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: {
        bags: { include: { packages: true } },
        delay: true,
      },
    });

    if (!truck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);
    if (truck.delay) throw new AppError(ErrorCodes.TRUCK_ALREADY_DELAYED, 400);

    let totalPackages = 0;

    await prisma.$transaction(async (tx) => {
      await tx.delay.create({ data: { truckId, reason } });

      await tx.truck.update({
        where: { id: truckId },
        data: { status: TruckStatus.DELAYED },
      });

      for (const bag of truck.bags) {
        await tx.bag.update({
          where: { id: bag.id },
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
              note: `Truck delayed: ${reason}`,
            },
          });

          totalPackages++;
        }
      }
    });

    res.json(
      successResponse(
        { truckCode: truck.code, totalPackages },
        `Truck ${truck.code} marked as delayed. ${totalPackages} package${totalPackages === 1 ? "" : "s"} updated.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};
