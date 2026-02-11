/*
  Warnings:

  - Added the required column `updatedAt` to the `WarehouseLocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AttendanceRecord" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BankTransaction" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Calibration" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Carrier" ADD COLUMN     "cnpj" TEXT,
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "data" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Complaint" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EpiDelivery" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InventoryMovement" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "lastMaintenance" TIMESTAMP(3),
ADD COLUMN     "nextMaintenance" TIMESTAMP(3),
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sku" TEXT,
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductionOrder" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PurchaseRequest" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "QualityInspection" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RawMaterial" ADD COLUMN     "sku" TEXT,
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SalaryPayment" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SaleQuote" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "cnpj" TEXT,
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TaxServicePayment" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vacation" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WarehouseLocation" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkAccident" ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE INDEX "Client_companyId_deletedAt_idx" ON "Client"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_companyId_idx" ON "AttendanceRecord"("companyId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_employeeId_idx" ON "AttendanceRecord"("employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "BankTransaction_companyId_idx" ON "BankTransaction"("companyId");

-- CreateIndex
CREATE INDEX "Calibration_companyId_idx" ON "Calibration"("companyId");

-- CreateIndex
CREATE INDEX "Carrier_companyId_idx" ON "Carrier"("companyId");

-- CreateIndex
CREATE INDEX "Complaint_companyId_idx" ON "Complaint"("companyId");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "EpiDelivery_companyId_idx" ON "EpiDelivery"("companyId");

-- CreateIndex
CREATE INDEX "EpiDelivery_employeeId_idx" ON "EpiDelivery"("employeeId");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_idx" ON "InventoryMovement"("companyId");

-- CreateIndex
CREATE INDEX "Machine_companyId_idx" ON "Machine"("companyId");

-- CreateIndex
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "ProductionOrder_companyId_idx" ON "ProductionOrder"("companyId");

-- CreateIndex
CREATE INDEX "ProductionOrder_orderNumber_idx" ON "ProductionOrder"("orderNumber");

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
CREATE INDEX "SaleQuote_orcamentoNumero_idx" ON "SaleQuote"("orcamentoNumero");

-- CreateIndex
CREATE INDEX "Supplier_companyId_idx" ON "Supplier"("companyId");

-- CreateIndex
CREATE INDEX "TaxServicePayment_companyId_idx" ON "TaxServicePayment"("companyId");

-- CreateIndex
CREATE INDEX "Vacation_companyId_idx" ON "Vacation"("companyId");

-- CreateIndex
CREATE INDEX "Vacation_employeeId_idx" ON "Vacation"("employeeId");

-- CreateIndex
CREATE INDEX "WarehouseLocation_companyId_idx" ON "WarehouseLocation"("companyId");

-- CreateIndex
CREATE INDEX "WorkAccident_companyId_idx" ON "WorkAccident"("companyId");

-- CreateIndex
CREATE INDEX "WorkAccident_employeeId_idx" ON "WorkAccident"("employeeId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
