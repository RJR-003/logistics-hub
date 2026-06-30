import { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { PackageStatus } from "../constants/packageStatus";
import { ErrorCodes } from "../constants/errorCodes";
import { successResponse } from "../types/api";
import {
  PackageResponse,
  CreatePackageResponse,
  DashboardResponse,
  SaleResponse,
} from "../types/package";
import { retryFetch } from "../lib/retryFetch";
import { parsePagination, PaginatedResponse } from "../lib/pagination";

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
    regionId: pkg.regionId,
    destinationRegionId: pkg.destinationRegionId || null,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    sale: pkg.sale ? toSaleResponse(pkg.sale) : null,
    region: pkg.region
      ? {
          id: pkg.region.id,
          code: pkg.region.code,
          name: pkg.region.name,
          createdAt: pkg.region.createdAt.toISOString(),
        }
      : null,
    destinationRegion: pkg.destinationRegion
      ? {
          id: pkg.destinationRegion.id,
          code: pkg.destinationRegion.code,
          name: pkg.destinationRegion.name,
          createdAt: pkg.destinationRegion.createdAt.toISOString(),
        }
      : null,
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
    const DASHBOARD_SECTION_LIMIT = 50;
    // Run all three queries simultaneously
    // Promise.all fires them at the same time instead of one after another
    // Faster — three parallel DB queries instead of three sequential ones
    const [pending, active, delayed] = await Promise.all([
      // Section 1 — pending pickup
      prisma.package.findMany({
        where: {
          status: PackageStatus.TO_BE_PICKED_UP,
        },
        include: { sale: true, region: true, destinationRegion: true },
        orderBy: { createdAt: "desc" },
        take: DASHBOARD_SECTION_LIMIT,
      }),

      // Section 2 — actively moving
      prisma.package.findMany({
        where: {
          AND: [
            { status: { not: PackageStatus.TO_BE_PICKED_UP } },
            { status: { not: "DELAYED" } },
          ],
        },
        include: { sale: true, region: true, destinationRegion: true },
        orderBy: { updatedAt: "desc" },
        take: DASHBOARD_SECTION_LIMIT,
      }),

      // Section 3 — delayed
      prisma.package.findMany({
        where: {
          status: PackageStatus.DELAYED,
        },
        include: { sale: true, region: true, destinationRegion: true },
        orderBy: { updatedAt: "desc" },
        take: DASHBOARD_SECTION_LIMIT,
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
    const {
      fromAddress,
      toAddress,
      weight,
      amount,
      paymentMethod,
      regionId,
      destinationRegionId,
    } = req.body;

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

    let regionCode: string | null = null;
    if (regionId) {
      const region = await prisma.region.findUnique({
        where: { id: regionId },
      });
      regionCode = region?.code || null;
    }

    // Create package AND sale in one transaction
    // Either both succeed or neither does — data stays consistent
    const newPackage = await prisma.package.create({
      data: {
        fromAddress,
        toAddress,
        weight,
        regionId: regionId || null,
        destinationRegionId: destinationRegionId || null,
        currentLocation: regionCode || null,
        sale: {
          create: {
            amount,
            paymentMethod,
          },
        },
      },
      include: {
        sale: true, // return the sale details in the response
        region: true,
        destinationRegion: true,
      },
    });

    // Fire webhook to App 2 — don't await, don't block the response
    // If App 2 is down, the package is still created in App 1
    retryFetch(
      APP2_WEBHOOK_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingId: newPackage.trackingId,
          fromAddress: newPackage.fromAddress,
          toAddress: newPackage.toAddress,
          weight: newPackage.weight,
          regionCode: newPackage.region?.code || null,
          destinationRegionCode: newPackage.destinationRegion?.code || null,
          currentLocation: regionCode,
        }),
      },
      {
        maxRetries: 4,
        initialDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(
            `[Webhook] Attempt ${attempt} failed, retrying...`,
            error instanceof Error ? error.message : error,
          );
        },
      },
    ).catch((err) => {
      console.error(
        "[Webhook] Failed to notify App 2 after all retries:",
        err instanceof Error ? err.message : err,
      );
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
    const { take, skip } = parsePagination(req);

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        orderBy: { createdAt: "desc" }, // always set — never unordered
        take,
        skip,
        include: { sale: true, region: true, destinationRegion: true },
      }),
      prisma.package.count(),
    ]);

    const responseData: PaginatedResponse<PackageResponse> = {
      items: packages.map(toPackageResponse),
      pagination: { limit: take, offset: skip, total },
    };

    res.json(
      successResponse(
        responseData,
        `${packages.length} of ${total} package${packages.length === 1 ? "" : "s"} shown.`,
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
      include: { sale: true, region: true },
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
