"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPackage, getRegions, Region } from "../../../libs/api";

export default function NewPackagePage() {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTrackingId, setCreatedTrackingId] = useState<string | null>(
    null,
  );

  const [form, setForm] = useState({
    fromAddress: "",
    toAddress: "",
    weight: "",
    amount: "",
    paymentMethod: "CASH",
    regionId: "",
    destinationRegionId: "",
  });

  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const pkg = await createPackage({
        fromAddress: form.fromAddress,
        toAddress: form.toAddress,
        weight: parseFloat(form.weight),
        amount: parseFloat(form.amount),
        paymentMethod: form.paymentMethod,
        regionId: form.regionId || undefined,
        destinationRegionId: form.destinationRegionId || undefined,
      });
      setCreatedTrackingId(pkg.trackingId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  // Success state — show tracking ID to staff
  if (createdTrackingId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="text-green-500 text-5xl">✓</div>
          <h2 className="text-xl font-bold text-gray-900">Package Created</h2>
          <p className="text-gray-500 text-sm">
            Give this tracking ID to the customer
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Tracking ID</p>
            <p className="font-mono font-bold text-gray-900 break-all">
              {createdTrackingId}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setCreatedTrackingId(null);
                setForm({
                  fromAddress: "",
                  toAddress: "",
                  weight: "",
                  amount: "",
                  paymentMethod: "CASH",
                  regionId: "",
                  destinationRegionId: "",
                });
              }}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              New Package
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">New Package</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl p-6 shadow-sm space-y-6"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Package Details */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Package Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Address
                </label>
                <input
                  type="text"
                  name="fromAddress"
                  value={form.fromAddress}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sender's full address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Address
                </label>
                <input
                  type="text"
                  name="toAddress"
                  value={form.toAddress}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Recipient's full address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                  required
                  min="0.1"
                  step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Front Office Region
                </label>
                <select
                  name="regionId"
                  value={form.regionId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select region (optional)</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Region
                </label>
                <select
                  name="destinationRegionId"
                  value={form.destinationRegionId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select destination region (optional)</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sale Details */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Sale Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  min="1"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Package"}
          </button>
        </form>
      </div>
    </div>
  );
}
