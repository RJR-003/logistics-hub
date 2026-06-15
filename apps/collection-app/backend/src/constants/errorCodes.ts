export const ErrorCodes = {
  // Package errors
  PACKAGE_NOT_FOUND: "PACKAGE_NOT_FOUND",
  PACKAGE_ALREADY_EXISTS: "PACKAGE_ALREADY_EXISTS",
  INVALID_PACKAGE_DATA: "INVALID_PACKAGE_DATA",

  // Sale errors
  INVALID_SALE_DATA: "INVALID_SALE_DATA",

  // General errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
