import { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export const createPackage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fromAddress, toAddress, weight, amount, paymentMethod } = req.body;

    // Validate package fields
    if (!fromAddress || !toAddress || !weight) {
      throw new AppError("fromAddress, toAddress and weight are required", 400);
    }

    if (typeof weight !== "number" || weight <= 0) {
      throw new AppError("weight must be a positive number", 400);
    }

    // Validate sale fields
    if (!amount || !paymentMethod) {
      throw new AppError("amount and paymentMethod are required", 400);
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new AppError("amount must be a positive number", 400);
    }

    // Create package AND sale in one transaction
    // Either both succeed or neither does — data stays consistent
    const newPackage = await prisma.package.create({
      data: {
        fromAddress,
        toAddress,
        weight,
        sale: {
          create: {
            amount,
            paymentMethod,
          },
        },
      },
      include: {
        sale: true, // return the sale details in the response
      },
    });

    res.status(201).json({
      message: "Package created successfully",
      trackingId: newPackage.trackingId,
      package: newPackage,
    });
  } catch (error) {
    next(error); //pass all errors to the centralized error handler
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
      include: { sale: true },
    });

    res.json({ packages });
  } catch (error) {
    next(error);
  }
};

export const getPackageByTrackingId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const trackingId = req.params.trackingId as string;

    const pkg = await prisma.package.findUnique({
      where: { trackingId },
      include: { sale: true },
    });

    if (!pkg) {
      throw new AppError("Package not found", 404);
    }

    res.json({ package: pkg });
  } catch (error) {
    next(error);
  }
};
