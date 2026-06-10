import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { PackageStatus } from "../constants/packageStatus";

// Assign a package to a bag
export const assignToBag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { packageId, bagId } = req.body;

    if (!packageId || !bagId) {
      throw new AppError("packageId and bagId are required", 400);
    }

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) throw new AppError("Package not found", 404);

    const bag = await prisma.bag.findUnique({
      where: { id: bagId },
    });

    if (!bag) throw new AppError("Bag not found", 404);

    // Update package — assign to bag and update status
    const updated = await prisma.package.update({
      where: { id: packageId },
      data: {
        bagId,
        status: PackageStatus.ADDED_TO_BAG,
        currentLocation: bag.direction,
      },
    });

    // Log the status change
    await prisma.statusUpdate.create({
      data: {
        packageId,
        status: PackageStatus.ADDED_TO_BAG,
        location: bag.direction,
        note: `Assigned to bag ${bag.code}`,
      },
    });

    res.json({
      message: "Package assigned to bag",
      package: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Update package status for outgoing packages
export const updateOutgoingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { packageId, status, location, note } = req.body;

    if (!packageId || !status) {
      throw new AppError("packageId and status are required", 400);
    }

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) throw new AppError("Package not found", 404);

    const updated = await prisma.package.update({
      where: { id: packageId },
      data: {
        status,
        currentLocation: location || pkg.currentLocation,
      },
    });

    // Log every status change
    await prisma.statusUpdate.create({
      data: {
        packageId,
        status,
        location: location || null,
        note: note || null,
      },
    });

    res.json({
      message: "Package status updated",
      package: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Get all packages
export const getAllPackages = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        bag: true,
        region: true,
        statusUpdates: {
          orderBy: { createdAt: "desc" },
          take: 1, // only the latest status update
        },
      },
    });

    res.json({ packages });
  } catch (error) {
    next(error);
  }
};
