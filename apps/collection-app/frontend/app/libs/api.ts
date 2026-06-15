// Client components use NEXT_PUBLIC_API_URL (localhost, browser accessible)
// Server components use API_URL (docker service name, container accessible)
const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL || "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiError = {
  code: string;
  details?: string;
};

type ApiResponse<T> = {
  error: ApiError | null;
  message: string;
  data: T | null;
};

// Types — mirroring my Prisma models
export type Sale = {
  id: string;
  packageId: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
};

export type Package = {
  id: string;
  trackingId: string;
  fromAddress: string;
  toAddress: string;
  weight: number;
  status: string;
  currentLocation: string | null;
  delayReason: string | null;
  createdAt: string;
  updatedAt: string;
  sale: Sale | null;
};

export type DashboardData = {
  pending: { count: number; packages: Package[] };
  active: { count: number; packages: Package[] };
  delayed: { count: number; packages: Package[] };
};

export type CreatePackageInput = {
  fromAddress: string;
  toAddress: string;
  weight: number;
  amount: number;
  paymentMethod: string;
};

// Returns data on success, throws user-friendly message on error
async function unwrap<T>(res: globalThis.Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.error || !json.data) {
    // Use the message from the server — it's already user-friendly
    throw new Error(json.message || "Something went wrong. Please try again.");
  }

  return json.data;
}

// API functions
export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/api/packages/dashboard`, {
    cache: "no-store", // always fetch fresh data
  });
  return unwrap<DashboardData>(res);
}

export async function createPackage(
  input: CreatePackageInput,
): Promise<{ trackingId: string; package: Package }> {
  const res = await fetch(`${API_URL}/api/packages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return unwrap<{ trackingId: string; package: Package }>(res);
}

export async function trackPackage(trackingId: string): Promise<Package> {
  const res = await fetch(`${API_URL}/api/packages/track/${trackingId}`, {
    cache: "no-store",
  });
  const data = await unwrap<{ package: Package }>(res);
  return data.package;
}
