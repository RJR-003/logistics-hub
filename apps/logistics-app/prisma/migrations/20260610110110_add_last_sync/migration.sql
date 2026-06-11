-- CreateTable
CREATE TABLE "LastSync" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LastSync_jobName_key" ON "LastSync"("jobName");
