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
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "PersonalColor" AS ENUM ('SpringWarm', 'SummerCool', 'AutumnWarm', 'WinterCool');

-- CreateEnum
CREATE TYPE "HairColor" AS ENUM ('Black', 'Dark-brown', 'Light-brown', 'Blonde', 'Other');

-- CreateEnum
CREATE TYPE "Province" AS ENUM ('서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도');

-- CreateEnum
CREATE TYPE "CitySeoul" AS ENUM ('강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구');

-- CreateEnum
CREATE TYPE "CityBusan" AS ENUM ('강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구');

-- CreateEnum
CREATE TYPE "CityDaegu" AS ENUM ('남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구');

-- CreateEnum
CREATE TYPE "CityIncheon" AS ENUM ('강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구');

-- CreateEnum
CREATE TYPE "CityGwangju" AS ENUM ('광산구', '남구', '동구', '북구', '서구');

-- CreateEnum
CREATE TYPE "CityDaejeon" AS ENUM ('대덕구', '동구', '서구', '유성구', '중구');

-- CreateEnum
CREATE TYPE "CityUlsan" AS ENUM ('남구', '동구', '북구', '울주군', '중구');

-- CreateEnum
CREATE TYPE "CitySejong" AS ENUM ('세종시');

-- CreateEnum
CREATE TYPE "CityGyeonggi" AS ENUM ('가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시');

-- CreateEnum
CREATE TYPE "CityGangwon" AS ENUM ('강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군');

-- CreateEnum
CREATE TYPE "CityChungbuk" AS ENUM ('괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시');

-- CreateEnum
CREATE TYPE "CityChungnam" AS ENUM ('계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군');

-- CreateEnum
CREATE TYPE "CityJeonbuk" AS ENUM ('고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군');

-- CreateEnum
CREATE TYPE "CityJeonnam" AS ENUM ('강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군');

-- CreateEnum
CREATE TYPE "CityGyeongbuk" AS ENUM ('경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시');

-- CreateEnum
CREATE TYPE "CityGyeongnam" AS ENUM ('거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군');

-- CreateEnum
CREATE TYPE "CityJeju" AS ENUM ('서귀포시', '제주시');

-- CreateTable
CREATE TABLE "clothes" (
    "id" TEXT NOT NULL,
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embedding" vector(768),
    "text_embedding" vector(512),

    CONSTRAINT "clothes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "profile_image" TEXT,
    "google_id" TEXT,
    "google_access_token" TEXT,
    "google_refresh_token" TEXT,
    "gender" "Gender",
    "birthday" DATE,
    "province" "Province",
    "city" TEXT,
    "hair_color" "HairColor",
    "personal_color" "PersonalColor",
    "preferred_styles" TEXT[],
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clothes_user_id_idx" ON "clothes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- AddForeignKey
ALTER TABLE "clothes" ADD CONSTRAINT "clothes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
