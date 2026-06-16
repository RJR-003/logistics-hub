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
    bag: pkg.bag
      ? {
          id: pkg.bag.id,
          code: pkg.bag.code,
          direction: pkg.bag.direction,
          status: pkg.bag.status,
          truckId: pkg.bag.truckId,
          createdAt: pkg.bag.createdAt.toISOString(),
          updatedAt: pkg.bag.updatedAt.toISOString(),
        }
      : null,
    region: pkg.region
      ? {
          id: pkg.region.id,
          code: pkg.region.code,
          name: pkg.region.name,
          createdAt: pkg.region.createdAt.toISOString(),
        }
      : null,
    statusUpdates: pkg.statusUpdates?.map((s: any) => ({
      id: s.id,
      status: s.status,
      location: s.location,
      note: s.note,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export const assignToBag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { packageId, bagId } = req.body;

    if (!packageId || !bagId) {
      throw new AppError(ErrorCodes.INVALID_PACKAGE_DATA, 400);
    }

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) throw new AppError(ErrorCodes.PACKAGE_NOT_FOUND, 404);
    if (pkg.bagId) throw new AppError(ErrorCodes.PACKAGE_ALREADY_BAGGED, 400);

    const bag = await prisma.bag.findUnique({
      where: { id: bagId },
    });

    if (!bag) throw new AppError(ErrorCodes.BAG_NOT_FOUND, 404);

    const updated = await prisma.package.update({
      where: { id: packageId },
      data: {
        bagId,
        status: PackageStatus.ADDED_TO_BAG,
        currentLocation: bag.direction,
      },
    });

    await prisma.statusUpdate.create({
      data: {
        packageId,
        status: PackageStatus.ADDED_TO_BAG,
        location: bag.direction,
        note: `Assigned to bag ${bag.code}`,
      },
    });

    res.json(
      successResponse(
        { package: toPackageResponse(updated) },
        `Package assigned to bag ${bag.code} successfully.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const updateOutgoingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { packageId, status, location, note } = req.body;

    if (!packageId || !status) {
      throw new AppError(ErrorCodes.INVALID_PACKAGE_DATA, 400);
    }

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) throw new AppError(ErrorCodes.PACKAGE_NOT_FOUND, 404);

    const updated = await prisma.package.update({
      where: { id: packageId },
      data: {
        status,
        currentLocation: location || pkg.currentLocation,
      },
    });

    await prisma.statusUpdate.create({
      data: {
        packageId,
        status,
        location: location || null,
        note: note || null,
      },
    });

    res.json(
      successResponse(
        { package: toPackageResponse(updated) },
        "Package status updated successfully.",
      ),
    );
  } catch (error) {
    next(error);
  }
};

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
          take: 1,
        },
      },
    });

    res.json(
      successResponse(
        { packages: packages.map(toPackageResponse) },
        `${packages.length} package${packages.length === 1 ? "" : "s"} found.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const markForLocalDelivery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { packageId } = req.body;

    if (!packageId) throw new AppError(ErrorCodes.INVALID_PACKAGE_DATA, 400);

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) throw new AppError(ErrorCodes.PACKAGE_NOT_FOUND, 404);

    if (pkg.status !== PackageStatus.ARRIVED) {
      throw new AppError(ErrorCodes.PACKAGE_NOT_ARRIVED, 400);
    }

    const updated = await prisma.package.update({
      where: { id: packageId },
      data: { status: PackageStatus.SCHEDULED_FOR_DELIVERY },
    });

    await prisma.statusUpdate.create({
      data: {
        packageId,
        status: PackageStatus.SCHEDULED_FOR_DELIVERY,
        location: pkg.currentLocation || undefined,
        note: "Package reached destination — scheduled for local delivery",
      },
    });

    res.json(
      successResponse(
        { package: toPackageResponse(updated) },
        "Package has been scheduled for local delivery.",
      ),
    );
  } catch (error) {
    next(error);
  }
};
