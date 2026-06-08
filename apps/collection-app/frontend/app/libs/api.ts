// Client components use NEXT_PUBLIC_API_URL (localhost, browser accessible)
// Server components use API_URL (docker service name, container accessible)
const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL || "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

// API functions
export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/api/packages/dashboard`, {
    cache: "no-store", // always fetch fresh data
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  const data = await res.json();
  return data.dashboard;
}

export async function createPackage(
  input: CreatePackageInput,
): Promise<Package> {
  const res = await fetch(`${API_URL}/api/packages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create package");
  }
  const data = await res.json();
  return data.package;
}

export async function trackPackage(trackingId: string): Promise<Package> {
  const res = await fetch(`${API_URL}/api/packages/track/${trackingId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Package not found");
  }
  const data = await res.json();
  return data.package;
}
