import { ErrorCode, ErrorCodes } from "./errorCodes";

// These messages are for end users — shown in toasts
// Never expose raw system errors here
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.PACKAGE_NOT_FOUND]:
    "We could not find a package with that tracking ID. Please check and try again.",
  [ErrorCodes.PACKAGE_ALREADY_EXISTS]:
    "A package with this tracking ID already exists.",
  [ErrorCodes.INVALID_PACKAGE_DATA]:
    "Some package details are missing or invalid. Please check and try again.",
  [ErrorCodes.INVALID_SALE_DATA]:
    "Some payment details are missing or invalid. Please check and try again.",
  [ErrorCodes.VALIDATION_ERROR]:
    "The information provided is incomplete or invalid.",
  [ErrorCodes.INTERNAL_ERROR]:
    "Something went wrong on our end. Please try again in a moment.",
  [ErrorCodes.DATABASE_ERROR]:
    "We are having trouble accessing our records. Please try again shortly.",
  [ErrorCodes.UNAUTHORIZED]: "You are not authorized to perform this action.",
};
