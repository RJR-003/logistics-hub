-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncedStatus" TEXT;
