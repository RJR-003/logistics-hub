type RetryOptions = {
  maxRetries?: number;
  initialDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
};

/**
 * Fetch with exponential backoff retry.
 * Delays: 1s, 2s, 4s, 8s (capped at maxRetries attempts)
 */
export async function retryFetch(
  url: string,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<globalThis.Response> {
  const maxRetries = options.maxRetries ?? 4;
  const initialDelayMs = options.initialDelayMs ?? 1000;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;

      // Non-2xx response — treat as a retryable failure
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    const isLastAttempt = attempt === maxRetries - 1;
    if (isLastAttempt) break;

    const delay = initialDelayMs * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
    options.onRetry?.(attempt + 1, lastError);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError;
}
