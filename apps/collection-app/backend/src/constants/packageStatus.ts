export const PackageStatus = {
  TO_BE_PICKED_UP: "TO_BE_PICKED_UP",
  DELAYED: "DELAYED",
} as const;

// All other statuses originate from App 2 and arrive via ETL.
// App 1 treats them as opaque strings — it does not validate
// or define their meaning. This keeps App 1 decoupled from
// App 2's internal logistics workflow.
//
// Known values (for reference only, not enforced here):
// PICKED_UP, ADDED_TO_BAG, EN_ROUTE, ARRIVED,
// SCHEDULED_FOR_DELIVERY, OUT_FOR_DELIVERY, DELAYED
