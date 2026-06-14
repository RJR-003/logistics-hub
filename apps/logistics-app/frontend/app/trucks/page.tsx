"use client";

import { useState, useEffect } from "react";
import {
  getAllTrucks,
  getAllBags,
  getAllRegions,
  createTruck,
  loadBagOntoTruck,
  Truck,
  Bag,
  Region,
} from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create truck form
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newRegionId, setNewRegionId] = useState("");
  const [newDeparture, setNewDeparture] = useState("");
  const [creating, setCreating] = useState(false);

  // Load bag form
  const [loadingBag, setLoadingBag] = useState<Truck | null>(null);
  const [selectedBagId, setSelectedBagId] = useState("");
  const [loadingBagAction, setLoadingBagAction] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [t, b, r] = await Promise.all([
        getAllTrucks(),
        getAllBags(),
        getAllRegions(),
      ]);
      setTrucks(t);
      setBags(
        b.filter((bag) => bag.status === "OPEN" || bag.status === "SEALED"),
      );
      setRegions(r);
      if (r.length > 0) setNewRegionId(r[0].id);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCode || !newRegionId || !newDeparture) return;
    setCreating(true);
    setError(null);
    try {
      await createTruck({
        code: newCode,
        regionId: newRegionId,
        scheduledDeparture: new Date(newDeparture).toISOString(),
      });
      setSuccess("Truck created successfully");
      setNewCode("");
      setNewDeparture("");
      setShowCreate(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create truck");
    } finally {
      setCreating(false);
    }
  }

  async function handleLoadBag() {
    if (!loadingBag || !selectedBagId) return;
    setLoadingBagAction(true);
    setError(null);
    try {
      await loadBagOntoTruck({ bagId: selectedBagId, truckId: loadingBag.id });
      setSuccess("Bag loaded onto truck successfully");
      setLoadingBag(null);
      setSelectedBagId("");
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bag");
    } finally {
      setLoadingBagAction(false);
    }
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trucks</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
        >
          + New Truck
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

      {/* Create truck form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-medium text-gray-800">Create New Truck</h2>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Truck code e.g. TRUCK-001"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <select
              value={newRegionId}
              onChange={(e) => setNewRegionId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={newDeparture}
              onChange={(e) => setNewDeparture(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newCode || !newDeparture}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Truck"}
          </button>
        </div>
      )}

      {/* Load bag panel */}
      {loadingBag && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">
            Loading bag onto truck: {loadingBag.code}
          </p>
          <div className="flex gap-3">
            <select
              value={selectedBagId}
              onChange={(e) => setSelectedBagId(e.target.value)}
              className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select a bag...</option>
              {bags.map((bag) => (
                <option key={bag.id} value={bag.id}>
                  {bag.code} — {bag.direction} ({bag.packages?.length || 0}{" "}
                  packages)
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadBag}
              disabled={loadingBagAction || !selectedBagId}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingBagAction ? "Loading..." : "Load Bag"}
            </button>
            <button
              onClick={() => setLoadingBag(null)}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Trucks list */}
      <div className="space-y-3">
        {trucks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <EmptyState message="No trucks found. Create one to get started." />
          </div>
        ) : (
          trucks.map((truck) => (
            <div
              key={truck.id}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800">
                      {truck.code}
                    </span>
                    <StatusBadge status={truck.status} />
                  </div>
                  <p className="text-xs text-gray-400">
                    Departure:{" "}
                    {new Date(truck.scheduledDeparture).toLocaleString("en-IN")}{" "}
                    ·{truck.bags?.length || 0} bags loaded
                  </p>
                  {truck.delay && (
                    <p className="text-xs text-red-500">
                      Delayed: {truck.delay.reason}
                    </p>
                  )}
                </div>
                {truck.status !== "DELAYED" && truck.status !== "DEPARTED" && (
                  <button
                    onClick={() => {
                      setLoadingBag(truck);
                      setSuccess(null);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Load a Bag
                  </button>
                )}
              </div>

              {/* Bags on this truck */}
              {truck.bags && truck.bags.length > 0 && (
                <div className="border-t border-gray-100 pt-3 space-y-1">
                  {truck.bags.map((bag) => (
                    <div
                      key={bag.id}
                      className="flex items-center justify-between text-xs text-gray-500"
                    >
                      <span>
                        {bag.code} — {bag.direction}
                      </span>
                      <span>{bag.packages?.length || 0} packages</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
