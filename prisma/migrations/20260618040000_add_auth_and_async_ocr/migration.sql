-- AlterTable
ALTER TABLE "FarmerProfile" ADD COLUMN "authUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FarmerProfile_authUserId_key" ON "FarmerProfile"("authUserId");

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN "bucket" TEXT;
ALTER TABLE "UploadedFile" ADD COLUMN "sizeBytes" INTEGER;
ALTER TABLE "UploadedFile" ADD COLUMN "checksum" TEXT;
ALTER TABLE "UploadedFile" ADD COLUMN "uploadStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "UploadedFile" ADD COLUMN "uploadedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LandDocument" ADD COLUMN "provider" TEXT;
ALTER TABLE "LandDocument" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "LandDocument" ADD COLUMN "providerErrorCode" TEXT;
ALTER TABLE "LandDocument" ADD COLUMN "providerErrorMessage" TEXT;
ALTER TABLE "LandDocument" ADD COLUMN "ocrResult" JSONB;
ALTER TABLE "LandDocument" ADD COLUMN "boundaryGeojson" JSONB;
ALTER TABLE "LandDocument" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "LandDocument" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "LandDocument" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
