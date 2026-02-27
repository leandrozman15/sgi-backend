ALTER TABLE "production_orders"
ADD COLUMN IF NOT EXISTS "variant_id" TEXT;

CREATE INDEX IF NOT EXISTS "production_orders_variant_id_idx"
ON "production_orders"("variant_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'production_orders_variant_id_fkey'
  ) THEN
    ALTER TABLE "production_orders"
    ADD CONSTRAINT "production_orders_variant_id_fkey"
    FOREIGN KEY ("variant_id")
    REFERENCES "product_variants"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;
  END IF;
END
$$;
