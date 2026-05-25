import { Request, Response } from "express";
import prisma from "../lib/prisma";

export const createPackage = async (req: Request, res: Response) => {
  try {
    const { fromAddress, toAddress, weight, amount, paymentMethod } = req.body;

    // Validate package fields
    if (!fromAddress || !toAddress || !weight) {
      res.status(400).json({
        error: "fromAddress, toAddress and weight are required",
      });
      return;
    }

    if (typeof weight !== "number" || weight <= 0) {
      res.status(400).json({
        error: "weight must be a positive number",
      });
      return;
    }

    // Validate sale fields
    if (!amount || !paymentMethod) {
      res.status(400).json({
        error: "amount and paymentMethod are required",
      });
      return;
    }

    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({
        error: "amount must be a positive number",
      });
      return;
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
    console.error("Error creating package:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPackages = async (req: Request, res: Response) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: "desc" },
      include: { sale: true },
    });

    res.json({ packages });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPackageByTrackingId = async (req: Request, res: Response) => {
  try {
    const trackingId = req.params.trackingId as string;

    const pkg = await prisma.package.findUnique({
      where: { trackingId },
      include: { sale: true },
    });

    if (!pkg) {
      res.status(404).json({ error: "Package not found" });
      return;
    }

    res.json({ package: pkg });
  } catch (error) {
    console.error("Error fetching package:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
