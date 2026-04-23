-- CreateTable: expeditions (Expedição / Saída de Produto + Packing)
CREATE TABLE IF NOT EXISTS "expeditions" (
    "id"                       TEXT NOT NULL,
    "companyId"                TEXT NOT NULL,
    "pedidoRef"                TEXT,
    "pedidoId"                 TEXT,
    "clienteNome"              TEXT NOT NULL,
    "dataExpedicao"            TIMESTAMP(3) NOT NULL,
    "status"                   TEXT NOT NULL DEFAULT 'Pendente',
    "tipoEnvio"                TEXT NOT NULL,
    "transportadoraNome"       TEXT,
    "numeroGuia"               TEXT,
    "modalidadeFrete"          TEXT,
    "placaVeiculo"             TEXT,
    "observacoes"              TEXT,
    "tipoDocumentoFiscal"      TEXT,
    "nfeNumero"                TEXT,
    "nfeStatus"                TEXT,
    "items"                    JSONB NOT NULL DEFAULT '[]'::jsonb,
    "bultos"                   JSONB NOT NULL DEFAULT '[]'::jsonb,
    "historico"                JSONB NOT NULL DEFAULT '[]'::jsonb,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL,
    "deletedAt"                TIMESTAMP(3),
    "createdBy"                TEXT,

    CONSTRAINT "Expedition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Expedition_companyId_idx"
  ON "expeditions"("companyId");

CREATE INDEX IF NOT EXISTS "Expedition_companyId_deletedAt_idx"
  ON "expeditions"("companyId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Expedition_companyId_status_idx"
  ON "expeditions"("companyId", "status");

CREATE INDEX IF NOT EXISTS "Expedition_companyId_dataExpedicao_idx"
  ON "expeditions"("companyId", "dataExpedicao");

CREATE INDEX IF NOT EXISTS "Expedition_pedidoId_idx"
  ON "expeditions"("pedidoId");
