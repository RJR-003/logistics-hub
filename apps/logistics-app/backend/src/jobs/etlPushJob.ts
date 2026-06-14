import prisma from "../lib/prisma";

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
    // Step 1 — Get or create the last sync record
    let lastSync = await prisma.lastSync.findUnique({
      where: { jobName: JOB_NAME },
    });

    if (!lastSync) {
      // First time running — create the record
      // Use a date far in the past so all packages are picked up
      lastSync = await prisma.lastSync.create({
        data: {
          jobName: JOB_NAME,
          lastRunAt: new Date("2000-01-01"),
        },
      });
      console.log("[ETL] First run — syncing all packages");
    }

    const lastRunAt = lastSync.lastRunAt;
    console.log(
      `[ETL] Fetching packages updated since ${lastRunAt.toISOString()}`,
    );

    // Step 2 — Extract: find all packages updated since last run
    const updatedPackages = await prisma.package.findMany({
      where: {
        updatedAt: { gt: lastRunAt },
      },
      include: {
        statusUpdates: {
          orderBy: { createdAt: "desc" },
          take: 1, // only the latest status update
        },
        bag: true,
        region: true,
      },
    });

    if (updatedPackages.length === 0) {
      console.log("[ETL] No updates to push");
      // Still update lastRunAt so next run has correct window
      await prisma.lastSync.update({
        where: { jobName: JOB_NAME },
        data: { lastRunAt: new Date() },
      });
      return;
    }

    console.log(`[ETL] Found ${updatedPackages.length} packages to push`);

    // Step 3 — Transform: shape the data into what App 1 expects
    const payload = updatedPackages.map((pkg) => ({
      trackingId: pkg.trackingId,
      status: pkg.status,
      currentLocation: pkg.currentLocation,
      bagCode: pkg.bag?.code || null,
      regionCode: pkg.region?.code || null,
      lastNote: pkg.statusUpdates[0]?.note || null,
      updatedAt: pkg.updatedAt.toISOString(),
    }));

    // Step 4 — Load: push to App 1's raw updates endpoint
    const response = await fetch(APP1_RAW_UPDATES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: payload }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`App 1 rejected the payload: ${error}`);
    }

    // Step 5 — Update last sync timestamp
    await prisma.lastSync.update({
      where: { jobName: JOB_NAME },
      data: { lastRunAt: new Date() },
    });

    console.log(`[ETL] Successfully pushed ${payload.length} updates to App 1`);
  } catch (error) {
    // Log but don't crash — job will retry on next run
    console.error("[ETL] Job failed:", error);
  } finally {
    isRunning = false; // always release lock even if job fails
  }
}
