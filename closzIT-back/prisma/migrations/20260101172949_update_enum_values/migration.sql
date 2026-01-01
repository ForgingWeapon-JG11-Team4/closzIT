/*
  Warnings:

  - The values [Dark-brown,Light-brown] on the enum `HairColor` will be removed. If these variants are still used in the database, this will fail.
  - The `province` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "HairColor_new" AS ENUM ('Black', 'DarkBrown', 'LightBrown', 'Blonde', 'Other');
ALTER TABLE "users" ALTER COLUMN "hair_color" TYPE "HairColor_new" USING ("hair_color"::text::"HairColor_new");
ALTER TYPE "HairColor" RENAME TO "HairColor_old";
ALTER TYPE "HairColor_new" RENAME TO "HairColor";
DROP TYPE "HairColor_old";
COMMIT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "province",
ADD COLUMN     "province" TEXT;

-- DropEnum
DROP TYPE "CityBusan";

-- DropEnum
DROP TYPE "CityChungbuk";

-- DropEnum
DROP TYPE "CityChungnam";

-- DropEnum
DROP TYPE "CityDaegu";

-- DropEnum
DROP TYPE "CityDaejeon";

-- DropEnum
DROP TYPE "CityGangwon";

-- DropEnum
DROP TYPE "CityGwangju";

-- DropEnum
DROP TYPE "CityGyeongbuk";

-- DropEnum
DROP TYPE "CityGyeonggi";

-- DropEnum
DROP TYPE "CityGyeongnam";

-- DropEnum
DROP TYPE "CityIncheon";

-- DropEnum
DROP TYPE "CityJeju";

-- DropEnum
DROP TYPE "CityJeonbuk";

-- DropEnum
DROP TYPE "CityJeonnam";

-- DropEnum
DROP TYPE "CitySejong";

-- DropEnum
DROP TYPE "CitySeoul";

-- DropEnum
DROP TYPE "CityUlsan";

-- DropEnum
DROP TYPE "Province";
