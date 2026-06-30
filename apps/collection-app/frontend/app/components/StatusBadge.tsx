type Props = {
  status: string;
};

const statusStyles: Record<string, string> = {
  TO_BE_PICKED_UP: "bg-yellow-100 text-yellow-800",
  PICKED_UP: "bg-blue-100 text-blue-800",
  ADDED_TO_BAG: "bg-blue-100 text-blue-800",
  EN_ROUTE: "bg-purple-100 text-purple-800",
  ARRIVED: "bg-indigo-100 text-indigo-800",
  SCHEDULED_FOR_DELIVERY: "bg-cyan-100 text-cyan-800",
  OUT_FOR_DELIVERY: "bg-green-100 text-green-800",
  DELAYED: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  TO_BE_PICKED_UP: "To Be Picked Up",
  PICKED_UP: "Picked Up",
  ADDED_TO_BAG: "Added to Bag",
  EN_ROUTE: "En Route",
  ARRIVED: "Arrived",
  SCHEDULED_FOR_DELIVERY: "Scheduled for Delivery",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELAYED: "Delayed",
};

export default function StatusBadge({ status }: Props) {
  const style = statusStyles[status] || "bg-gray-100 text-gray-800";
  const label =
    statusLabels[status] ||
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
