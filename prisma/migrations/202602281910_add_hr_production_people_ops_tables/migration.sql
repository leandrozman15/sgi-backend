CREATE TABLE "hr_overtime_records" (
	"id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
	"company_id" TEXT NOT NULL,
	"employee_id" TEXT,
	"employee_name" TEXT,
	"date" TIMESTAMPTZ(6),
	"shift" TEXT,
	"sector" TEXT,
	"reason" TEXT,
	"overtime_type" TEXT,
	"hours" DECIMAL(10,2),
	"approver" TEXT,
	"status" TEXT,
	"data" JSONB,
	"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
	CONSTRAINT "hr_overtime_records_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "hr_overtime_records_company_id_fkey"
		FOREIGN KEY ("company_id") REFERENCES "companies"("id")
		ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "hr_overtime_records_company_id_idx"
	ON "hr_overtime_records"("company_id");
CREATE INDEX "hr_overtime_records_employee_id_idx"
	ON "hr_overtime_records"("employee_id");
CREATE INDEX "hr_overtime_records_date_idx"
	ON "hr_overtime_records"("date");
CREATE INDEX "hr_overtime_records_sector_idx"
	ON "hr_overtime_records"("sector");

CREATE TABLE "hr_production_coverages" (
	"id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
	"company_id" TEXT NOT NULL,
	"date" TIMESTAMPTZ(6),
	"shift" TEXT,
	"sector" TEXT,
	"critical_role" TEXT,
	"min_required" INTEGER,
	"available_count" INTEGER,
	"coverage_percent" DECIMAL(6,2),
	"status" TEXT,
	"notes" TEXT,
	"data" JSONB,
	"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
	CONSTRAINT "hr_production_coverages_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "hr_production_coverages_company_id_fkey"
		FOREIGN KEY ("company_id") REFERENCES "companies"("id")
		ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "hr_production_coverages_company_id_idx"
	ON "hr_production_coverages"("company_id");
CREATE INDEX "hr_production_coverages_date_idx"
	ON "hr_production_coverages"("date");
CREATE INDEX "hr_production_coverages_sector_idx"
	ON "hr_production_coverages"("sector");
CREATE INDEX "hr_production_coverages_role_idx"
	ON "hr_production_coverages"("critical_role");

CREATE TABLE "hr_training_matrix_entries" (
	"id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
	"company_id" TEXT NOT NULL,
	"employee_id" TEXT,
	"employee_name" TEXT,
	"sector" TEXT,
	"critical_role" TEXT,
	"stage" TEXT,
	"status" TEXT,
	"last_training_at" TIMESTAMPTZ(6),
	"expires_at" TIMESTAMPTZ(6),
	"data" JSONB,
	"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
	CONSTRAINT "hr_training_matrix_entries_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "hr_training_matrix_entries_company_id_fkey"
		FOREIGN KEY ("company_id") REFERENCES "companies"("id")
		ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "hr_training_matrix_entries_company_id_idx"
	ON "hr_training_matrix_entries"("company_id");
CREATE INDEX "hr_training_matrix_entries_employee_id_idx"
	ON "hr_training_matrix_entries"("employee_id");
CREATE INDEX "hr_training_matrix_entries_sector_idx"
	ON "hr_training_matrix_entries"("sector");
CREATE INDEX "hr_training_matrix_entries_role_idx"
	ON "hr_training_matrix_entries"("critical_role");
CREATE INDEX "hr_training_matrix_entries_expires_idx"
	ON "hr_training_matrix_entries"("expires_at");
