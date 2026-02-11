/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `BankTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Carrier` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `InventoryMovement` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ProductionOrder` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `RawMaterial` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SalaryPayment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TaxServicePayment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `WarehouseLocation` table. All the data in the column will be lost.
  - You are about to drop the `Machine` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `accessLevel` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Machine" DROP CONSTRAINT "Machine_companyId_fkey";

-- DropIndex
DROP INDEX "AuditLog_companyId_idx";

-- DropIndex
DROP INDEX "BankTransaction_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "BankTransaction_companyId_idx";

-- DropIndex
DROP INDEX "Carrier_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "Carrier_companyId_idx";

-- DropIndex
DROP INDEX "Client_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "Client_companyId_idx";

-- DropIndex
DROP INDEX "Employee_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "Employee_companyId_idx";

-- DropIndex
DROP INDEX "InventoryMovement_companyId_idx";

-- DropIndex
DROP INDEX "Product_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "Product_companyId_idx";

-- DropIndex
DROP INDEX "ProductionOrder_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "ProductionOrder_companyId_idx";

-- DropIndex
DROP INDEX "RawMaterial_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "RawMaterial_companyId_idx";

-- DropIndex
DROP INDEX "SalaryPayment_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "SalaryPayment_companyId_idx";

-- DropIndex
DROP INDEX "Sale_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "Sale_companyId_idx";

-- DropIndex
DROP INDEX "Supplier_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "Supplier_companyId_idx";

-- DropIndex
DROP INDEX "TaxServicePayment_companyId_deletedAt_idx";

-- DropIndex
DROP INDEX "TaxServicePayment_companyId_idx";

-- DropIndex
DROP INDEX "WarehouseLocation_companyId_idx";

-- AlterTable
ALTER TABLE "BankTransaction" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Carrier" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "updatedAt",
ADD COLUMN     "accessLevel" TEXT NOT NULL,
ADD COLUMN     "hasAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InventoryMovement" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "updatedAt",
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductionOrder" DROP COLUMN "updatedAt",
ALTER COLUMN "client" DROP NOT NULL,
ALTER COLUMN "priority" SET DEFAULT 'Normal';

-- AlterTable
ALTER TABLE "RawMaterial" DROP COLUMN "updatedAt",
ADD COLUMN     "sku" TEXT;

-- AlterTable
ALTER TABLE "SalaryPayment" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "updatedAt",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cnpj" TEXT;

-- AlterTable
ALTER TABLE "TaxServicePayment" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WarehouseLocation" DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "Machine";

-- CreateTable
CREATE TABLE "SaleQuote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orcamentoNumber" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SaleQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityInspection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "productName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Agendada',
    "result" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numeroReclamacao" TEXT NOT NULL,
    "relacionadoNome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calibration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instrumentName" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "nextCalibrationDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Calibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrExtra" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HrExtra_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SaleQuote" ADD CONSTRAINT "SaleQuote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrExtra" ADD CONSTRAINT "HrExtra_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
