export type RegionResponse = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
};

export type DelayResponse = {
  id: string;
  reason: string;
  createdAt: string;
};

export type StatusUpdateResponse = {
  id: string;
  status: string;
  location: string | null;
  note: string | null;
  createdAt: string;
};

export type PackageResponse = {
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
  bag?: BagResponse | null;
  region?: RegionResponse | null;
  statusUpdates?: StatusUpdateResponse[];
};

export type BagResponse = {
  id: string;
  code: string;
  direction: string;
  status: string;
  truckId: string | null;
  createdAt: string;
  updatedAt: string;
  packages?: PackageResponse[];
  truck?: TruckResponse | null;
  delay?: DelayResponse | null;
};

export type TruckResponse = {
  id: string;
  code: string;
  regionId: string;
  scheduledDeparture: string;
  actualDeparture: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  bags?: BagResponse[];
  region?: RegionResponse | null;
  delay?: DelayResponse | null;
};

export type DashboardResponse = {
  newUnbagged: {
    count: number;
    packages: PackageResponse[];
    period: string;
  };
  arrivedUnbagged: {
    count: number;
    packages: PackageResponse[];
  };
  baggedAndLoaded: {
    count: number;
    bags: BagResponse[];
  };
  delayed: {
    count: number;
    packages: PackageResponse[];
  };
};
