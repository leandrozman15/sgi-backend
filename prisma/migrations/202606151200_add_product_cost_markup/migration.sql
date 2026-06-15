-- AddColumns: cost_price + markup em products e product_variants
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "cost_price" DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS "markup"     DECIMAL(10,4);

ALTER TABLE "product_variants"
  ADD COLUMN IF NOT EXISTS "cost_price" DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS "markup"     DECIMAL(10,4);
