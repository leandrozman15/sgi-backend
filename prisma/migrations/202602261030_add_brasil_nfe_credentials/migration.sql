-- AlterTable
ALTER TABLE "companies"
ADD COLUMN "brasil_nfe_personal_token" TEXT,
ADD COLUMN "brasil_nfe_company_token" TEXT,
ADD COLUMN "brasil_nfe_credentials_updated_at" TIMESTAMPTZ(6);
