-- CreateTable
CREATE TABLE "credits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credits_user_id_key" ON "credits"("user_id");

-- CreateIndex
CREATE INDEX "credits_user_id_idx" ON "credits"("user_id");

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "credit_history" ADD COLUMN "balance_before" INTEGER;

-- Migrate existing data: Create Credit records for existing users
INSERT INTO "credits" ("id", "user_id", "balance", "version", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    "id",
    COALESCE("credit", 0),
    0,
    NOW(),
    NOW()
FROM "users"
WHERE NOT EXISTS (
    SELECT 1 FROM "credits" WHERE "credits"."user_id" = "users"."id"
);

-- Update existing credit_history records to have balanceBefore
UPDATE "credit_history"
SET "balance_before" = "balance_after" - "amount"
WHERE "balance_before" IS NULL;

-- Make balance_before NOT NULL after data migration
ALTER TABLE "credit_history" ALTER COLUMN "balance_before" SET NOT NULL;

-- Drop the old credit column from users table (optional, can be done later)
-- ALTER TABLE "users" DROP COLUMN "credit";
