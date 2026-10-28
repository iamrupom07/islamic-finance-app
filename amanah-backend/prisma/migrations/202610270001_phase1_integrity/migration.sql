ALTER TABLE "Asset" ADD COLUMN note VARCHAR(500);
ALTER TABLE "Debt" ADD COLUMN note VARCHAR(500);
ALTER TABLE "DebtEvent" ADD COLUMN "paidOn" DATE, ADD COLUMN note VARCHAR(500);
CREATE UNIQUE INDEX "ZakatPaymentRecord_id_userId_key" ON "ZakatPaymentRecord"(id,"userId");
CREATE TABLE "ZakatPaymentCorrection" (
 id UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
 "paymentId" UUID NOT NULL, sequence INTEGER NOT NULL CHECK (sequence>0), "replacementAmount" DECIMAL(20,4) NOT NULL CHECK ("replacementAmount">=0),
 reason VARCHAR(500) NOT NULL CHECK (length(trim(reason))>0), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("paymentId","userId") REFERENCES "ZakatPaymentRecord"(id,"userId") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "ZakatPaymentCorrection_paymentId_sequence_key" ON "ZakatPaymentCorrection"("paymentId",sequence);
CREATE INDEX "ZakatPaymentCorrection_userId_paymentId_createdAt_idx" ON "ZakatPaymentCorrection"("userId","paymentId","createdAt");
CREATE FUNCTION prevent_payment_correction_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Payment corrections are append-only.'; END; $$;
CREATE TRIGGER immutable_payment_correction BEFORE UPDATE ON "ZakatPaymentCorrection" FOR EACH ROW EXECUTE FUNCTION prevent_payment_correction_update();

ALTER TABLE "Asset" ADD COLUMN "weightQuantity" DECIMAL(28,12), ADD COLUMN "weightUnit" VARCHAR(8);
ALTER TABLE "Asset" ADD CONSTRAINT asset_original_weight CHECK (("weightQuantity" IS NULL AND "weightUnit" IS NULL) OR ("valuationMode"='METAL_RATE' AND "weightQuantity" IS NOT NULL AND "weightUnit" IS NOT NULL AND "weightQuantity">0 AND "weightUnit" IN ('g','bhori','tola','ozt') AND "weightGrams" = round("weightQuantity" * CASE "weightUnit" WHEN 'g' THEN 1 WHEN 'bhori' THEN 11.664 WHEN 'tola' THEN 11.6638038 WHEN 'ozt' THEN 31.1034768 END,6)));
