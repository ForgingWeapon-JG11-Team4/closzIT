-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('SIGNUP', 'CLOTHING_ADDED', 'VTO_USED', 'ADMIN_ADJUSTMENT');

-- CreateTable
CREATE TABLE "credit_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_history_user_id_idx" ON "credit_history"("user_id");

-- CreateIndex
CREATE INDEX "credit_history_created_at_idx" ON "credit_history"("created_at");

-- AddForeignKey
ALTER TABLE "credit_history" ADD CONSTRAINT "credit_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
