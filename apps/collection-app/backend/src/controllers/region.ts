import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { successResponse } from "../types/api";

export const getAllRegions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { code: "asc" },
    });

    res.json(successResponse({ regions }, `${regions.length} regions found.`));
  } catch (error) {
    next(error);
  }
};
