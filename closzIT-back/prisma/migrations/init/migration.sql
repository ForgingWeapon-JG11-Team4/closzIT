-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('Outer', 'Top', 'Bottom', 'Shoes', 'Other');

-- CreateEnum
CREATE TYPE "SubCategoryOuter" AS ENUM ('Cardigan', 'Jacket', 'Blazer', 'Jumper', 'Padding', 'Coat', 'Vest', 'Hoodie-zipup', 'Windbreaker', 'Other');

-- CreateEnum
CREATE TYPE "SubCategoryTop" AS ENUM ('Short-sleeve-T', 'Long-sleeve-T', 'Hoodie', 'Sweatshirt', 'Knit', 'Shirt', 'Sleeveless', 'Polo-shirt', 'Other');

-- CreateEnum
CREATE TYPE "SubCategoryBottom" AS ENUM ('Denim', 'Slacks', 'Cotton-pants', 'Sweatpants', 'Shorts', 'Skirt', 'Leggings', 'Other');

-- CreateEnum
CREATE TYPE "SubCategoryShoes" AS ENUM ('Sneakers', 'Loafers', 'Dress-shoes', 'Boots', 'Sandals', 'Slippers', 'Other');

-- CreateEnum
CREATE TYPE "Color" AS ENUM ('Black', 'White', 'Gray', 'Beige', 'Brown', 'Navy', 'Blue', 'Sky-blue', 'Red', 'Pink', 'Orange', 'Yellow', 'Green', 'Mint', 'Purple', 'Khaki', 'Silver', 'Gold', 'Other');

-- CreateEnum
CREATE TYPE "Pattern" AS ENUM ('Solid', 'Stripe', 'Check', 'Dot', 'Floral', 'Animal', 'Graphic', 'Camouflage', 'Argyle', 'Other');

-- CreateEnum
CREATE TYPE "Detail" AS ENUM ('Logo', 'Pocket', 'Button', 'Zipper', 'Hood', 'Embroidery', 'Quilted', 'Distressed', 'Knit-rib', 'Other');

-- CreateEnum
CREATE TYPE "StyleMood" AS ENUM ('Casual', 'Street', 'Minimal', 'Formal', 'Sporty', 'Vintage', 'Gorpcore', 'Other');

-- CreateEnum
CREATE TYPE "TPO" AS ENUM ('Date', 'Daily', 'Commute', 'Sports', 'Travel', 'Wedding', 'Party', 'Home', 'School', 'Other');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('Spring', 'Summer', 'Autumn', 'Winter');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('SIGNUP', 'CLOTHING_ADDED', 'VTO_USED', 'FLATTEN_USED', 'ADMIN_ADD', 'ADMIN_SUB', 'ADMIN_SET', 'ADMIN_FIX');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('ACCEPT', 'REJECT', 'WORN');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "PersonalColor" AS ENUM ('SpringWarm', 'SummerCool', 'AutumnWarm', 'WinterCool');

-- CreateEnum
CREATE TYPE "HairColor" AS ENUM ('Black', 'DarkBrown', 'LightBrown', 'Blonde', 'Other');

-- CreateTable
CREATE TABLE "clothes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "sub_category" TEXT NOT NULL,
    "colors" "Color"[],
    "patterns" "Pattern"[],
    "details" "Detail"[],
    "style_mood" "StyleMood"[],
    "tpos" "TPO"[],
    "seasons" "Season"[],
    "user_rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "note" TEXT,
    "wear_count" INTEGER NOT NULL DEFAULT 0,
    "last_worn" TIMESTAMP(3),
    "accept_count" INTEGER NOT NULL DEFAULT 0,
    "reject_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text_embedding" vector,
    "image_embedding" vector,
    "flatten_image_url" TEXT,

    CONSTRAINT "clothes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" TEXT,
    "idempotency_key" TEXT,
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "outfit_hash" TEXT NOT NULL,
    "feedback_type" "FeedbackType" NOT NULL,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outfit_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "response_code" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "outfit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
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

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "caption" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_clothes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "post_id" TEXT NOT NULL,
    "clothing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_clothes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "profile_image" TEXT,
    "full_body_image" TEXT,
    "google_id" TEXT,
    "google_access_token" TEXT,
    "google_refresh_token" TEXT,
    "gender" "Gender",
    "birthday" DATE,
    "city" TEXT,
    "hair_color" "HairColor",
    "personal_color" "PersonalColor",
    "preferred_styles" TEXT[],
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "province" TEXT,
    "body_type" TEXT,
    "height" DECIMAL,
    "weight" DECIMAL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clothes_user_id_idx" ON "clothes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_history_idempotency_key_key" ON "credit_history"("idempotency_key");

-- CreateIndex
CREATE INDEX "credit_history_user_id_idx" ON "credit_history"("user_id");

-- CreateIndex
CREATE INDEX "credit_history_created_at_idx" ON "credit_history"("created_at");

-- CreateIndex
CREATE INDEX "credit_history_type_idx" ON "credit_history"("type");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_feedback_idempotency_key_key" ON "outfit_feedback"("idempotency_key");

-- CreateIndex
CREATE INDEX "outfit_feedback_user_id_idx" ON "outfit_feedback"("user_id");

-- CreateIndex
CREATE INDEX "outfit_feedback_outfit_hash_idx" ON "outfit_feedback"("outfit_hash");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_feedback_user_id_outfit_hash_key" ON "outfit_feedback"("user_id", "outfit_hash");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "idempotency_keys_status_idx" ON "idempotency_keys"("status");

-- CreateIndex
CREATE INDEX "outfit_logs_user_id_location_idx" ON "outfit_logs"("user_id", "location");

-- CreateIndex
CREATE INDEX "outfit_logs_user_id_worn_date_idx" ON "outfit_logs"("user_id", "worn_date");

-- CreateIndex
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "post_clothes_post_id_idx" ON "post_clothes"("post_id");

-- CreateIndex
CREATE INDEX "post_clothes_clothing_id_idx" ON "post_clothes"("clothing_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_clothes_post_id_clothing_id_key" ON "post_clothes"("post_id", "clothing_id");

-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "comments"("post_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "likes_post_id_idx" ON "likes"("post_id");

-- CreateIndex
CREATE INDEX "likes_user_id_idx" ON "likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_post_id_user_id_key" ON "likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- AddForeignKey
ALTER TABLE "clothes" ADD CONSTRAINT "clothes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_history" ADD CONSTRAINT "credit_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_history" ADD CONSTRAINT "credit_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_feedback" ADD CONSTRAINT "outfit_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_outer_id_fkey" FOREIGN KEY ("outer_id") REFERENCES "clothes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_top_id_fkey" FOREIGN KEY ("top_id") REFERENCES "clothes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_bottom_id_fkey" FOREIGN KEY ("bottom_id") REFERENCES "clothes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_logs" ADD CONSTRAINT "outfit_logs_shoes_id_fkey" FOREIGN KEY ("shoes_id") REFERENCES "clothes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_clothes" ADD CONSTRAINT "post_clothes_clothing_id_fkey" FOREIGN KEY ("clothing_id") REFERENCES "clothes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_clothes" ADD CONSTRAINT "post_clothes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

