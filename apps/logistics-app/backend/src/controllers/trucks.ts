import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  TruckStatus,
  BagStatus,
  PackageStatus,
} from "../constants/packageStatus";

export const createTruck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code, regionId, scheduledDeparture } = req.body;

    if (!code || !regionId || !scheduledDeparture) {
      throw new AppError(
        "code, regionId and scheduledDeparture are required",
        400,
      );
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

    res.status(201).json({ message: "Truck created", truck });
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
        bags: {
          include: { packages: true },
        },
        delay: true,
      },
    });
    res.json({ trucks });
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
      throw new AppError("bagId and truckId are required", 400);
    }

    const bag = await prisma.bag.findUnique({
      where: { id: bagId },
      include: { packages: true },
    });

    if (!bag) throw new AppError("Bag not found", 404);

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
    });

    if (!truck) throw new AppError("Truck not found", 404);

    // Use transaction — update bag, all its packages, and truck status together
    await prisma.$transaction(async (tx) => {
      // Assign bag to truck
      await tx.bag.update({
        where: { id: bagId },
        data: {
          truckId,
          status: BagStatus.LOADED,
        },
      });

      // Update truck status to loading
      await tx.truck.update({
        where: { id: truckId },
        data: { status: TruckStatus.LOADING },
      });

      // Update all packages in the bag
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

    const updatedBag = await prisma.bag.findUnique({
      where: { id: bagId },
      include: { packages: true, truck: true },
    });

    res.json({ message: "Bag loaded onto truck", bag: updatedBag });
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
      throw new AppError("truckId and reason are required", 400);
    }

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: {
        bags: {
          include: { packages: true },
        },
      },
    });

    if (!truck) throw new AppError("Truck not found", 404);

    await prisma.$transaction(async (tx) => {
      // Create delay record
      await tx.delay.create({
        data: { truckId, reason },
      });

      // Mark truck as delayed
      await tx.truck.update({
        where: { id: truckId },
        data: { status: TruckStatus.DELAYED },
      });

      // Mark all bags and packages as delayed
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
        }
      }
    });

    res.json({ message: "Truck marked as delayed", reason });
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

    if (!truckId) throw new AppError("truckId is required", 400);

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: {
        bags: { include: { packages: true } },
      },
    });

    if (!truck) throw new AppError("Truck not found", 404);
    if (truck.status === "DEPARTED") {
      throw new AppError("Truck has already departed", 400);
    }

    await prisma.$transaction(async (tx) => {
      // Mark truck as departed
      await tx.truck.update({
        where: { id: truckId },
        data: {
          status: TruckStatus.DEPARTED,
          actualDeparture: new Date(),
        },
      });

      // Update all bags to IN_TRANSIT
      for (const bag of truck.bags) {
        await tx.bag.update({
          where: { id: bag.id },
          data: { status: BagStatus.IN_TRANSIT },
        });

        // Log status update for each package
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

    res.json({ message: `Truck ${truck.code} marked as departed` });
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
      throw new AppError("truckId and regionCode are required", 400);
    }

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: {
        bags: { include: { packages: true } },
      },
    });

    if (!truck) throw new AppError("Truck not found", 404);
    if (truck.status !== "DEPARTED") {
      throw new AppError("Truck must be departed before arriving", 400);
    }

    await prisma.$transaction(async (tx) => {
      // Mark truck as arrived
      await tx.truck.update({
        where: { id: truckId },
        data: { status: TruckStatus.ARRIVED },
      });

      // Update all bags to ARRIVED
      for (const bag of truck.bags) {
        await tx.bag.update({
          where: { id: bag.id },
          data: { status: BagStatus.ARRIVED },
        });

        // Update all packages — arrived at new region
        for (const pkg of bag.packages) {
          await tx.package.update({
            where: { id: pkg.id },
            data: {
              status: PackageStatus.ARRIVED,
              currentLocation: regionCode,
              bagId: null, // ← detach from bag, ready for re-bagging
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
        }
      }
    });

    res.json({
      message: `Truck ${truck.code} arrived at ${regionCode}`,
      packagesReady: truck.bags.reduce(
        (sum, bag) => sum + bag.packages.length,
        0,
      ),
    });
  } catch (error) {
    next(error);
  }
};
