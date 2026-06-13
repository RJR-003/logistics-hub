import prisma from "../lib/prisma";

let isRunning = false;

// Shape of each update inside the payload
interface PackageUpdate {
  trackingId: string;
  status: string;
  currentLocation: string | null;
  bagCode: string | null;
  regionCode: string | null;
  lastNote: string | null;
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
      try {
        const updates = rawUpdate.payload as unknown as PackageUpdate[];

        // Process each update in the batch
        for (const update of updates) {
          // Find the package in App 1's database by tracking ID
          const pkg = await prisma.package.findUnique({
            where: { trackingId: update.trackingId },
          });

          if (!pkg) {
            console.warn(`[Processor] Package not found: ${update.trackingId}`);
            continue; // skip this one, process the rest
          }

          // Only update if App 2's update is newer than what we have
          const app2UpdatedAt = new Date(update.updatedAt);
          if (app2UpdatedAt <= pkg.updatedAt) {
            console.log(
              `[Processor] Skipping ${update.trackingId} — already up to date`,
            );
            continue;
          }

          // Update the package in App 1's database
          await prisma.package.update({
            where: { trackingId: update.trackingId },
            data: {
              status: update.status,
              currentLocation: update.currentLocation,
            },
          });

          console.log(
            `[Processor] Updated ${update.trackingId} → ${update.status}`,
          );
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
