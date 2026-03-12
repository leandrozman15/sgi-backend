-- CreateTable
CREATE TABLE "company_info" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "name" TEXT,
    "cnpj" TEXT,
    "cnae" TEXT,
    "crt" TEXT,
    "ie" TEXT,
    "csosn_padrao" TEXT,
    "nfe_environment" TEXT DEFAULT '2',
    "logo_url" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" JSONB,
    "contacts" JSONB,
    "bank_accounts" JSONB,
    "commercial_references" JSONB,
    "fiscal_defaults" JSONB,
    "holerite_config" JSONB,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraps" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "production_order_id" TEXT,
    "product_id" TEXT,
    "raw_material_id" TEXT,
    "machine_id" TEXT,
    "employee_id" TEXT,
    "employee_name" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT,
    "reason" TEXT,
    "category" TEXT,
    "severity" TEXT,
    "cost_estimate" DECIMAL(14,4),
    "occurrence_date" TIMESTAMPTZ(6) NOT NULL,
    "shift" TEXT,
    "sector" TEXT,
    "corrective_action" TEXT,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "notes" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "employee_name" TEXT,
    "sale_id" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "period" TEXT,
    "amount" DECIMAL(14,4) NOT NULL,
    "rate" DECIMAL(10,4),
    "base_value" DECIMAL(14,4),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6),
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "category" TEXT,
    "created_by" TEXT,
    "recurrence" TEXT,
    "location" TEXT,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_messages" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "category" TEXT,
    "author_id" TEXT,
    "author_name" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "visible_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMPTZ(6),
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_configs" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "company_id" TEXT NOT NULL,
    "config_type" TEXT NOT NULL DEFAULT 'general',
    "inss_table" JSONB,
    "irrf_table" JSONB,
    "fgts_rate" DECIMAL(6,4),
    "transport_voucher" JSONB,
    "meal_voucher" JSONB,
    "health_deduction" JSONB,
    "other_benefits" JSONB,
    "overtime_rates" JSONB,
    "hazard_premium_rate" DECIMAL(6,4),
    "unhealthy_premium_rate" DECIMAL(6,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMPTZ(6),
    "valid_until" TIMESTAMPTZ(6),
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_info_company_id_key" ON "company_info"("company_id");

-- CreateIndex
CREATE INDEX "scraps_company_id_idx" ON "scraps"("company_id");

-- CreateIndex
CREATE INDEX "scraps_occurrence_date_idx" ON "scraps"("occurrence_date");

-- CreateIndex
CREATE INDEX "scraps_product_id_idx" ON "scraps"("product_id");

-- CreateIndex
CREATE INDEX "scraps_production_order_id_idx" ON "scraps"("production_order_id");

-- CreateIndex
CREATE INDEX "scraps_status_idx" ON "scraps"("status");

-- CreateIndex
CREATE INDEX "commissions_company_id_idx" ON "commissions"("company_id");

-- CreateIndex
CREATE INDEX "commissions_employee_id_idx" ON "commissions"("employee_id");

-- CreateIndex
CREATE INDEX "commissions_sale_id_idx" ON "commissions"("sale_id");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- CreateIndex
CREATE INDEX "commissions_period_idx" ON "commissions"("period");

-- CreateIndex
CREATE INDEX "calendar_events_company_id_idx" ON "calendar_events"("company_id");

-- CreateIndex
CREATE INDEX "calendar_events_start_date_idx" ON "calendar_events"("start_date");

-- CreateIndex
CREATE INDEX "calendar_events_category_idx" ON "calendar_events"("category");

-- CreateIndex
CREATE INDEX "dashboard_messages_company_id_idx" ON "dashboard_messages"("company_id");

-- CreateIndex
CREATE INDEX "dashboard_messages_active_idx" ON "dashboard_messages"("active");

-- CreateIndex
CREATE INDEX "dashboard_messages_priority_idx" ON "dashboard_messages"("priority");

-- CreateIndex
CREATE INDEX "payroll_configs_company_id_idx" ON "payroll_configs"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_configs_company_id_config_type_key" ON "payroll_configs"("company_id", "config_type");

-- AddForeignKey
ALTER TABLE "company_info" ADD CONSTRAINT "company_info_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraps" ADD CONSTRAINT "scraps_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_messages" ADD CONSTRAINT "dashboard_messages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_configs" ADD CONSTRAINT "payroll_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

