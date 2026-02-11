/*
  Warnings:

  - You are about to drop the column `accessLevel` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `hasAccess` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `published` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `RawMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `orcamentoNumber` on the `SaleQuote` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `WarehouseLocation` table. All the data in the column will be lost.
  - You are about to drop the `Calibration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Complaint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HrExtra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QualityInspection` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `BankTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Carrier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ProductionOrder` table without a default value. This is not possible if the table is not empty.
  - Made the column `client` on table `ProductionOrder` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `numeroSolicitacao` to the `PurchaseRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `solicitanteNome` to the `PurchaseRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PurchaseRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RawMaterial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SalaryPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orcamentoNumero` to the `SaleQuote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SaleQuote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TaxServicePayment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Calibration" DROP CONSTRAINT "Calibration_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_companyId_fkey";

-- DropForeignKey
ALTER TABLE "HrExtra" DROP CONSTRAINT "HrExtra_companyId_fkey";

-- DropForeignKey
ALTER TABLE "QualityInspection" DROP CONSTRAINT "QualityInspection_companyId_fkey";

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Carrier" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "accessLevel",
DROP COLUMN "hasAccess",
DROP COLUMN "role",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "published",
DROP COLUMN "sku",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "client" SET NOT NULL,
ALTER COLUMN "priority" SET DEFAULT 'Média';

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "numeroSolicitacao" TEXT NOT NULL,
ADD COLUMN     "solicitanteNome" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Pendente',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "RawMaterial" DROP COLUMN "sku",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SalaryPayment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SaleQuote" DROP COLUMN "orcamentoNumber",
ADD COLUMN     "orcamentoNumero" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "TaxServicePayment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WarehouseLocation" DROP COLUMN "createdAt";

-- DropTable
DROP TABLE "Calibration";

-- DropTable
DROP TABLE "Complaint";

-- DropTable
DROP TABLE "HrExtra";

-- DropTable
DROP TABLE "QualityInspection";

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT,
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Agendada',
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpiDelivery" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpiDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkAccident" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "accidentDate" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL,
    "data" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkAccident_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacation" ADD CONSTRAINT "Vacation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpiDelivery" ADD CONSTRAINT "EpiDelivery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkAccident" ADD CONSTRAINT "WorkAccident_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
