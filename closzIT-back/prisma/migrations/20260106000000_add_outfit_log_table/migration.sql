-- CreateTable
CREATE TABLE "outfit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id" TEXT NOT NULL,
    "worn_date" TIMESTAMP(6) NOT NULL,
    "location" VARCHAR(255),
    "tpo" "TPO" NOT NULL,
    "weather_temp" DOUBLE PRECISION,
    "weather_condition" VARCHAR(50),
    "outer_id" TEXT,
    "top_id" TEXT NOT NULL,
    "bottom_id" TEXT NOT NULL,
    "shoes_id" TEXT NOT NULL,
    "user_note" TEXT,
    "feedback_score" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "outfit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outfit_logs_user_id_worn_date_idx" ON "outfit_logs"("user_id", "worn_date");

-- CreateIndex
CREATE INDEX "outfit_logs_user_id_location_idx" ON "outfit_logs"("user_id", "location");

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_outer_id_fkey" FOREIGN KEY ("outer_id") REFERENCES "clothes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_top_id_fkey" FOREIGN KEY ("top_id") REFERENCES "clothes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_bottom_id_fkey" FOREIGN KEY ("bottom_id") REFERENCES "clothes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_shoes_id_fkey" FOREIGN KEY ("shoes_id") REFERENCES "clothes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
