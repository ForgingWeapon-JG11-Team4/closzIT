-- CreateTable
CREATE TABLE "vto_cache" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "hash_key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "clothing_ids" TEXT[],
    "s3_url" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vto_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vto_cache_hash_key_key" ON "vto_cache"("hash_key");

-- CreateIndex
CREATE INDEX "vto_cache_hash_key_idx" ON "vto_cache"("hash_key");

-- CreateIndex
CREATE INDEX "vto_cache_user_id_is_visible_created_at_idx" ON "vto_cache"("user_id", "is_visible", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "vto_cache" ADD CONSTRAINT "vto_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
