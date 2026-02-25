-- CreateTable
CREATE TABLE "hr_benefits" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "provider" TEXT,
    "audience" TEXT,
    "status" TEXT DEFAULT 'Ativo',
    "monthly_cost" DECIMAL(12,2),
    "enrolled_count" INTEGER DEFAULT 0,
    "satisfaction" DECIMAL(4,2),
    "coverage_goal" INTEGER,
    "renewal_date" TIMESTAMPTZ(6),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT,
    "priority" TEXT,
    "last_reviewed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_benefit_services" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "benefit_id" TEXT,
    "employee_id" TEXT,
    "employee_name" TEXT,
    "subject" TEXT,
    "channel" TEXT,
    "audience" TEXT,
    "owner" TEXT,
    "service_kind" TEXT,
    "priority" TEXT DEFAULT 'Normal',
    "status" TEXT DEFAULT 'Aguardando RH',
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "submitted_at" TIMESTAMPTZ(6),
    "scheduled_for" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "last_credit_date" TIMESTAMPTZ(6),
    "next_credit_date" TIMESTAMPTZ(6),
    "credit_amount" DECIMAL(12,2),
    "notes" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_benefit_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_benefit_controls" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "benefit_id" TEXT,
    "control_type" TEXT,
    "scope" TEXT,
    "metric_label" TEXT,
    "current_value" DECIMAL(10,2),
    "target_value" DECIMAL(10,2),
    "unit" TEXT,
    "highlight" TEXT,
    "owner" TEXT,
    "status" TEXT DEFAULT 'Ativo',
    "next_action_at" TIMESTAMPTZ(6),
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_benefit_controls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hr_benefits_company_id_idx" ON "hr_benefits"("company_id");

-- CreateIndex
CREATE INDEX "hr_benefits_status_idx" ON "hr_benefits"("status");

-- CreateIndex
CREATE INDEX "hr_benefits_renewal_date_idx" ON "hr_benefits"("renewal_date");

-- CreateIndex
CREATE INDEX "hr_benefit_services_company_id_idx" ON "hr_benefit_services"("company_id");

-- CreateIndex
CREATE INDEX "hr_benefit_services_benefit_id_idx" ON "hr_benefit_services"("benefit_id");

-- CreateIndex
CREATE INDEX "hr_benefit_services_status_idx" ON "hr_benefit_services"("status");

-- CreateIndex
CREATE INDEX "hr_benefit_services_kind_idx" ON "hr_benefit_services"("service_kind");

-- CreateIndex
CREATE INDEX "hr_benefit_services_submitted_idx" ON "hr_benefit_services"("submitted_at");

-- CreateIndex
CREATE INDEX "hr_benefit_controls_company_id_idx" ON "hr_benefit_controls"("company_id");

-- CreateIndex
CREATE INDEX "hr_benefit_controls_benefit_id_idx" ON "hr_benefit_controls"("benefit_id");

-- CreateIndex
CREATE INDEX "hr_benefit_controls_control_type_idx" ON "hr_benefit_controls"("control_type");

-- CreateIndex
CREATE INDEX "hr_benefit_controls_scope_idx" ON "hr_benefit_controls"("scope");

-- AddForeignKey
ALTER TABLE "hr_benefits" ADD CONSTRAINT "hr_benefits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefit_services" ADD CONSTRAINT "hr_benefit_services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefit_services" ADD CONSTRAINT "hr_benefit_services_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "hr_benefits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefit_controls" ADD CONSTRAINT "hr_benefit_controls_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_benefit_controls" ADD CONSTRAINT "hr_benefit_controls_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "hr_benefits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

