const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL || "http://localhost:3002"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

// Types

export type Region = {
  id: string;
  code: string;
  name: string;
};

export type Package = {
  id: string;
  trackingId: string;
  fromAddress: string;
  toAddress: string;
  weight: number;
  status: string;
  currentLocation: string | null;
  bagId: string | null;
  regionId: string | null;
  createdAt: string;
  updatedAt: string;
  bag?: Bag | null;
  region?: Region | null;
};

export type Bag = {
  id: string;
  code: string;
  direction: string;
  status: string;
  truckId: string | null;
  createdAt: string;
  updatedAt: string;
  packages?: Package[];
  truck?: Truck | null;
  delay?: Delay | null;
};

export type Truck = {
  id: string;
  code: string;
  regionId: string;
  scheduledDeparture: string;
  actualDeparture: string | null;
  status: string;
  createdAt: string;
  bags?: Bag[];
  delay?: Delay | null;
};

export type Delay = {
  id: string;
  reason: string;
  bagId: string | null;
  truckId: string | null;
  createdAt: string;
};

export type DashboardData = {
  newUnbagged: { count: number; packages: Package[]; period: string };
  arrivedUnbagged: { count: number; packages: Package[] };
  baggedAndLoaded: { count: number; bags: Bag[] };
  delayed: { count: number; packages: Package[] };
};

// API Functions

export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/api/dashboard`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  const data = await res.json();
  return data.dashboard;
}

export async function getAllPackages(): Promise<Package[]> {
  const res = await fetch(`${API_URL}/api/packages`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data.packages;
}

export async function getAllBags(): Promise<Bag[]> {
  const res = await fetch(`${API_URL}/api/bags`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch bags");
  const data = await res.json();
  return data.bags;
}

export async function getAllTrucks(): Promise<Truck[]> {
  const res = await fetch(`${API_URL}/api/trucks`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch trucks");
  const data = await res.json();
  return data.trucks;
}

export async function getAllRegions(): Promise<Region[]> {
  const res = await fetch(`${API_URL}/api/regions`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch regions");
  const data = await res.json();
  return data.regions;
}

export async function createBag(data: {
  code: string;
  direction: string;
}): Promise<Bag> {
  const res = await fetch(`${API_URL}/api/bags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create bag");
  }
  const result = await res.json();
  return result.bag;
}

export async function assignToBag(data: {
  packageId: string;
  bagId: string;
}): Promise<Package> {
  const res = await fetch(`${API_URL}/api/packages/assign-bag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to assign package to bag");
  }
  const result = await res.json();
  return result.package;
}

export async function delayBag(data: {
  bagId: string;
  reason: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/bags/delay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to delay bag");
  }
}

export async function createTruck(data: {
  code: string;
  regionId: string;
  scheduledDeparture: string;
}): Promise<Truck> {
  const res = await fetch(`${API_URL}/api/trucks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create truck");
  }
  const result = await res.json();
  return result.truck;
}

export async function loadBagOntoTruck(data: {
  bagId: string;
  truckId: string;
}): Promise<Bag> {
  const res = await fetch(`${API_URL}/api/trucks/load-bag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to load bag onto truck");
  }
  const result = await res.json();
  return result.bag;
}

export async function updatePackageStatus(data: {
  packageId: string;
  status: string;
  location?: string;
  note?: string;
}): Promise<Package> {
  const res = await fetch(`${API_URL}/api/packages/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update status");
  }
  const result = await res.json();
  return result.package;
}
