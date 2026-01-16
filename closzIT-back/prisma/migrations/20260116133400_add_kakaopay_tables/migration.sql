-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('READY', 'APPROVED', 'CANCELLED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OutboxEventType" AS ENUM ('GRANT_CREDIT', 'DEDUCT_CREDIT', 'SEND_NOTIFICATION');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "kakao_payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "tid" TEXT,
    "user_id" TEXT NOT NULL,
    "package_id" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'READY',
    "payment_method_type" TEXT,
    "credit_granted" BOOLEAN NOT NULL DEFAULT false,
    "credit_history_id" TEXT,
    "refunded_amount" INTEGER,
    "refund_history_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),

    CONSTRAINT "kakao_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_outbox" (
    "id" TEXT NOT NULL,
    "eventType" "OutboxEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "payment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),

    CONSTRAINT "payment_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_audit_logs" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kakao_payments_order_id_key" ON "kakao_payments"("order_id");

-- CreateIndex
CREATE INDEX "kakao_payments_user_id_idx" ON "kakao_payments"("user_id");

-- CreateIndex
CREATE INDEX "kakao_payments_status_idx" ON "kakao_payments"("status");

-- CreateIndex
CREATE INDEX "kakao_payments_credit_granted_status_idx" ON "kakao_payments"("credit_granted", "status");

-- CreateIndex
CREATE INDEX "kakao_payments_created_at_idx" ON "kakao_payments"("created_at");

-- CreateIndex
CREATE INDEX "payment_outbox_status_next_retry_at_idx" ON "payment_outbox"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "payment_outbox_payment_id_idx" ON "payment_outbox"("payment_id");

-- CreateIndex
CREATE INDEX "payment_outbox_eventType_status_idx" ON "payment_outbox"("eventType", "status");

-- CreateIndex
CREATE INDEX "payment_audit_logs_payment_id_idx" ON "payment_audit_logs"("payment_id");

-- CreateIndex
CREATE INDEX "payment_audit_logs_created_at_idx" ON "payment_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "payment_audit_logs_action_status_idx" ON "payment_audit_logs"("action", "status");

-- AddForeignKey
ALTER TABLE "kakao_payments" ADD CONSTRAINT "kakao_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_outbox" ADD CONSTRAINT "payment_outbox_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "kakao_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_audit_logs" ADD CONSTRAINT "payment_audit_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "kakao_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
