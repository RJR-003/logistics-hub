import { Request } from "express";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export type PaginationParams = {
  take: number;
  skip: number;
};

export function parsePagination(req: Request): PaginationParams {
  const requestedLimit = parseInt(req.query.limit as string);
  const requestedOffset = parseInt(req.query.offset as string);

  const take =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const skip =
    Number.isFinite(requestedOffset) && requestedOffset >= 0
      ? requestedOffset
      : 0;

  return { take, skip };
}

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};
