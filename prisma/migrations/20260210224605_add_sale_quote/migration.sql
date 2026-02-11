-- CreateTable
CREATE TABLE "SaleQuote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orcamentoNumero" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SaleQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleQuote_companyId_idx" ON "SaleQuote"("companyId");

-- CreateIndex
CREATE INDEX "SaleQuote_companyId_deletedAt_idx" ON "SaleQuote"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "SaleQuote_orcamentoNumero_idx" ON "SaleQuote"("orcamentoNumero");

-- AddForeignKey
ALTER TABLE "SaleQuote" ADD CONSTRAINT "SaleQuote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
