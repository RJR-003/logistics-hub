-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "destinationRegionId" TEXT;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_destinationRegionId_fkey" FOREIGN KEY ("destinationRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
