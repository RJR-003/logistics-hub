import prisma from "../lib/prisma";
import { retryFetch } from "../lib/retryFetch";

let isRunning = false;

const APP2_CONFIRM_URL = process.env.APP2_URL
  ? `${process.env.APP2_URL}/api/etl/confirm`
  : "http://localhost:3002/api/etl/confirm";

// Shape of each update inside the payload
interface PackageUpdate {
  trackingId: string;
  status: string;
  currentLocation: string | null;
  bagCode: string | null;
  regionCode: string | null;
  lastNote: string | null;
  delayReason: string | null;
  updatedAt: string;
}

export async function runRawUpdateProcessor() {
  if (isRunning) {
    console.log("[Processor] Already running, skipping this tick");
    return;
  }

  isRunning = true;

  try {
    // Find all unprocessed raw updates oldest first
    const unprocessed = await prisma.rawUpdate.findMany({
      where: { processed: false },
      orderBy: { createdAt: "asc" },
    });

    if (unprocessed.length === 0) {
      return;
    }

    console.log(`[Processor] Found ${unprocessed.length} unprocessed batches`);

    for (const rawUpdate of unprocessed) {
      const successfulUpdates: { trackingId: string; status: string }[] = [];

      try {
        const updates = rawUpdate.payload as unknown as
          | {
              batchId?: string;
              updates?: PackageUpdate[];
            }
          | PackageUpdate[];

        const batchId = Array.isArray(updates) ? null : updates.batchId || null;
        const updateList = Array.isArray(updates)
          ? updates
          : updates.updates || [];

        // Process each update in the batch
        for (const update of updateList) {
          console.log(
            `[Processor] Processing update for trackingId: ${update.trackingId}, status: ${update.status}`,
          );
          // Find the package in App 1's database by tracking ID
          const pkg = await prisma.package.findUnique({
            where: { trackingId: update.trackingId },
          });
          console.log(
            `[Processor] Found package. Current status: ${pkg!.status}, incoming status: ${update.status}`,
          );
          if (!pkg) {
            console.warn(`[Processor] Package not found: ${update.trackingId}`);
            continue; // skip this one, process the rest
          }

          const locationChanged =
            pkg.currentLocation !== update.currentLocation;
          const statusChanged = pkg.status !== update.status;

          if (!statusChanged && !locationChanged) {
            console.log(
              `[Processor] Skipping ${update.trackingId} — status and location unchanged`,
            );
            //still confirming it
            successfulUpdates.push({
              trackingId: update.trackingId,
              status: update.status,
            });
            continue;
          }

          // Update the package in App 1's database
          await prisma.package.update({
            where: { trackingId: update.trackingId },
            data: {
              status: update.status,
              ...(update.currentLocation !== null && {
                currentLocation: update.currentLocation,
              }),
              ...(update.delayReason !== null && {
                delayReason: update.delayReason,
              }),
            },
          });

          console.log(
            `[Processor] Updated ${update.trackingId} → ${update.status}`,
          );
          successfulUpdates.push({
            trackingId: update.trackingId,
            status: update.status,
          });
        }

        // Mark this raw update as processed
        await prisma.rawUpdate.update({
          where: { id: rawUpdate.id },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        });

        console.log(`[Processor] Batch ${rawUpdate.id} processed successfully`);
        // Confirm back to App 2 — only after this batch is marked processed
        if (successfulUpdates.length > 0) {
          try {
            await retryFetch(
              APP2_CONFIRM_URL,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-API-Key": process.env.INTER_SERVICE_API_KEY || "",
                },
                body: JSON.stringify({
                  batchId: batchId || rawUpdate.id,
                  confirmations: successfulUpdates,
                }),
              },
              {
                maxRetries: 4,
                initialDelayMs: 1000,
                onRetry: (attempt, error) => {
                  console.warn(
                    `[Processor] Confirm callback attempt ${attempt} failed, retrying...`,
                    error instanceof Error ? error.message : error,
                  );
                },
              },
            );
            console.log(
              `[Processor] Confirmed ${successfulUpdates.length} updates back to App 2`,
            );
          } catch (confirmError) {
            // If confirmation fails after all retries, App 2 will simply
            // re-push these packages on its next ETL run — safe, just
            // means one extra redundant push, not data loss
            console.error(
              "[Processor] Failed to confirm batch back to App 2 after retries:",
              confirmError instanceof Error
                ? confirmError.message
                : confirmError,
            );
          }
        }
      } catch (batchError) {
        // Mark this batch as failed with the error reason
        // Don't delete it — keep it for debugging and retry
        await prisma.rawUpdate.update({
          where: { id: rawUpdate.id },
          data: {
            error:
              batchError instanceof Error
                ? batchError.message
                : "Unknown error",
          },
        });

        console.error(`[Processor] Batch ${rawUpdate.id} failed:`, batchError);
      }
    }
  } catch (error) {
    console.error("[Processor] Processor failed:", error);
  } finally {
    isRunning = false;
  }
}
