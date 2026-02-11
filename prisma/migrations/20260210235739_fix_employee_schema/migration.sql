/*
  Warnings:

  - You are about to drop the column `ownerUid` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `Machine` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Machine` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Calibration" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Carrier" ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "ownerUid";

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "accessLevel" TEXT NOT NULL DEFAULT 'operador',
ADD COLUMN     "hasAccess" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "EpiDelivery" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "InventoryMovement" ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Machine" DROP COLUMN "model",
DROP COLUMN "status",
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "ProductionOrder" ALTER COLUMN "status" SET DEFAULT 'Pendente',
ALTER COLUMN "priority" SET DEFAULT 'Média',
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "QualityInspection" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "RawMaterial" ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "SalaryPayment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "SaleQuote" ALTER COLUMN "status" SET DEFAULT 'Pendente',
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "TaxServicePayment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Vacation" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "WarehouseLocation" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "WorkAccident" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "data" SET DEFAULT '{}';

-- CreateIndex
CREATE INDEX "AttendanceRecord_companyId_idx" ON "AttendanceRecord"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX "BankTransaction_companyId_idx" ON "BankTransaction"("companyId");

-- CreateIndex
CREATE INDEX "Calibration_companyId_idx" ON "Calibration"("companyId");

-- CreateIndex
CREATE INDEX "Carrier_companyId_idx" ON "Carrier"("companyId");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE INDEX "Complaint_companyId_idx" ON "Complaint"("companyId");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "EpiDelivery_companyId_idx" ON "EpiDelivery"("companyId");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_idx" ON "InventoryMovement"("companyId");

-- CreateIndex
CREATE INDEX "Machine_companyId_idx" ON "Machine"("companyId");

-- CreateIndex
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- CreateIndex
CREATE INDEX "ProductionOrder_companyId_idx" ON "ProductionOrder"("companyId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_companyId_idx" ON "PurchaseRequest"("companyId");

-- CreateIndex
CREATE INDEX "QualityInspection_companyId_idx" ON "QualityInspection"("companyId");

-- CreateIndex
CREATE INDEX "RawMaterial_companyId_idx" ON "RawMaterial"("companyId");

-- CreateIndex
CREATE INDEX "SalaryPayment_companyId_idx" ON "SalaryPayment"("companyId");

-- CreateIndex
CREATE INDEX "Sale_companyId_idx" ON "Sale"("companyId");

-- CreateIndex
CREATE INDEX "SaleQuote_companyId_idx" ON "SaleQuote"("companyId");

-- CreateIndex
CREATE INDEX "Supplier_companyId_idx" ON "Supplier"("companyId");

-- CreateIndex
CREATE INDEX "TaxServicePayment_companyId_idx" ON "TaxServicePayment"("companyId");

-- CreateIndex
CREATE INDEX "Vacation_companyId_idx" ON "Vacation"("companyId");

-- CreateIndex
CREATE INDEX "WorkAccident_companyId_idx" ON "WorkAccident"("companyId");
