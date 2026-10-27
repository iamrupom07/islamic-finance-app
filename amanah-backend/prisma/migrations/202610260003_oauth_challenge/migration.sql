CREATE TABLE "OAuthChallenge" (
 "hash" VARCHAR(64) NOT NULL,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "consumedAt" TIMESTAMPTZ(3),
 CONSTRAINT "OAuthChallenge_pkey" PRIMARY KEY ("hash")
);
CREATE INDEX "OAuthChallenge_expiresAt_idx" ON "OAuthChallenge"("expiresAt");
