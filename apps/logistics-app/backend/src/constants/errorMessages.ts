import { ErrorCode, ErrorCodes } from "./errorCodes";

export const ErrorMessages: Record<ErrorCode, string> = {
  // Package
  [ErrorCodes.PACKAGE_NOT_FOUND]:
    "Package not found. Please check the package ID and try again.",
  [ErrorCodes.PACKAGE_ALREADY_BAGGED]:
    "This package is already assigned to a bag.",
  [ErrorCodes.PACKAGE_NOT_ARRIVED]:
    "This package has not arrived at the hub yet and cannot be scheduled for delivery.",
  [ErrorCodes.INVALID_PACKAGE_DATA]:
    "Some package details are missing or invalid. Please check and try again.",

  // Bag
  [ErrorCodes.BAG_NOT_FOUND]:
    "Bag not found. Please check the bag ID and try again.",
  [ErrorCodes.BAG_ALREADY_DELAYED]:
    "This bag has already been marked as delayed.",
  [ErrorCodes.INVALID_BAG_DATA]:
    "Some bag details are missing or invalid. Please check and try again.",

  // Truck
  [ErrorCodes.TRUCK_NOT_FOUND]:
    "Truck not found. Please check the truck ID and try again.",
  [ErrorCodes.TRUCK_ALREADY_DEPARTED]:
    "This truck has already departed and cannot be modified.",
  [ErrorCodes.TRUCK_NOT_DEPARTED]:
    "This truck has not departed yet. Please mark it as departed first.",
  [ErrorCodes.TRUCK_ALREADY_DELAYED]:
    "This truck has already been marked as delayed.",
  [ErrorCodes.INVALID_TRUCK_DATA]:
    "Some truck details are missing or invalid. Please check and try again.",

  // Region
  [ErrorCodes.REGION_NOT_FOUND]:
    "Region not found. Please check the region code and try again.",

  // General
  [ErrorCodes.VALIDATION_ERROR]:
    "The information provided is incomplete or invalid. Please check and try again.",
  [ErrorCodes.INTERNAL_ERROR]:
    "Something went wrong on our end. Please try again in a moment.",
  [ErrorCodes.DATABASE_ERROR]:
    "We are having trouble accessing our records. Please try again shortly.",
  [ErrorCodes.UNAUTHORIZED]: "You are not authorized to perform this action.",
};
