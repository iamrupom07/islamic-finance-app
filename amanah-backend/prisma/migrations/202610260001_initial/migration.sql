-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" VARCHAR(16) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "linkedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshCredential" (
    "hash" VARCHAR(64) NOT NULL,
    "sessionId" UUID NOT NULL,
    "usedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshCredential_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "OneTimeToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),

    CONSTRAINT "OneTimeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BDT',
    "locale" VARCHAR(2) NOT NULL DEFAULT 'en',
    "appearance" VARCHAR(8) NOT NULL DEFAULT 'system',
    "cityId" VARCHAR(32) NOT NULL DEFAULT 'dhaka',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
    "methodId" INTEGER NOT NULL DEFAULT 1,
    "school" INTEGER NOT NULL DEFAULT 1,
    "nisabStandard" VARCHAR(6) NOT NULL DEFAULT 'SILVER',
    "policyVersionId" UUID,
    "hijriAnchor" VARCHAR(10),
    "continuityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reminders" JSONB NOT NULL DEFAULT '{}',
    "setupStep" INTEGER NOT NULL DEFAULT 0,
    "setupCompletedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" VARCHAR(7) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "localDate" DATE NOT NULL,
    "description" VARCHAR(500),
    "isSadaqah" BOOLEAN NOT NULL DEFAULT false,
    "reportingCurrency" VARCHAR(3) NOT NULL,
    "reportingRate" DECIMAL(28,12) NOT NULL,
    "reportingAmount" DECIMAL(20,4) NOT NULL,
    "rateSource" VARCHAR(32) NOT NULL,
    "rateAt" TIMESTAMPTZ(3) NOT NULL,
    "rateEstimated" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" VARCHAR(24) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "valuationMode" VARCHAR(10) NOT NULL,
    "declaredValue" DECIMAL(20,4),
    "weightGrams" DECIMAL(18,6),
    "purity" DECIMAL(8,6),
    "valuedOn" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "originalAmount" DECIMAL(20,4) NOT NULL,
    "remainingAmount" DECIMAL(20,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "openedOn" DATE NOT NULL,
    "dueOn" DATE,
    "recoverability" VARCHAR(12) NOT NULL DEFAULT 'UNCERTAIN',
    "status" VARCHAR(7) NOT NULL DEFAULT 'OPEN',
    "settledAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "debtId" UUID NOT NULL,
    "eventType" VARCHAR(16) NOT NULL,
    "previousRemaining" DECIMAL(20,4) NOT NULL,
    "nextRemaining" DECIMAL(20,4) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZakatPolicyVersion" (
    "id" UUID NOT NULL,
    "version" VARCHAR(32) NOT NULL,
    "status" VARCHAR(8) NOT NULL DEFAULT 'DRAFT',
    "goldGrams" DECIMAL(18,6) NOT NULL,
    "silverGrams" DECIMAL(18,6) NOT NULL,
    "annualRate" DECIMAL(10,8) NOT NULL,
    "rules" JSONB NOT NULL,
    "sourceNotes" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "approvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ZakatPolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZakatYear" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "policyVersionId" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "assessedAmount" DECIMAL(20,4) NOT NULL,
    "periodStart" VARCHAR(10),
    "periodEnd" VARCHAR(10),
    "status" VARCHAR(8) NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZakatYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZakatPaymentRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "zakatYearId" UUID NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "paidOn" DATE NOT NULL,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZakatPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateSet" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "quotedAt" TIMESTAMPTZ(3) NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash" VARCHAR(64) NOT NULL,

    CONSTRAINT "RateSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalPriceSnapshot" (
    "id" UUID NOT NULL,
    "rateSetId" UUID NOT NULL,
    "metal" VARCHAR(3) NOT NULL,
    "usdPerTroyOz" DECIMAL(28,12) NOT NULL,
    "quotedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MetalPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRateSnapshot" (
    "id" UUID NOT NULL,
    "rateSetId" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "perUsd" DECIMAL(28,12) NOT NULL,

    CONSTRAINT "ExchangeRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerScheduleCache" (
    "id" UUID NOT NULL,
    "key" VARCHAR(180) NOT NULL,
    "schedule" JSONB NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PrayerScheduleCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuranBookmark" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "surah" INTEGER NOT NULL,
    "ayah" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuranBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuranReadingPosition" (
    "userId" UUID NOT NULL,
    "surah" INTEGER NOT NULL,
    "ayah" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "QuranReadingPosition_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DuaFavorite" (
    "userId" UUID NOT NULL,
    "duaId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuaFavorite_pkey" PRIMARY KEY ("userId","duaId")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "operation" VARCHAR(100) NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobExecution" (
    "id" UUID NOT NULL,
    "jobType" VARCHAR(32) NOT NULL,
    "period" VARCHAR(32) NOT NULL,
    "status" VARCHAR(9) NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "errorClass" VARCHAR(64),

    CONSTRAINT "JobExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorHash" VARCHAR(64) NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_subject_key" ON "AuthIdentity"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshHash_key" ON "Session"("refreshHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeToken_hash_key" ON "OneTimeToken"("hash");

-- CreateIndex
CREATE INDEX "OneTimeToken_userId_kind_idx" ON "OneTimeToken"("userId", "kind");

-- CreateIndex
CREATE INDEX "Transaction_userId_localDate_id_idx" ON "Transaction"("userId", "localDate" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Transaction_userId_type_localDate_idx" ON "Transaction"("userId", "type", "localDate");

-- CreateIndex
CREATE INDEX "Asset_userId_createdAt_id_idx" ON "Asset"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Debt_userId_direction_status_dueOn_idx" ON "Debt"("userId", "direction", "status", "dueOn");

-- CreateIndex
CREATE INDEX "Debt_userId_createdAt_id_idx" ON "Debt"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Debt_id_userId_key" ON "Debt"("id", "userId");

-- CreateIndex
CREATE INDEX "DebtEvent_userId_debtId_idx" ON "DebtEvent"("userId", "debtId");

-- CreateIndex
CREATE UNIQUE INDEX "ZakatPolicyVersion_version_key" ON "ZakatPolicyVersion"("version");

-- CreateIndex
CREATE INDEX "ZakatYear_userId_createdAt_id_idx" ON "ZakatYear"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ZakatYear_id_userId_key" ON "ZakatYear"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ZakatYear_userId_periodStart_periodEnd_key" ON "ZakatYear"("userId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ZakatPaymentRecord_userId_zakatYearId_idx" ON "ZakatPaymentRecord"("userId", "zakatYearId");

-- CreateIndex
CREATE UNIQUE INDEX "RateSet_hash_key" ON "RateSet"("hash");

-- CreateIndex
CREATE INDEX "RateSet_quotedAt_idx" ON "RateSet"("quotedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MetalPriceSnapshot_rateSetId_metal_key" ON "MetalPriceSnapshot"("rateSetId", "metal");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateSnapshot_rateSetId_currency_key" ON "ExchangeRateSnapshot"("rateSetId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerScheduleCache_key_key" ON "PrayerScheduleCache"("key");

-- CreateIndex
CREATE UNIQUE INDEX "QuranBookmark_userId_surah_ayah_key" ON "QuranBookmark"("userId", "surah", "ayah");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_userId_operation_key_key" ON "IdempotencyRecord"("userId", "operation", "key");

-- CreateIndex
CREATE UNIQUE INDEX "JobExecution_jobType_period_key" ON "JobExecution"("jobType", "period");

-- CreateIndex
CREATE INDEX "AuditEvent_actorHash_occurredAt_idx" ON "AuditEvent"("actorHash", "occurredAt");

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshCredential" ADD CONSTRAINT "RefreshCredential_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneTimeToken" ADD CONSTRAINT "OneTimeToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "ZakatPolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEvent" ADD CONSTRAINT "DebtEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtEvent" ADD CONSTRAINT "DebtEvent_debtId_userId_fkey" FOREIGN KEY ("debtId", "userId") REFERENCES "Debt"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZakatYear" ADD CONSTRAINT "ZakatYear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZakatYear" ADD CONSTRAINT "ZakatYear_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "ZakatPolicyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZakatPaymentRecord" ADD CONSTRAINT "ZakatPaymentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZakatPaymentRecord" ADD CONSTRAINT "ZakatPaymentRecord_zakatYearId_userId_fkey" FOREIGN KEY ("zakatYearId", "userId") REFERENCES "ZakatYear"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetalPriceSnapshot" ADD CONSTRAINT "MetalPriceSnapshot_rateSetId_fkey" FOREIGN KEY ("rateSetId") REFERENCES "RateSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRateSnapshot" ADD CONSTRAINT "ExchangeRateSnapshot_rateSetId_fkey" FOREIGN KEY ("rateSetId") REFERENCES "RateSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuranBookmark" ADD CONSTRAINT "QuranBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuranReadingPosition" ADD CONSTRAINT "QuranReadingPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuaFavorite" ADD CONSTRAINT "DuaFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

