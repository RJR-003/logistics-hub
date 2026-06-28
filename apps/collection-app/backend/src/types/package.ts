// What a Sale looks like in API responses
export type RegionResponse = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
};

export type SaleResponse = {
  id: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
};

// What a Package looks like in API responses
export type PackageResponse = {
  id: string;
  trackingId: string;
  fromAddress: string;
  toAddress: string;
  weight: number;
  status: string;
  currentLocation: string | null;
  delayReason: string | null;
  regionId: string | null;
  createdAt: string;
  updatedAt: string;
  sale: SaleResponse | null;
  region: RegionResponse | null;
};

// What the dashboard response looks like
export type DashboardResponse = {
  pending: {
    count: number;
    packages: PackageResponse[];
  };
  active: {
    count: number;
    packages: PackageResponse[];
  };
  delayed: {
    count: number;
    packages: PackageResponse[];
  };
};

// What creating a package returns
export type CreatePackageResponse = {
  trackingId: string;
  package: PackageResponse;
};
