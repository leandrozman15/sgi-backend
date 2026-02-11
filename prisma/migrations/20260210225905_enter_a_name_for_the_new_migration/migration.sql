/*
  Warnings:

  - You are about to drop the `SaleQuote` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SaleQuote" DROP CONSTRAINT "SaleQuote_companyId_fkey";

-- DropTable
DROP TABLE "SaleQuote";

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "ProductionOrder_orderNumber_idx" ON "ProductionOrder"("orderNumber");
