-- CreateTable: recepcoes (Recepção de Mercadorias / NF-e Entrada)
CREATE TABLE IF NOT EXISTS "recepcoes" (
    "id"                  TEXT NOT NULL,
    "companyId"           TEXT NOT NULL,
    "fornecedorId"        TEXT NOT NULL,
    "fornecedorNome"      TEXT NOT NULL,
    "ordemCompraId"       TEXT,
    "ordemCompraNumero"   TEXT,
    "tipoDocumento"       TEXT NOT NULL DEFAULT 'NF',
    "numeroDocumento"     TEXT NOT NULL,
    "chaveAcesso"         TEXT,
    "dataEmissao"         TIMESTAMP(3) NOT NULL,
    "dataVencimento"      TIMESTAMP(3),
    "moeda"               TEXT NOT NULL DEFAULT 'BRL',
    "transportadoraId"    TEXT,
    "transportadoraNome"  TEXT,
    "modalidadeFrete"     TEXT,
    "valorProdutos"       DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorDesconto"       DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorFrete"          DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorSeguro"         DECIMAL(14,2) NOT NULL DEFAULT 0,
    "outrasDespesas"      DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorImpostos"       DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorTotalNF"        DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status"              TEXT NOT NULL DEFAULT 'Pendente',
    "observacoes"         TEXT,
    "xmlNfe"              TEXT,
    "stockUpdated"        BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    "deletedAt"           TIMESTAMP(3),
    "createdBy"           TEXT,

    CONSTRAINT "recepcoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Recepcao_company_chave_unique"
    ON "recepcoes"("companyId", "chaveAcesso");

CREATE INDEX IF NOT EXISTS "Recepcao_companyId_idx"
    ON "recepcoes"("companyId");
CREATE INDEX IF NOT EXISTS "Recepcao_companyId_deletedAt_idx"
    ON "recepcoes"("companyId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Recepcao_companyId_status_idx"
    ON "recepcoes"("companyId", "status");
CREATE INDEX IF NOT EXISTS "Recepcao_companyId_dataEmissao_idx"
    ON "recepcoes"("companyId", "dataEmissao");
CREATE INDEX IF NOT EXISTS "Recepcao_companyId_fornecedorId_idx"
    ON "recepcoes"("companyId", "fornecedorId");
CREATE INDEX IF NOT EXISTS "Recepcao_ordemCompraId_idx"
    ON "recepcoes"("ordemCompraId");


-- CreateTable: recepcao_itens (linhas relacionais da recepção)
CREATE TABLE IF NOT EXISTS "recepcao_itens" (
    "id"               TEXT NOT NULL,
    "recepcaoId"       TEXT NOT NULL,
    "companyId"        TEXT NOT NULL,
    "ordem"            INTEGER NOT NULL DEFAULT 0,
    "entryType"        TEXT NOT NULL DEFAULT 'catalogo',
    "tipo"             TEXT NOT NULL DEFAULT 'produto',
    "itemId"           TEXT,
    "descricao"        TEXT NOT NULL,
    "ncm"              TEXT,
    "csosn"            TEXT,
    "cfop"             TEXT,
    "cst"              TEXT,
    "unidade"          TEXT,
    "quantidade"       DECIMAL(14,4) NOT NULL DEFAULT 0,
    "valorUnitario"    DECIMAL(14,4) NOT NULL DEFAULT 0,
    "valorDesconto"    DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorFrete"       DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorSeguro"      DECIMAL(14,2) NOT NULL DEFAULT 0,
    "outrasDespesas"   DECIMAL(14,2) NOT NULL DEFAULT 0,
    "aliquotaImpostos" DECIMAL(8,4)  NOT NULL DEFAULT 0,
    "valorImpostos"    DECIMAL(14,2) NOT NULL DEFAULT 0,
    "impostosDetalhe"  JSONB NOT NULL DEFAULT '{}'::jsonb,
    "loteFabricante"   TEXT,
    "locationCode"     TEXT,
    "subtotal"         DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recepcao_itens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recepcao_itens_recepcaoId_fkey"
        FOREIGN KEY ("recepcaoId") REFERENCES "recepcoes"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RecepcaoItem_recepcaoId_idx"
    ON "recepcao_itens"("recepcaoId");
CREATE INDEX IF NOT EXISTS "RecepcaoItem_companyId_idx"
    ON "recepcao_itens"("companyId");
CREATE INDEX IF NOT EXISTS "RecepcaoItem_companyId_itemId_idx"
    ON "recepcao_itens"("companyId", "itemId");
CREATE INDEX IF NOT EXISTS "RecepcaoItem_ncm_idx"
    ON "recepcao_itens"("ncm");
