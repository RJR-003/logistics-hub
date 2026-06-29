"use client";

import { useState, useCallback } from "react";
import { trackPackage, Package } from "../libs/api";
import StatusBadge from "../components/StatusBadge";
import Link from "next/link";

// Generate a simple math captcha
function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10);
  const num2 = Math.floor(Math.random() * 10);
  return { num1, num2, answer: num1 + num2 };
}

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Package | null>(null);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer("");
  }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate captcha
    if (parseInt(captchaAnswer) !== captcha.answer) {
      setError("Incorrect answer. Please try again.");
      refreshCaptcha();
      return;
    }

    if (!trackingId.trim()) {
      setError("Please enter a tracking ID.");
      return;
    }

    setLoading(true);
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
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start pt-20 px-4">
      {/* Header */}
      <div className="w-full absolute top-0 left-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Home
          </Link>
          <Link
            href="/dashboard"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Staff Dashboard
          </Link>
        </div>
      </div>
      <div className="flex flex-col items-center justify-start pt-16 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Track Your Package
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Enter your tracking ID to see the current status
          </p>
        </div>

        {/* Search form */}
        <form
          onSubmit={handleTrack}
          className=" w-full max-w-2xl flex flex-col gap-2 mb-8"
        >
          <input
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Enter your tracking ID"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Captcha */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600 font-medium">
              Security check — please answer:
            </p>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-800">
                {captcha.num1} + {captcha.num2} = ?
              </span>
              <input
                type="number"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Answer"
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={refreshCaptcha}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                New question
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Searching..." : "Track"}
          </button>
        </form>

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
                <span
                  title={result.trackingId}
                  className="font-mono text-gray-900 text-xs"
                >
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
              {result.region && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Origin Region</span>
                  <span className="text-gray-900">
                    {result.region.name}
                    <span className="ml-1 text-xs text-gray-400">
                      ({result.region.code})
                    </span>
                  </span>
                </div>
              )}
              {result.destinationRegion && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Destination Region</span>
                  <span className="text-gray-900">
                    {result.destinationRegion.name}
                    <span className="ml-1 text-xs text-gray-400">
                      ({result.destinationRegion.code})
                    </span>
                  </span>
                </div>
              )}
              {result.currentLocation && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current Location</span>
                  <span className="text-gray-900">
                    {result.currentLocation}
                  </span>
                </div>
              )}
            </div>

            {result.delayReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800">Delay Notice</p>
                <p className="text-sm text-red-600 mt-1">
                  {result.delayReason}
                </p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400">
                Last updated:{" "}
                {new Date(result.updatedAt).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
