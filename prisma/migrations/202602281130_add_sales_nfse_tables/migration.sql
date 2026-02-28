CREATE TABLE "sales_nfse_documents" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "company_id" TEXT NOT NULL,
  "sale_id" TEXT,
  "lot_number" TEXT,
  "rps_number" TEXT,
  "verification_code" TEXT,
  "document_number" TEXT,
  "series" TEXT,
  "status" TEXT,
  "provider_status_code" TEXT,
  "provider_message" TEXT,
  "issue_date" TIMESTAMPTZ(6),
  "authorization_date" TIMESTAMPTZ(6),
  "cancellation_date" TIMESTAMPTZ(6),
  "protocol_number" TEXT,
  "xml_url" TEXT,
  "pdf_url" TEXT,
  "data" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "sales_nfse_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_nfse_documents_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sales_nfse_documents_sale_id_fkey"
    FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "sales_nfse_documents_company_verification_code_key"
  ON "sales_nfse_documents"("company_id", "verification_code");
CREATE INDEX "sales_nfse_documents_company_id_idx"
  ON "sales_nfse_documents"("company_id");
CREATE INDEX "sales_nfse_documents_sale_id_idx"
  ON "sales_nfse_documents"("sale_id");
CREATE INDEX "sales_nfse_documents_lot_number_idx"
  ON "sales_nfse_documents"("lot_number");
CREATE INDEX "sales_nfse_documents_status_idx"
  ON "sales_nfse_documents"("status");

CREATE TABLE "sales_nfse_events" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "company_id" TEXT NOT NULL,
  "nfse_document_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "event_status" TEXT,
  "event_date" TIMESTAMPTZ(6),
  "protocol_number" TEXT,
  "reason" TEXT,
  "data" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "sales_nfse_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_nfse_events_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sales_nfse_events_nfse_document_id_fkey"
    FOREIGN KEY ("nfse_document_id") REFERENCES "sales_nfse_documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "sales_nfse_events_company_id_idx"
  ON "sales_nfse_events"("company_id");
CREATE INDEX "sales_nfse_events_document_id_idx"
  ON "sales_nfse_events"("nfse_document_id");
CREATE INDEX "sales_nfse_events_event_type_idx"
  ON "sales_nfse_events"("event_type");
CREATE INDEX "sales_nfse_events_event_date_idx"
  ON "sales_nfse_events"("event_date");
