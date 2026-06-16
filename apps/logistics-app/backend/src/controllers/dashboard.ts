import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { PackageStatus } from "../constants/packageStatus";
import { successResponse } from "../types/api";
import { DashboardResponse } from "../types/logistics";

export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const noon = new Date(now);
    noon.setHours(12, 0, 0, 0);
    const currentPeriodStart = now.getHours() < 12 ? startOfDay : noon;

    const [newUnbagged, arrivedUnbagged, baggedAndLoaded, delayed] =
      await Promise.all([
        prisma.package.findMany({
          where: {
            bagId: null,
            status: PackageStatus.TO_BE_PICKED_UP,
            createdAt: { gte: currentPeriodStart },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.package.findMany({
          where: {
            bagId: null,
            status: PackageStatus.ARRIVED,
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.bag.findMany({
          where: { truckId: { not: null } },
          include: {
            packages: true,
            truck: true,
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.package.findMany({
          where: { status: PackageStatus.DELAYED },
          include: {
            bag: { include: { delay: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

    const toBasicPackage = (pkg: any) => ({
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
            delay: pkg.bag.delay
              ? {
                  id: pkg.bag.delay.id,
                  reason: pkg.bag.delay.reason,
                  createdAt: pkg.bag.delay.createdAt.toISOString(),
                }
              : null,
          }
        : null,
    });

    const dashboard: DashboardResponse = {
      newUnbagged: {
        count: newUnbagged.length,
        packages: newUnbagged.map(toBasicPackage),
        period: now.getHours() < 12 ? "morning" : "afternoon",
      },
      arrivedUnbagged: {
        count: arrivedUnbagged.length,
        packages: arrivedUnbagged.map(toBasicPackage),
      },
      baggedAndLoaded: {
        count: baggedAndLoaded.length,
        bags: baggedAndLoaded.map((bag: any) => ({
          id: bag.id,
          code: bag.code,
          direction: bag.direction,
          status: bag.status,
          truckId: bag.truckId,
          createdAt: bag.createdAt.toISOString(),
          updatedAt: bag.updatedAt.toISOString(),
          packages: bag.packages.map(toBasicPackage),
          truck: bag.truck
            ? {
                id: bag.truck.id,
                code: bag.truck.code,
                regionId: bag.truck.regionId,
                scheduledDeparture: bag.truck.scheduledDeparture.toISOString(),
                actualDeparture:
                  bag.truck.actualDeparture?.toISOString() || null,
                status: bag.truck.status,
                createdAt: bag.truck.createdAt.toISOString(),
                updatedAt: bag.truck.updatedAt.toISOString(),
              }
            : null,
        })),
      },
      delayed: {
        count: delayed.length,
        packages: delayed.map(toBasicPackage),
      },
    };

    res.json(successResponse(dashboard, "Dashboard loaded successfully."));
  } catch (error) {
    next(error);
  }
};
