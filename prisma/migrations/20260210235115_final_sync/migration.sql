/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `AttendanceRecord` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `BankTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `EpiDelivery` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PurchaseRequest` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SalaryPayment` table. All the data in the column will be lost.
  - You are about to drop the column `cnpj` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TaxServicePayment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Vacation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `WorkAccident` table. All the data in the column will be lost.
  - Added the required column `role` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AttendanceRecord" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "BankTransaction" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Carrier" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "ownerUid" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "role" TEXT NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "EpiDelivery" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Machine" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProductionOrder" ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "priority" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PurchaseRequest" DROP COLUMN "updatedAt",
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RawMaterial" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SalaryPayment" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "SaleQuote" ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "cnpj",
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TaxServicePayment" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Vacation" DROP COLUMN "updatedAt",
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkAccident" DROP COLUMN "updatedAt";

-- CreateTable
CREATE TABLE "QualityInspection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "productName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numeroReclamacao" TEXT NOT NULL,
    "relacionadoNome" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calibration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instrumentName" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "nextCalibrationDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calibration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
