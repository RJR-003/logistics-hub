import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { PackageStatus } from "../constants/packageStatus";

export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const now = new Date();

    // Morning = midnight to noon, Evening = noon to midnight
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const noon = new Date(now);
    noon.setHours(12, 0, 0, 0);

    const currentPeriodStart = now.getHours() < 12 ? startOfDay : noon;

    const [newUnbagged, arrivedUnbagged, baggedAndLoaded, delayed] =
      await Promise.all([
        // Section 1 — new packages arrived in current period, not yet bagged
        prisma.package.findMany({
          where: {
            bagId: null,
            status: PackageStatus.TO_BE_PICKED_UP,
            createdAt: { gte: currentPeriodStart },
          },
          orderBy: { createdAt: "desc" },
        }),

        // Section 2 — arrived in last truck, not yet bagged
        prisma.package.findMany({
          where: {
            bagId: null,
            status: PackageStatus.ARRIVED,
          },
          orderBy: { updatedAt: "desc" },
        }),

        // Section 3 — bagged and loaded onto trucks
        prisma.bag.findMany({
          where: {
            truckId: { not: null },
          },
          include: {
            packages: true,
            truck: true,
          },
          orderBy: { updatedAt: "desc" },
        }),

        // Section 4 — all delayed packages
        prisma.package.findMany({
          where: {
            status: PackageStatus.DELAYED,
          },
          include: {
            bag: {
              include: { delay: true },
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

    res.json({
      dashboard: {
        newUnbagged: {
          count: newUnbagged.length,
          packages: newUnbagged,
          period: now.getHours() < 12 ? "morning" : "afternoon",
        },
        arrivedUnbagged: {
          count: arrivedUnbagged.length,
          packages: arrivedUnbagged,
        },
        baggedAndLoaded: {
          count: baggedAndLoaded.length,
          bags: baggedAndLoaded,
        },
        delayed: {
          count: delayed.length,
          packages: delayed,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
