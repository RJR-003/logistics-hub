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
import { parsePagination } from "../lib/pagination";

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
    const { take, skip } = parsePagination(req);
    const [trucks, total] = await Promise.all([
      prisma.truck.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          region: true,
          bags: { include: { packages: true } },
          delay: true,
        },
      }),
      prisma.truck.count(),
    ]);

    res.json(
      successResponse(
        {
          items: trucks.map(toTruckResponse),
          pagination: { limit: take, offset: skip, total },
        },
        `${trucks.length} of ${total} truck${total === 1 ? "" : "s"} shown.`,
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
      include: {
        bags: {
          include: {
            packages: {
              include: {
                destinationRegion: true,
              },
            },
          },
        },
      },
    });

    if (!truck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);

    if (truck.status !== TruckStatus.DEPARTED) {
      throw new AppError(ErrorCodes.TRUCK_NOT_DEPARTED, 400);
    }

    let totalPackages = 0;
    let finalDestinationCount = 0;
    let enRouteCount = 0;

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
          const isFinalDestination = pkg.destinationRegion?.code === regionCode;

          const newStatus = isFinalDestination
            ? PackageStatus.SCHEDULED_FOR_DELIVERY
            : PackageStatus.EN_ROUTE;

          await tx.package.update({
            where: { id: pkg.id },
            data: {
              status: newStatus,
              currentLocation: regionCode,
              bagId: null,
            },
          });

          await tx.statusUpdate.create({
            data: {
              packageId: pkg.id,
              status: newStatus,
              location: regionCode,
              note: isFinalDestination
                ? `Arrived at final destination ${regionCode} — scheduled for local delivery`
                : `Arrived at ${regionCode} hub — in transit to final destination`,
            },
          });

          totalPackages++;
          if (isFinalDestination) finalDestinationCount++;
          else enRouteCount++;
        }
      }
    });

    res.json(
      successResponse(
        {
          truckCode: truck.code,
          regionCode,
          totalPackages,
          finalDestinationCount,
          enRouteCount,
        },
        `Truck ${truck.code} arrived at ${regionCode}. ${finalDestinationCount} package${finalDestinationCount === 1 ? "" : "s"} reached final destination. ${enRouteCount} package${enRouteCount === 1 ? "" : "s"} continuing to next hub.`,
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

export const recoverTruck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { truckId } = req.body;

    if (!truckId) throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: {
        bags: { include: { packages: true } },
        delay: true,
      },
    });

    if (!truck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);

    if (truck.status !== TruckStatus.DELAYED) {
      throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);
    }

    await prisma.$transaction(async (tx) => {
      // Remove the delay record
      if (truck.delay) {
        await tx.delay.delete({
          where: { id: truck.delay.id },
        });
      }

      // Restore truck to LOADING status
      await tx.truck.update({
        where: { id: truckId },
        data: { status: TruckStatus.LOADING },
      });

      // Restore all bags and packages
      for (const bag of truck.bags) {
        await tx.bag.update({
          where: { id: bag.id },
          data: { status: BagStatus.LOADED },
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
              note: `Truck ${truck.code} delay resolved — back on schedule`,
            },
          });
        }
      }
    });

    res.json(
      successResponse(
        { truckCode: truck.code },
        `Truck ${truck.code} delay resolved. It is now ready to depart.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const transferBags = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fromTruckId, toTruckId } = req.body;

    if (!fromTruckId || !toTruckId) {
      throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);
    }

    const fromTruck = await prisma.truck.findUnique({
      where: { id: fromTruckId },
      include: {
        bags: { include: { packages: true } },
      },
    });

    if (!fromTruck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);

    const toTruck = await prisma.truck.findUnique({
      where: { id: toTruckId },
    });

    if (!toTruck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);

    if (toTruck.status === TruckStatus.DEPARTED) {
      throw new AppError(ErrorCodes.TRUCK_ALREADY_DEPARTED, 400);
    }

    let totalBags = 0;
    let totalPackages = 0;

    await prisma.$transaction(async (tx) => {
      for (const bag of fromTruck.bags) {
        // Move bag to new truck
        await tx.bag.update({
          where: { id: bag.id },
          data: {
            truckId: toTruckId,
            status: BagStatus.LOADED,
          },
        });

        for (const pkg of bag.packages) {
          await tx.statusUpdate.create({
            data: {
              packageId: pkg.id,
              status: PackageStatus.EN_ROUTE,
              note: `Transferred from delayed truck ${fromTruck.code} to truck ${toTruck.code}`,
            },
          });
          totalPackages++;
        }

        totalBags++;
      }

      // Update new truck to LOADING
      await tx.truck.update({
        where: { id: toTruckId },
        data: { status: TruckStatus.LOADING },
      });
    });

    res.json(
      successResponse(
        {
          fromTruck: fromTruck.code,
          toTruck: toTruck.code,
          totalBags,
          totalPackages,
        },
        `${totalBags} bag${totalBags === 1 ? "" : "s"} and ${totalPackages} package${totalPackages === 1 ? "" : "s"} transferred to truck ${toTruck.code}.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const resetTruck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { truckId, scheduledDeparture } = req.body;

    if (!truckId) throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: { bags: true },
    });

    if (!truck) throw new AppError(ErrorCodes.TRUCK_NOT_FOUND, 404);

    if (truck.status !== TruckStatus.ARRIVED) {
      throw new AppError(ErrorCodes.INVALID_TRUCK_DATA, 400);
    }

    await prisma.$transaction(async (tx) => {
      // Detach all bags from this truck
      await tx.bag.updateMany({
        where: { truckId },
        data: {
          truckId: null,
          status: BagStatus.ARRIVED,
        },
      });

      // Reset the truck
      await tx.truck.update({
        where: { id: truckId },
        data: {
          status: TruckStatus.SCHEDULED,
          actualDeparture: null,
          scheduledDeparture: scheduledDeparture
            ? new Date(scheduledDeparture)
            : truck.scheduledDeparture, // keep old if not provided,
        },
      });
    });

    res.json(
      successResponse(
        { truckCode: truck.code },
        `Truck ${truck.code} has been reset and is ready for a new journey.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};
