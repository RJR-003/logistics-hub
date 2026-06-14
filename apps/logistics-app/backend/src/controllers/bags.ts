import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { BagStatus, PackageStatus } from "../constants/packageStatus";

// Create a new bag
export const createBag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code, direction } = req.body;

    if (!code || !direction) {
      throw new AppError("code and direction are required", 400);
    }

    const bag = await prisma.bag.create({
      data: { code, direction },
    });

    res.status(201).json({ message: "Bag created", bag });
  } catch (error) {
    next(error);
  }
};

// Mark a bag and all its packages as delayed
export const delayBag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { bagId, reason } = req.body;

    if (!bagId || !reason) {
      throw new AppError("bagId and reason are required", 400);
    }

    const bag = await prisma.bag.findUnique({
      where: { id: bagId },
      include: { packages: true },
    });

    if (!bag) throw new AppError("Bag not found", 404);

    // Use a transaction — all updates succeed or none do
    await prisma.$transaction(async (tx) => {
      // Create delay record
      await tx.delay.create({
        data: { bagId, reason },
      });

      // Mark the bag as delayed
      await tx.bag.update({
        where: { id: bagId },
        data: { status: BagStatus.DELAYED },
      });

      // Mark every package in the bag as delayed
      for (const pkg of bag.packages) {
        await tx.package.update({
          where: { id: pkg.id },
          data: { status: PackageStatus.DELAYED },
        });

        // Log delay in each package's status history
        await tx.statusUpdate.create({
          data: {
            packageId: pkg.id,
            status: PackageStatus.DELAYED,
            note: `Bag delayed: ${reason}`,
          },
        });
      }
    });

    res.json({
      message: `Bag delayed. ${bag.packages.length} packages marked as delayed.`,
      reason,
    });
  } catch (error) {
    next(error);
  }
};

// Get all bags
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

    res.json({ bags });
  } catch (error) {
    next(error);
  }
};
