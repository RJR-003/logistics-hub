import { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { PackageStatus } from "../constants/packageStatus";
import { ErrorCodes } from "../constants/errorCodes";
import { successResponse, errorResponse } from "../types/api";
import {
  PackageResponse,
  CreatePackageResponse,
  DashboardResponse,
  SaleResponse,
} from "../types/package";

// Helper — converts Prisma package to our response type
function toPackageResponse(pkg: any): PackageResponse {
  return {
    id: pkg.id,
    trackingId: pkg.trackingId,
    fromAddress: pkg.fromAddress,
    toAddress: pkg.toAddress,
    weight: pkg.weight,
    status: pkg.status,
    currentLocation: pkg.currentLocation,
    delayReason: pkg.delayReason,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    sale: pkg.sale ? toSaleResponse(pkg.sale) : null,
  };
}

function toSaleResponse(sale: any): SaleResponse {
  return {
    id: sale.id,
    amount: sale.amount,
    paymentMethod: sale.paymentMethod,
    createdAt: sale.createdAt.toISOString(),
  };
}

const APP2_WEBHOOK_URL = process.env.APP2_URL
  ? `${process.env.APP2_URL}/webhook/package`
  : "http://localhost:3002/webhook/package";

export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Run all three queries simultaneously
    // Promise.all fires them at the same time instead of one after another
    // Faster — three parallel DB queries instead of three sequential ones
    const [pending, active, delayed] = await Promise.all([
      // Section 1 — pending pickup
      prisma.package.findMany({
        where: {
          status: PackageStatus.TO_BE_PICKED_UP,
        },
        include: { sale: true },
        orderBy: { createdAt: "desc" },
      }),

      // Section 2 — actively moving
      prisma.package.findMany({
        where: {
          status: {
            in: [
              PackageStatus.PICKED_UP,
              PackageStatus.ADDED_TO_BAG,
              PackageStatus.EN_ROUTE,
              PackageStatus.ARRIVED,
              PackageStatus.SCHEDULED_FOR_DELIVERY,
              PackageStatus.OUT_FOR_DELIVERY,
            ],
          },
        },
        include: { sale: true },
        orderBy: { updatedAt: "desc" },
      }),

      // Section 3 — delayed
      prisma.package.findMany({
        where: {
          status: PackageStatus.DELAYED,
        },
        include: { sale: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const dashboard: DashboardResponse = {
      pending: {
        count: pending.length,
        packages: pending.map(toPackageResponse),
      },
      active: {
        count: active.length,
        packages: active.map(toPackageResponse),
      },
      delayed: {
        count: delayed.length,
        packages: delayed.map(toPackageResponse),
      },
    };

    res.json(successResponse(dashboard, "Dashboard loaded successfully."));
  } catch (error) {
    next(error);
  }
};

export const createPackage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fromAddress, toAddress, weight, amount, paymentMethod } = req.body;

    // Validate package fields
    if (!fromAddress || !toAddress || !weight) {
      throw new AppError(ErrorCodes.INVALID_PACKAGE_DATA, 400);
    }

    if (typeof weight !== "number" || weight <= 0) {
      throw new AppError(ErrorCodes.INVALID_PACKAGE_DATA, 400);
    }

    // Validate sale fields
    if (!amount || !paymentMethod) {
      throw new AppError(ErrorCodes.INVALID_SALE_DATA, 400);
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new AppError(ErrorCodes.INVALID_SALE_DATA, 400);
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

    // Fire webhook to App 2 — don't await, don't block the response
    // If App 2 is down, the package is still created in App 1
    fetch(APP2_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingId: newPackage.trackingId,
        fromAddress: newPackage.fromAddress,
        toAddress: newPackage.toAddress,
        weight: newPackage.weight,
      }),
    }).catch((err) => {
      // Log but never fail the main request because of this
      console.error("[Webhook] Failed to notify App 2:", err.message);
    });

    const responseData: CreatePackageResponse = {
      trackingId: newPackage.trackingId,
      package: toPackageResponse(newPackage),
    };

    res
      .status(201)
      .json(
        successResponse(
          responseData,
          "Package created successfully. Please give the tracking ID to the customer.",
        ),
      );
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
      throw new AppError(ErrorCodes.PACKAGE_NOT_FOUND, 404);
    }

    res.json(
      successResponse(
        { package: toPackageResponse(pkg) },
        "Package details retrieved successfully.",
      ),
    );
  } catch (error) {
    next(error);
  }
};
