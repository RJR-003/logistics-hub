"use client";

import { useState } from "react";
import { trackPackage, Package } from "../libs/api";
import StatusBadge from "../components/StatusBadge";

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Package | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const pkg = await trackPackage(trackingId.trim());
      setResult(pkg);
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start pt-20 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Track Your Package</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Enter your tracking ID to see the current status
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleTrack} className="w-full max-w-lg flex gap-2 mb-8">
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Enter your tracking ID"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Searching..." : "Track"}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="w-full max-w-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Package Status</h2>
            <StatusBadge status={result.status} />
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tracking ID</span>
              <span className="font-mono text-gray-900 text-xs">
                {result.trackingId}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">From</span>
              <span className="text-gray-900">{result.fromAddress}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">To</span>
              <span className="text-gray-900">{result.toAddress}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Weight</span>
              <span className="text-gray-900">{result.weight} kg</span>
            </div>
            {result.currentLocation && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Location</span>
                <span className="text-gray-900">{result.currentLocation}</span>
              </div>
            )}
          </div>

          {result.delayReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800">Delay Notice</p>
              <p className="text-sm text-red-600 mt-1">{result.delayReason}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400">
              Last updated: {new Date(result.updatedAt).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
