-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'ADMIN';

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tenantId" TEXT,
    "memberId" TEXT,
    "memberName" TEXT,
    "memberCode" TEXT,
    "method" TEXT NOT NULL DEFAULT 'QR',
    "result" TEXT NOT NULL DEFAULT 'GRANTED',
    "confidence" DOUBLE PRECISION,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "note" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_logs_branchId_checkedAt_idx" ON "attendance_logs"("branchId", "checkedAt");

-- CreateIndex
CREATE INDEX "attendance_logs_memberId_checkedAt_idx" ON "attendance_logs"("memberId", "checkedAt");
