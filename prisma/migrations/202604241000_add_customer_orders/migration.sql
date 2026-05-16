-- CreateTable: customer_orders (Orden de Pedido — pedido del cliente; los items faltantes se convierten en ordenes de produccion o de compra)
CREATE TABLE IF NOT EXISTS "customer_orders" (
    "id"          TEXT NOT NULL,
    "companyId"   TEXT NOT NULL,
    "data"        JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "deletedAt"   TIMESTAMP(3),

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerOrder_companyId_idx"
  ON "customer_orders"("companyId");

CREATE INDEX IF NOT EXISTS "CustomerOrder_companyId_deletedAt_idx"
  ON "customer_orders"("companyId", "deletedAt");
