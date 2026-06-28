const API_URL =
  typeof window === "undefined"
    ? process.env.API_URL || "http://localhost:3002"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

type ApiError = {
  code: string;
  details?: string;
};

type ApiResponse<T> = {
  error: ApiError | null;
  message: string;
  data: T | null;
};

async function unwrap<T>(res: globalThis.Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();
  if (!res.ok || json.error || !json.data) {
    throw new Error(json.message || "Something went wrong. Please try again.");
  }
  return json.data;
}

export type Region = {
  id: string;
  code: string;
  name: string;
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
  updatedAt: string;
  region?: Region | null;
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
  return unwrap<DashboardData>(res);
  // return unwrap<DashboardData>(res);
}

export async function getAllPackages(): Promise<Package[]> {
  const res = await fetch(`${API_URL}/api/packages`, { cache: "no-store" });
  const data = await unwrap<{ packages: Package[] }>(res);
  return data.packages;
}

export async function getAllBags(): Promise<Bag[]> {
  const res = await fetch(`${API_URL}/api/bags`, { cache: "no-store" });
  const data = await unwrap<{ bags: Bag[] }>(res);
  return data.bags;
}

export async function getAllTrucks(): Promise<Truck[]> {
  const res = await fetch(`${API_URL}/api/trucks`, { cache: "no-store" });
  const data = await unwrap<{ trucks: Truck[] }>(res);
  return data.trucks;
}

export async function getAllRegions(): Promise<Region[]> {
  const res = await fetch(`${API_URL}/api/regions`, { cache: "no-store" });
  const data = await unwrap<{ regions: Region[] }>(res);
  return data.regions;
}

export async function createBag(input: {
  code: string;
  direction: string;
}): Promise<Bag> {
  const res = await fetch(`${API_URL}/api/bags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await unwrap<{ bag: Bag }>(res);
  return data.bag;
}

export async function assignToBag(input: {
  packageId: string;
  bagId: string;
}): Promise<Package> {
  const res = await fetch(`${API_URL}/api/packages/assign-bag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await unwrap<{ package: Package }>(res);
  return data.package;
}

export async function delayBag(input: {
  bagId: string;
  reason: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/bags/delay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await unwrap<{ affectedPackages: number }>(res);
}

export async function createTruck(input: {
  code: string;
  regionId: string;
  scheduledDeparture: string;
}): Promise<Truck> {
  const res = await fetch(`${API_URL}/api/trucks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await unwrap<{ truck: Truck }>(res);
  return data.truck;
}

export async function loadBagOntoTruck(input: {
  bagId: string;
  truckId: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/trucks/load-bag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await unwrap<{ bagCode: string; truckCode: string }>(res);
}

export async function updatePackageStatus(input: {
  packageId: string;
  status: string;
  location?: string;
  note?: string;
}): Promise<Package> {
  const res = await fetch(`${API_URL}/api/packages/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await unwrap<{ package: Package }>(res);
  return data.package;
}

export async function departTruck(truckId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/trucks/depart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ truckId }),
  });
  await unwrap<{ truckCode: string }>(res);
}

export async function arriveTruck(input: {
  truckId: string;
  regionCode: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/trucks/arrive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await unwrap<{ truckCode: string }>(res);
}

export async function delayTruck(input: {
  truckId: string;
  reason: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/trucks/delay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await unwrap<{ truckCode: string }>(res);
}

export async function markForLocalDelivery(
  packageId: string,
): Promise<Package> {
  const res = await fetch(`${API_URL}/api/packages/local-delivery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packageId }),
  });
  const data = await unwrap<{ package: Package }>(res);
  return data.package;
}

export async function recoverTruck(truckId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/trucks/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ truckId }),
  });
  await unwrap<{ truckCode: string }>(res);
}

export async function transferBags(data: {
  fromTruckId: string;
  toTruckId: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/trucks/transfer-bags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await unwrap<{ totalBags: number }>(res);
}

export async function resetTruck(truckId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/trucks/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ truckId }),
  });
  await unwrap<{ truckCode: string }>(res);
}
