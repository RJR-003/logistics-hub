export type ApiError = {
  code: string;
  details?: string;
};

export type ApiResponse<T> = {
  error: ApiError | null;
  message: string;
  data: T | null;
};

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
