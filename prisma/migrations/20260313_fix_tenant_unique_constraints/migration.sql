-- Fix tenant isolation: change global unique constraints to company-scoped compound unique constraints
-- This prevents cross-company numbering collisions (e.g., OP 01 in Company A blocking OP 01 in Company B)

-- 1. production_orders.number: global @unique → @@unique([company_id, number])
ALTER TABLE "production_orders" DROP CONSTRAINT "production_orders_number_key";
CREATE UNIQUE INDEX "production_orders_company_id_number_key" ON "production_orders"("company_id", "number");

-- 2. machines.code: global @unique → @@unique([company_id, code])
ALTER TABLE "machines" DROP CONSTRAINT "machines_code_key";
CREATE UNIQUE INDEX "machines_company_id_code_key" ON "machines"("company_id", "code");

-- 3. products.code: global @unique → @@unique([company_id, code])
ALTER TABLE "products" DROP CONSTRAINT "products_code_key";
CREATE UNIQUE INDEX "products_company_id_code_key" ON "products"("company_id", "code");

-- 4. employees.email: global @unique → @@unique([company_id, email])
ALTER TABLE "employees" DROP CONSTRAINT "employees_email_key";
CREATE UNIQUE INDEX "employees_company_id_email_key" ON "employees"("company_id", "email");

-- 5. employees.document: global @unique → @@unique([company_id, document])
ALTER TABLE "employees" DROP CONSTRAINT "employees_document_key";
CREATE UNIQUE INDEX "employees_company_id_document_key" ON "employees"("company_id", "document");
