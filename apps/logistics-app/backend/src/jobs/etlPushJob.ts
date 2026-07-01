import prisma from "../lib/prisma";
import { retryFetch } from "../lib/retryFetch";

const JOB_NAME = "etl-push-job";
const APP1_RAW_UPDATES_URL = process.env.APP1_URL
  ? `${process.env.APP1_URL}/api/raw-updates`
  : "http://localhost:3001/api/raw-updates";

let isRunning = false;

export async function runEtlPushJob() {
  console.log(`[ETL] Starting push job at ${new Date().toISOString()}`);

  if (isRunning) {
    console.log("[ETL] Job already running, skipping this tick");
    return;
  }

  isRunning = true;

  try {
    const unsyncedRows = await prisma.$queryRaw<Array<{ trackingId: string }>>`
      SELECT "trackingId"
      FROM "Package"
      WHERE status IS DISTINCT FROM "lastSyncedStatus"
      ORDER BY "updatedAt" ASC
      LIMIT 200
    `;

    if (unsyncedRows.length === 0) {
      console.log("[ETL] No unsynced packages to push");
      return;
    }

    const trackingIds = unsyncedRows.map((r) => r.trackingId);

    const trulyUnsynced = await prisma.package.findMany({
      where: { trackingId: { in: trackingIds } },
      include: {
        statusUpdates: { orderBy: { createdAt: "desc" }, take: 1 },
        bag: { include: { delay: true, truck: { include: { delay: true } } } },
        region: true,
      },
    });

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(
      `[ETL] Found ${trulyUnsynced.length} unsynced packages — batch ${batchId}`,
    );

    const payload = trulyUnsynced.map((pkg) => ({
      trackingId: pkg.trackingId,
      status: pkg.status,
      currentLocation: pkg.currentLocation,
      bagCode: pkg.bag?.code || null,
      regionCode: pkg.region?.code || null,
      lastNote: pkg.statusUpdates[0]?.note || null,
      delayReason:
        pkg.status === "DELAYED"
          ? pkg.bag?.delay?.reason || pkg.bag?.truck?.delay?.reason || null
          : null,
      updatedAt: pkg.updatedAt.toISOString(),
    }));

    await retryFetch(
      APP1_RAW_UPDATES_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.INTER_SERVICE_API_KEY || "",
        },
        body: JSON.stringify({ batchId, updates: payload }),
      },
      {
        maxRetries: 4,
        initialDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(
            `[ETL] Push attempt ${attempt} failed, retrying...`,
            error instanceof Error ? error.message : error,
          );
        },
      },
    );

    console.log(
      `[ETL] Successfully pushed batch ${batchId} (${payload.length} packages)`,
    );
  } catch (error) {
    // Log but don't crash — job will retry on next run
    console.error(
      "[ETL] Job failed after all retries:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    isRunning = false; // always release lock even if job fails
  }
}
