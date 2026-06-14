"use client";

import { useState, useEffect } from "react";
import { getAllBags, createBag, delayBag, Bag } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";

const DIRECTIONS = ["NORTH", "SOUTH", "EAST", "WEST"];

export default function BagsPage() {
  const [bags, setBags] = useState<Bag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create bag form
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDirection, setNewDirection] = useState("NORTH");
  const [creating, setCreating] = useState(false);

  // Delay form
  const [delayingBag, setDelayingBag] = useState<Bag | null>(null);
  const [delayReason, setDelayReason] = useState("");
  const [delaying, setDelaying] = useState(false);

  useEffect(() => {
    fetchBags();
  }, []);

  async function fetchBags() {
    try {
      const data = await getAllBags();
      setBags(data);
    } catch {
      setError("Failed to load bags");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCode || !newDirection) return;
    setCreating(true);
    setError(null);
    try {
      await createBag({ code: newCode, direction: newDirection });
      setSuccess("Bag created successfully");
      setNewCode("");
      setShowCreate(false);
      fetchBags();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create bag");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelay() {
    if (!delayingBag || !delayReason) return;
    setDelaying(true);
    setError(null);
    try {
      await delayBag({ bagId: delayingBag.id, reason: delayReason });
      setSuccess(`Bag ${delayingBag.code} marked as delayed`);
      setDelayingBag(null);
      setDelayReason("");
      fetchBags();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delay bag");
    } finally {
      setDelaying(false);
    }
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bags</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          + New Bag
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Create bag form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-medium text-gray-800">Create New Bag</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Bag code e.g. BAG-NORTH-001"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <select
              value={newDirection}
              onChange={(e) => setNewDirection(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={creating || !newCode}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Delay form */}
      {delayingBag && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">
            Marking bag {delayingBag.code} as delayed
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Reason for delay..."
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              className="flex-1 border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              onClick={handleDelay}
              disabled={delaying || !delayReason}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {delaying ? "Marking..." : "Mark Delayed"}
            </button>
            <button
              onClick={() => setDelayingBag(null)}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bags list */}
      <div className="space-y-3">
        {bags.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <EmptyState message="No bags found. Create one to get started." />
          </div>
        ) : (
          bags.map((bag) => (
            <div
              key={bag.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800">
                      {bag.code}
                    </span>
                    <StatusBadge status={bag.status} />
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {bag.direction}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {bag.packages?.length || 0} packages · Truck:{" "}
                    {bag.truck?.code || "Not loaded"}
                  </p>
                  {bag.delay && (
                    <p className="text-xs text-red-500">
                      Delayed: {bag.delay.reason}
                    </p>
                  )}
                </div>
                {bag.status === "OPEN" && (
                  <button
                    onClick={() => {
                      setDelayingBag(bag);
                      setSuccess(null);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Mark Delayed
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
