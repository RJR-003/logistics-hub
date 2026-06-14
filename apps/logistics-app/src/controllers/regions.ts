import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export const getAllRegions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { code: "asc" },
    });
    res.json({ regions });
  } catch (error) {
    next(error);
  }
};
