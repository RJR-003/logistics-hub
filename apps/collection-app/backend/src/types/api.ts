// The standard error shape
export type ApiError = {
  code: string;
  details?: string; // optional — for logging, not shown to users
};

// The standard response envelope
export type ApiResponse<T> = {
  error: ApiError | null;
  message: string;
  data: T | null;
};

// Helper functions to build responses consistently
export function successResponse<T>(data: T, message: string): ApiResponse<T> {
  return {
    error: null,
    message,
    data,
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: string,
): ApiResponse<null> {
  return {
    error: { code, details },
    message,
    data: null,
  };
}
