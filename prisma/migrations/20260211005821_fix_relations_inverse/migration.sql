/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `WarehouseLocation` table. All the data in the column will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `data` on table `AttendanceRecord` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `BankTransaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Calibration` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Carrier` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Complaint` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `EpiDelivery` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `InventoryMovement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Machine` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `ProductionOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `PurchaseRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `QualityInspection` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `RawMaterial` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `SalaryPayment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Sale` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `SaleQuote` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Supplier` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `TaxServicePayment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `Vacation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `WarehouseLocation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `data` on table `WorkAccident` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_companyId_fkey";

-- DropIndex
DROP INDEX "AttendanceRecord_companyId_idx";

-- DropIndex
DROP INDEX "AuditLog_companyId_idx";

-- DropIndex
DROP INDEX "BankTransaction_companyId_idx";

-- DropIndex
DROP INDEX "Calibration_companyId_idx";

-- DropIndex
DROP INDEX "Carrier_companyId_idx";

-- DropIndex
DROP INDEX "Complaint_companyId_idx";

-- DropIndex
DROP INDEX "Employee_companyId_idx";

-- DropIndex
DROP INDEX "EpiDelivery_companyId_idx";

-- DropIndex
DROP INDEX "InventoryMovement_companyId_idx";

-- DropIndex
DROP INDEX "Machine_companyId_idx";

-- DropIndex
DROP INDEX "Product_companyId_idx";

-- DropIndex
DROP INDEX "ProductionOrder_companyId_idx";

-- DropIndex
DROP INDEX "PurchaseRequest_companyId_idx";

-- DropIndex
DROP INDEX "QualityInspection_companyId_idx";

-- DropIndex
DROP INDEX "RawMaterial_companyId_idx";

-- DropIndex
DROP INDEX "SalaryPayment_companyId_idx";

-- DropIndex
DROP INDEX "Sale_companyId_idx";

-- DropIndex
DROP INDEX "SaleQuote_companyId_idx";

-- DropIndex
DROP INDEX "Supplier_companyId_idx";

-- DropIndex
DROP INDEX "TaxServicePayment_companyId_idx";

-- DropIndex
DROP INDEX "Vacation_companyId_idx";

-- DropIndex
DROP INDEX "WorkAccident_companyId_idx";

-- AlterTable
ALTER TABLE "AttendanceRecord" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "BankTransaction" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Calibration" ALTER COLUMN "status" SET DEFAULT 'Pendente',
ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Carrier" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "data" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Complaint" ALTER COLUMN "status" SET DEFAULT 'Aberta',
ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "EpiDelivery" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "InventoryMovement" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "model" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Operativa',
ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "roles" SET DEFAULT ARRAY['operator']::TEXT[];

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductionOrder" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseRequest" ALTER COLUMN "data" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'Pendente';

-- AlterTable
ALTER TABLE "QualityInspection" ALTER COLUMN "status" SET DEFAULT 'Agendada',
ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "RawMaterial" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "SalaryPayment" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "SaleQuote" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "TaxServicePayment" ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "Vacation" ALTER COLUMN "status" SET DEFAULT 'Agendada',
ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "WarehouseLocation" DROP COLUMN "updatedAt",
ALTER COLUMN "data" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkAccident" ALTER COLUMN "data" SET NOT NULL;

-- DropTable
DROP TABLE "Client";
