-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('registration', 'deed_captured', 'boundary_confirmed', 'planting_recorded', 'harvest_recorded', 'evidence_submitted', 'checking_burn', 'approved', 'rejected', 'token_available', 'listing_pending', 'listed', 'sold');

-- CreateEnum
CREATE TYPE "PlotStatus" AS ENUM ('draft', 'pending', 'verified', 'flagged', 'rejected');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('draft', 'submitted', 'waiting_review', 'complete', 'linked');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'checking_burn', 'needs_more_evidence', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'pending_approval', 'listed', 'sold');

-- CreateTable
CREATE TABLE "FarmerProfile" (
    "id" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "farmName" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "workflowStatus" "WorkflowStatus" NOT NULL DEFAULT 'registration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,
    "cropVariety" TEXT,
    "areaRai" DOUBLE PRECISION NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "gps" TEXT,
    "boundaryGeojson" JSONB,
    "status" "PlotStatus" NOT NULL DEFAULT 'pending',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandDocument" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "uploadedFileId" TEXT,
    "documentType" TEXT NOT NULL DEFAULT 'title_deed_mock',
    "ocrStatus" TEXT NOT NULL DEFAULT 'mock_pending',
    "boundaryStatus" TEXT NOT NULL DEFAULT 'mock_pending',
    "externalRequestId" TEXT,
    "externalRawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantingRecord" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "plantingDate" TIMESTAMP(3) NOT NULL,
    "cropType" TEXT NOT NULL,
    "cropVariety" TEXT,
    "photoFileId" TEXT,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestRecord" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ton',
    "traceabilityId" TEXT,
    "photoFileId" TEXT,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HarvestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceSubmission" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "uploadedFileId" TEXT,
    "description" TEXT,
    "gps" TEXT,
    "capturedAt" TIMESTAMP(3),
    "externalRequestId" TEXT,
    "externalRawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "harvestRecordId" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "issueSummary" TEXT,
    "resultNotes" TEXT,
    "detectionSource" TEXT NOT NULL DEFAULT 'mock_adapter',
    "externalRequestId" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarbonTokenLot" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "harvestRecordId" TEXT,
    "verificationId" TEXT,
    "tokenAmount" INTEGER NOT NULL,
    "carbonSavedKg" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "traceabilityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarbonTokenLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "harvestRecordId" TEXT,
    "tokenLotId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ton',
    "price" DECIMAL(12,2) NOT NULL,
    "buyerVisibility" TEXT NOT NULL DEFAULT 'public',
    "status" "ListingStatus" NOT NULL DEFAULT 'pending_approval',
    "externalListingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'prototype_metadata',
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Plot_farmerId_idx" ON "Plot"("farmerId");

-- CreateIndex
CREATE INDEX "Plot_farmerId_status_idx" ON "Plot"("farmerId", "status");

-- CreateIndex
CREATE INDEX "LandDocument_plotId_idx" ON "LandDocument"("plotId");

-- CreateIndex
CREATE INDEX "LandDocument_uploadedFileId_idx" ON "LandDocument"("uploadedFileId");

-- CreateIndex
CREATE INDEX "PlantingRecord_plotId_plantingDate_idx" ON "PlantingRecord"("plotId", "plantingDate");

-- CreateIndex
CREATE INDEX "PlantingRecord_photoFileId_idx" ON "PlantingRecord"("photoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "HarvestRecord_traceabilityId_key" ON "HarvestRecord"("traceabilityId");

-- CreateIndex
CREATE INDEX "HarvestRecord_plotId_harvestDate_idx" ON "HarvestRecord"("plotId", "harvestDate");

-- CreateIndex
CREATE INDEX "HarvestRecord_photoFileId_idx" ON "HarvestRecord"("photoFileId");

-- CreateIndex
CREATE INDEX "EvidenceSubmission_verificationId_idx" ON "EvidenceSubmission"("verificationId");

-- CreateIndex
CREATE INDEX "EvidenceSubmission_uploadedFileId_idx" ON "EvidenceSubmission"("uploadedFileId");

-- CreateIndex
CREATE INDEX "Verification_plotId_status_idx" ON "Verification"("plotId", "status");

-- CreateIndex
CREATE INDEX "Verification_harvestRecordId_idx" ON "Verification"("harvestRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "CarbonTokenLot_traceabilityId_key" ON "CarbonTokenLot"("traceabilityId");

-- CreateIndex
CREATE INDEX "CarbonTokenLot_plotId_idx" ON "CarbonTokenLot"("plotId");

-- CreateIndex
CREATE INDEX "CarbonTokenLot_harvestRecordId_idx" ON "CarbonTokenLot"("harvestRecordId");

-- CreateIndex
CREATE INDEX "CarbonTokenLot_verificationId_idx" ON "CarbonTokenLot"("verificationId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_plotId_idx" ON "MarketplaceListing"("plotId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_harvestRecordId_idx" ON "MarketplaceListing"("harvestRecordId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_tokenLotId_idx" ON "MarketplaceListing"("tokenLotId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_status_createdAt_idx" ON "MarketplaceListing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UploadedFile_farmerId_idx" ON "UploadedFile"("farmerId");

-- CreateIndex
CREATE INDEX "WorkflowEvent_farmerId_createdAt_idx" ON "WorkflowEvent"("farmerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandDocument" ADD CONSTRAINT "LandDocument_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandDocument" ADD CONSTRAINT "LandDocument_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingRecord" ADD CONSTRAINT "PlantingRecord_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingRecord" ADD CONSTRAINT "PlantingRecord_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestRecord" ADD CONSTRAINT "HarvestRecord_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestRecord" ADD CONSTRAINT "HarvestRecord_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_harvestRecordId_fkey" FOREIGN KEY ("harvestRecordId") REFERENCES "HarvestRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarbonTokenLot" ADD CONSTRAINT "CarbonTokenLot_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarbonTokenLot" ADD CONSTRAINT "CarbonTokenLot_harvestRecordId_fkey" FOREIGN KEY ("harvestRecordId") REFERENCES "HarvestRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarbonTokenLot" ADD CONSTRAINT "CarbonTokenLot_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_harvestRecordId_fkey" FOREIGN KEY ("harvestRecordId") REFERENCES "HarvestRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_tokenLotId_fkey" FOREIGN KEY ("tokenLotId") REFERENCES "CarbonTokenLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
