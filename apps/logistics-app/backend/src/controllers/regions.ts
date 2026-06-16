import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { successResponse } from "../types/api";
import { RegionResponse } from "../types/logistics";

function toRegionResponse(region: any): RegionResponse {
  return {
    id: region.id,
    code: region.code,
    name: region.name,
    createdAt: region.createdAt.toISOString(),
  };
}

export const getAllRegions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { code: "asc" },
    });

    res.json(
      successResponse(
        { regions: regions.map(toRegionResponse) },
        `${regions.length} region${regions.length === 1 ? "" : "s"} found.`,
      ),
    );
  } catch (error) {
    next(error);
  }
};
