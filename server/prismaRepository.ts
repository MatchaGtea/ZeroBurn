import type { Prisma } from '@prisma/client'
import type {
  AppData,
  FarmerProfile,
  HarvestRecord,
  MarketplaceListing,
  PlantingRecord,
  Plot,
  TokenLot,
  Verification,
  WorkflowStatus,
  UploadedFile,
  LandDocument,
} from './domain'
import type { AppPrismaClient } from './prismaClient'
import type {
  CreateHarvestInput,
  CreateListingInput,
  CreatePlantingInput,
  CreatePlotInput,
  EvidenceInput,
  PlotDocumentInput,
  ProfileUpdate,
  Repository,
} from './repository'
import { buildWorkflow } from './repository'


type PlotRow = Prisma.PlotGetPayload<{
  include: { landDocuments: { orderBy: { createdAt: 'desc' }; take: 1 } }
}>
type PlantingRow = Prisma.PlantingRecordGetPayload<{ include: { photoFile: true } }>
type HarvestRow = Prisma.HarvestRecordGetPayload<{ include: { photoFile: true } }>
type VerificationRow = Prisma.VerificationGetPayload<{ include: { evidence: true } }>

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status })
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function riskLevel(value: string): 'low' | 'medium' | 'high' {
  return value === 'high' || value === 'medium' ? value : 'low'
}

function unit(value: string): 'kg' | 'ton' {
  return value === 'kg' ? 'kg' : 'ton'
}

function recordStatus(value: string): 'draft' | 'submitted' | 'complete' {
  return value === 'draft' || value === 'complete' ? value : 'submitted'
}

function harvestStatus(value: string): 'draft' | 'submitted' | 'linked' {
  return value === 'draft' || value === 'linked' ? value : 'submitted'
}

function tokenStatus(value: string): TokenLot['status'] {
  return value === 'pending' || value === 'attached' || value === 'sold' ? value : 'available'
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function mapProfile(row: {
  id: string
  ownerName: string
  phone: string
  farmName: string
  province: string
  district: string
  address: string | null
  consent: boolean
  workflowStatus: WorkflowStatus
}): FarmerProfile {
  return {
    id: row.id,
    ownerName: row.ownerName,
    phone: row.phone,
    farmName: row.farmName,
    province: row.province,
    district: row.district,
    address: row.address ?? '',
    consent: row.consent,
    workflowStatus: row.workflowStatus,
  }
}

function mapPlot(row: PlotRow): Plot {
  const document = row.landDocuments[0]
  const fallbackBoundary = row.status === 'verified'
    ? 'ยืนยันแล้ว'
    : row.status === 'flagged' ? 'ต้องตรวจเพิ่ม' : 'รอข้อมูล'
  const fallbackDocument = row.status === 'verified'
    ? 'ตรวจแล้ว'
    : row.status === 'flagged' ? 'มีจุดเสี่ยง' : 'รอบันทึกเก็บเกี่ยว'

  return {
    id: row.id,
    name: row.name,
    cropType: row.cropType,
    cropVariety: row.cropVariety ?? '',
    areaRai: row.areaRai,
    gps: row.gps ?? '',
    status: row.status,
    riskLevel: riskLevel(row.riskLevel),
    boundaryLabel: document?.boundaryStatus ?? fallbackBoundary,
    documentStatus: document?.ocrStatus ?? fallbackDocument,
  }
}

function mapPlanting(row: PlantingRow): PlantingRecord {
  return {
    id: row.id,
    plotId: row.plotId,
    season: row.season,
    plantingDate: isoDate(row.plantingDate),
    cropType: row.cropType,
    cropVariety: row.cropVariety ?? '',
    photoFileName: row.photoFile?.fileName ?? '',
    notes: row.notes ?? '',
    status: recordStatus(row.status),
  }
}

function mapHarvest(row: HarvestRow): HarvestRecord {
  return {
    id: row.id,
    plotId: row.plotId,
    season: row.season,
    harvestDate: isoDate(row.harvestDate),
    quantity: row.quantity,
    unit: unit(row.unit),
    traceabilityId: row.traceabilityId ?? '',
    photoFileName: row.photoFile?.fileName ?? '',
    notes: row.notes ?? '',
    status: harvestStatus(row.status),
  }
}

function mapVerification(row: VerificationRow): Verification {
  return {
    id: row.id,
    plotId: row.plotId,
    harvestRecordId: row.harvestRecordId ?? undefined,
    status: row.status,
    riskLevel: riskLevel(row.riskLevel),
    issueSummary: row.issueSummary ?? '',
    resultNotes: row.resultNotes ?? '',
    evidenceCount: row.evidence.length,
  }
}

function mapToken(row: {
  id: string
  plotId: string
  harvestRecordId: string | null
  tokenAmount: number
  carbonSavedKg: number
  status: string
  traceabilityId: string
}): TokenLot {
  return {
    id: row.id,
    plotId: row.plotId,
    harvestRecordId: row.harvestRecordId ?? undefined,
    tokenAmount: row.tokenAmount,
    carbonSavedKg: row.carbonSavedKg,
    status: tokenStatus(row.status),
    traceabilityId: row.traceabilityId,
  }
}

function mapListing(row: {
  id: string
  plotId: string
  harvestRecordId: string | null
  tokenLotId: string | null
  productName: string
  quantity: number
  unit: string
  price: Prisma.Decimal
  buyerVisibility: string
  status: MarketplaceListing['status']
}): MarketplaceListing {
  return {
    id: row.id,
    plotId: row.plotId,
    harvestRecordId: row.harvestRecordId ?? '',
    tokenLotId: row.tokenLotId ?? undefined,
    productName: row.productName,
    quantity: row.quantity,
    unit: unit(row.unit),
    price: Number(row.price),
    buyerVisibility: row.buyerVisibility === 'approved_buyers' ? 'approved_buyers' : 'public',
    status: row.status,
  }
}

function mapUploadedFile(row: {
  id: string
  farmerId: string | null
  fileName: string
  fileType: string
  purpose: string
  storageProvider: string
  storageKey: string | null
  bucket: string | null
  sizeBytes: number | null
  checksum: string | null
  uploadStatus: string
  uploadedAt: Date | null
  createdAt: Date
}): UploadedFile {
  return {
    id: row.id,
    farmerId: row.farmerId ?? '',
    fileName: row.fileName,
    fileType: row.fileType,
    purpose: row.purpose,
    storageProvider: row.storageProvider,
    storageKey: row.storageKey ?? '',
    bucket: row.bucket ?? undefined,
    sizeBytes: row.sizeBytes ?? undefined,
    checksum: row.checksum ?? undefined,
    uploadStatus: (row.uploadStatus as any) || 'pending',
    uploadedAt: row.uploadedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

function mapLandDocument(row: {
  id: string
  plotId: string
  uploadedFileId: string | null
  documentType: string
  ocrStatus: string
  boundaryStatus: string
  externalRequestId: string | null
  provider: string | null
  providerStatus: string | null
  providerErrorCode: string | null
  providerErrorMessage: string | null
  ocrResult: any
  boundaryGeojson: any
  submittedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): LandDocument {
  return {
    id: row.id,
    plotId: row.plotId,
    uploadedFileId: row.uploadedFileId ?? undefined,
    documentType: row.documentType,
    ocrStatus: row.ocrStatus,
    boundaryStatus: row.boundaryStatus,
    externalRequestId: row.externalRequestId ?? undefined,
    provider: row.provider ?? undefined,
    providerStatus: row.providerStatus ?? undefined,
    providerErrorCode: row.providerErrorCode ?? undefined,
    providerErrorMessage: row.providerErrorMessage ?? undefined,
    ocrResult: row.ocrResult ?? undefined,
    boundaryGeojson: row.boundaryGeojson ?? undefined,
    submittedAt: row.submittedAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export class PrismaRepository implements Repository {
  constructor(private readonly prisma: AppPrismaClient) {}

  private async requireOwnedPlot(client: Prisma.TransactionClient, farmerId: string, plotId: string) {
    const plot = await client.plot.findFirst({
      where: { id: plotId, farmerId },
      select: { id: true },
    })
    if (!plot) throw httpError('Plot not found', 404)
    return plot
  }

  private async updateWorkflow(
    client: Prisma.TransactionClient,
    farmerId: string,
    status: WorkflowStatus,
    label = `Workflow advanced to ${status}`,
  ) {
    await client.farmerProfile.update({
      where: { id: farmerId },
      data: { workflowStatus: status },
    })
    await client.workflowEvent.create({
      data: {
        farmerId,
        status,
        label,
        metadata: { source: 'api' },
      },
    })
  }

  async getAppData(farmerId: string): Promise<AppData> {
    const [
      profileRow,
      plotRows,
      plantingRows,
      harvestRows,
      verificationRows,
      tokenRows,
      listingRows,
    ] = await Promise.all([
      this.prisma.farmerProfile.findUnique({ where: { id: farmerId } }),
      this.prisma.plot.findMany({
        where: { farmerId },
        include: { landDocuments: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plantingRecord.findMany({
        where: { plot: { farmerId } },
        include: { photoFile: true },
        orderBy: { plantingDate: 'desc' },
      }),
      this.prisma.harvestRecord.findMany({
        where: { plot: { farmerId } },
        include: { photoFile: true },
        orderBy: { harvestDate: 'desc' },
      }),
      this.prisma.verification.findMany({
        where: { plot: { farmerId } },
        include: { evidence: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.carbonTokenLot.findMany({
        where: { plot: { farmerId } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketplaceListing.findMany({
        where: { plot: { farmerId } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!profileRow) {
      throw httpError(`Farmer profile ${farmerId} not found`, 404)
    }

    const profile = mapProfile(profileRow)
    const plots = plotRows.map(mapPlot)
    const plantingRecords = plantingRows.map(mapPlanting)
    const harvestRecords = harvestRows.map(mapHarvest)
    const verifications = verificationRows.map(mapVerification)
    const tokens = tokenRows.map(mapToken)
    const marketplaceListings = listingRows.map(mapListing)
    const totalHarvestTons = harvestRecords.reduce(
      (sum, record) => sum + (record.unit === 'ton' ? record.quantity : record.quantity / 1000),
      0,
    )

    return {
      profile,
      workflow: buildWorkflow(profile.workflowStatus),
      summary: {
        registeredPlots: plots.length,
        verifiedPlots: plots.filter((plot) => plot.status === 'verified').length,
        pendingReview: verifications.filter(
          (verification) => verification.status === 'pending' || verification.status === 'checking_burn',
        ).length,
        tokenBalance: tokens.reduce((sum, token) => sum + token.tokenAmount, 0),
        totalHarvestTons,
        marketplaceStatus: marketplaceListings.some((listing) => listing.status === 'listed')
          ? 'เปิดขายแล้ว'
          : 'รออนุมัติขาย',
      },
      plots,
      plantingRecords,
      harvestRecords,
      verifications,
      tokens,
      marketplaceListings,
    }
  }

  async setWorkflow(farmerId: string, status: WorkflowStatus) {
    await this.prisma.$transaction((client) => this.updateWorkflow(client, farmerId, status))
    return buildWorkflow(status)
  }

  async updateProfile(farmerId: string, input: ProfileUpdate) {
    const workflowStatus = input.workflowStatus ?? 'deed_captured'
    const row = await this.prisma.$transaction(async (client) => {
      const profile = await client.farmerProfile.update({
        where: { id: farmerId },
        data: {
          ownerName: input.ownerName,
          phone: input.phone,
          farmName: input.farmName,
          province: input.province,
          district: input.district,
          address: input.address,
          consent: input.consent,
          workflowStatus,
        },
      })
      await client.workflowEvent.create({
        data: {
          farmerId,
          status: workflowStatus,
          label: 'Farmer profile updated',
          metadata: { source: 'api' },
        },
      })
      return profile
    })
    return mapProfile(row)
  }

  async createPlot(farmerId: string, input: CreatePlotInput, document: PlotDocumentInput = {}) {
    const row = await this.prisma.$transaction(async (client) => {
      const farmer = await client.farmerProfile.findUnique({
        where: { id: farmerId },
        select: { province: true, district: true },
      })
      if (!farmer) throw httpError(`Farmer profile ${farmerId} not found`, 404)

      const uploadedFile = document.uploadedFileId
        ? await client.uploadedFile.findUnique({
            where: { id: document.uploadedFileId },
          })
        : document.fileName
        ? await client.uploadedFile.create({
            data: {
              farmerId,
              fileName: document.fileName,
              fileType: 'image/jpeg',
              purpose: 'land_document',
            },
          })
        : undefined

      const plot = await client.plot.create({
        data: {
          farmerId,
          name: input.name,
          cropType: input.cropType,
          cropVariety: input.cropVariety || null,
          areaRai: input.areaRai,
          province: farmer.province,
          district: farmer.district,
          gps: input.gps || null,
          status: 'pending',
          riskLevel: 'low',
          landDocuments: {
            create: {
              uploadedFileId: uploadedFile?.id,
              ocrStatus: input.documentStatus,
              boundaryStatus: input.boundaryLabel,
              externalRequestId: document.externalRequestId,
              externalRawPayload: document.externalRawPayload === undefined
                ? undefined
                : jsonValue(document.externalRawPayload),
            },
          },
        },
        include: { landDocuments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      })
      await this.updateWorkflow(client, farmerId, 'deed_captured', 'Land document captured')
      return plot
    })
    return mapPlot(row)
  }

  async confirmBoundary(farmerId: string, plotId: string, boundaryLabel: string) {
    const row = await this.prisma.$transaction(async (client) => {
      const existing = await client.plot.findFirst({
        where: { id: plotId, farmerId },
        include: { landDocuments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      })
      if (!existing) return undefined

      if (existing.landDocuments[0]) {
        await client.landDocument.update({
          where: { id: existing.landDocuments[0].id },
          data: { boundaryStatus: boundaryLabel },
        })
      } else {
        await client.landDocument.create({
          data: { plotId, boundaryStatus: boundaryLabel, ocrStatus: 'mock_complete' },
        })
      }

      const plot = await client.plot.update({
        where: { id: plotId },
        data: { status: 'pending' },
        include: { landDocuments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      })
      await this.updateWorkflow(client, farmerId, 'boundary_confirmed', 'Plot boundary confirmed')
      return plot
    })
    return row ? mapPlot(row) : undefined
  }

  async createPlanting(farmerId: string, input: CreatePlantingInput) {
    const row = await this.prisma.$transaction(async (client) => {
      await this.requireOwnedPlot(client, farmerId, input.plotId)

      const photoFile = input.photoFileId
        ? await client.uploadedFile.findUnique({
            where: { id: input.photoFileId },
          })
        : input.photoFileName
        ? await client.uploadedFile.create({
            data: {
              farmerId,
              fileName: input.photoFileName,
              fileType: 'image/jpeg',
              purpose: 'planting_evidence',
            },
          })
        : undefined
      const record = await client.plantingRecord.create({
        data: {
          plotId: input.plotId,
          season: input.season,
          plantingDate: new Date(input.plantingDate),
          cropType: input.cropType,
          cropVariety: input.cropVariety || null,
          photoFileId: photoFile?.id,
          notes: input.notes || null,
          status: 'submitted',
        },
        include: { photoFile: true },
      })
      await this.updateWorkflow(client, farmerId, 'planting_recorded', 'Planting record submitted')
      return record
    })
    return mapPlanting(row)
  }

  async createHarvest(farmerId: string, input: CreateHarvestInput) {
    const row = await this.prisma.$transaction(async (client) => {
      await this.requireOwnedPlot(client, farmerId, input.plotId)

      const photoFile = input.photoFileId
        ? await client.uploadedFile.findUnique({
            where: { id: input.photoFileId },
          })
        : input.photoFileName
        ? await client.uploadedFile.create({
            data: {
              farmerId,
              fileName: input.photoFileName,
              fileType: 'image/jpeg',
              purpose: 'harvest_evidence',
            },
          })
        : undefined
      const record = await client.harvestRecord.create({
        data: {
          plotId: input.plotId,
          season: input.season,
          harvestDate: new Date(input.harvestDate),
          quantity: input.quantity,
          unit: input.unit,
          traceabilityId: `ZB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          photoFileId: photoFile?.id,
          notes: input.notes || null,
          status: 'submitted',
        },
        include: { photoFile: true },
      })
      await this.updateWorkflow(client, farmerId, 'harvest_recorded', 'Harvest record submitted')
      return record
    })
    return mapHarvest(row)
  }

  async submitEvidence(farmerId: string, plotId: string, notes: string, evidence: EvidenceInput = {}) {
    const row = await this.prisma.$transaction(async (client) => {
      await this.requireOwnedPlot(client, farmerId, plotId)

      const harvest = await client.harvestRecord.findFirst({
        where: { plotId, plot: { farmerId } },
        orderBy: { harvestDate: 'desc' },
        select: { id: true },
      })
      const photoFile = evidence.uploadedFileId
        ? await client.uploadedFile.findUnique({
            where: { id: evidence.uploadedFileId },
          })
        : evidence.photoFileName
        ? await client.uploadedFile.create({
            data: {
              farmerId,
              fileName: evidence.photoFileName,
              fileType: 'image/jpeg',
              purpose: 'burn_evidence',
            },
          })
        : undefined
      const verification = await client.verification.create({
        data: {
          plotId,
          harvestRecordId: harvest?.id,
          status: 'checking_burn',
          riskLevel: 'medium',
          issueSummary: notes,
          resultNotes: 'กำลังตรวจจาก mock adapter',
          evidence: {
            create: {
              uploadedFileId: photoFile?.id,
              description: notes,
              gps: evidence.gps,
              capturedAt: new Date(),
              externalRequestId: evidence.externalRequestId,
              externalRawPayload: evidence.externalRawPayload === undefined
                ? undefined
                : jsonValue(evidence.externalRawPayload),
            },
          },
        },
        include: { evidence: true },
      })
      await this.updateWorkflow(client, farmerId, 'checking_burn', 'Zero-Burn evidence submitted')
      return verification
    })
    return mapVerification(row)
  }

  async approveVerification(farmerId: string, plotId: string) {
    await this.prisma.$transaction(async (client) => {
      const verification = await client.verification.findFirst({
        where: { plotId, plot: { farmerId } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, harvestRecordId: true },
      })
      if (!verification) throw httpError('Verification not found', 404)

      await client.verification.updateMany({
        where: { plotId },
        data: {
          status: 'approved',
          resultNotes: 'ผ่าน Zero-Burn ได้รับ 120 แต้ม',
          checkedAt: new Date(),
        },
      })

      const availableToken = await client.carbonTokenLot.findFirst({
        where: { plotId, status: 'available' },
        select: { id: true },
      })
      if (!availableToken) {
        await client.carbonTokenLot.create({
          data: {
            plotId,
            harvestRecordId: verification.harvestRecordId,
            verificationId: verification.id,
            tokenAmount: 120,
            carbonSavedKg: 800,
            status: 'available',
            traceabilityId: `ZB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        })
      }
      await this.updateWorkflow(client, farmerId, 'token_available', 'Zero-Burn token issued')
    })
    return this.getAppData(farmerId)
  }

  async createListing(farmerId: string, input: CreateListingInput) {
    const row = await this.prisma.$transaction(async (client) => {
      await this.requireOwnedPlot(client, farmerId, input.plotId)

      const harvest = await client.harvestRecord.findUnique({
        where: { id: input.harvestRecordId },
        select: { plotId: true },
      })
      if (!harvest) throw httpError('Harvest record not found', 404)
      if (harvest.plotId !== input.plotId) {
        throw httpError('Harvest record does not belong to the selected plot', 400)
      }

      if (input.tokenLotId) {
        const token = await client.carbonTokenLot.findUnique({
          where: { id: input.tokenLotId },
          select: { plotId: true, harvestRecordId: true, status: true },
        })
        if (!token) throw httpError('Token lot not found', 404)
        if (token.plotId !== input.plotId || token.harvestRecordId !== input.harvestRecordId) {
          throw httpError('Token lot does not belong to the selected plot and harvest', 400)
        }
        if (token.status !== 'available') {
          throw httpError('Token lot is not available', 400)
        }
      }

      const listing = await client.marketplaceListing.create({
        data: {
          plotId: input.plotId,
          harvestRecordId: input.harvestRecordId,
          tokenLotId: input.tokenLotId,
          productName: input.productName,
          quantity: input.quantity,
          unit: input.unit,
          price: input.price,
          buyerVisibility: input.buyerVisibility,
          status: 'pending_approval',
        },
      })
      if (input.tokenLotId) {
        await client.carbonTokenLot.update({
          where: { id: input.tokenLotId },
          data: { status: 'attached' },
        })
      }
      await this.updateWorkflow(client, farmerId, 'listing_pending', 'Marketplace listing submitted')
      return listing
    })
    return mapListing(row)
  }

  async markListing(farmerId: string, status: 'listed' | 'sold') {
    await this.prisma.$transaction(async (client) => {
      const listing = await client.marketplaceListing.findFirst({
        where: { plot: { farmerId } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, tokenLotId: true },
      })
      if (!listing) throw httpError('Marketplace listing not found', 404)

      await client.marketplaceListing.update({
        where: { id: listing.id },
        data: { status },
      })
      if (status === 'sold' && listing.tokenLotId) {
        await client.carbonTokenLot.update({
          where: { id: listing.tokenLotId },
          data: { status: 'sold' },
        })
      }
      await this.updateWorkflow(client, farmerId, status, `Marketplace listing marked ${status}`)
    })
    return this.getAppData(farmerId)
  }

  async findProfileByAuthId(authUserId: string): Promise<FarmerProfile | undefined> {
    const row = await this.prisma.farmerProfile.findUnique({
      where: { authUserId },
    })
    return row ? mapProfile(row) : undefined
  }

  async createProfileWithAuth(authUserId: string, input: ProfileUpdate): Promise<FarmerProfile> {
    const row = await this.prisma.$transaction(async (client) => {
      const existing = await client.farmerProfile.findUnique({
        where: { authUserId },
      })
      if (existing) return existing

      const profile = await client.farmerProfile.create({
        data: {
          ownerName: input.ownerName ?? '',
          phone: input.phone ?? '',
          farmName: input.farmName ?? '',
          province: input.province ?? '',
          district: input.district ?? '',
          address: input.address ?? '',
          consent: input.consent ?? false,
          workflowStatus: 'deed_captured',
          authUserId,
        },
      })
      await client.workflowEvent.create({
        data: {
          farmerId: profile.id,
          status: 'deed_captured',
          label: 'Farmer profile created via auth bootstrap',
          metadata: { source: 'api' },
        },
      })
      return profile
    })
    return mapProfile(row)
  }

  async createUploadedFile(input: Omit<UploadedFile, 'id' | 'createdAt' | 'uploadedAt'>): Promise<UploadedFile> {
    const row = await this.prisma.uploadedFile.create({
      data: {
        farmerId: input.farmerId || null,
        fileName: input.fileName,
        fileType: input.fileType,
        purpose: input.purpose,
        storageProvider: input.storageProvider,
        storageKey: input.storageKey || null,
        bucket: input.bucket || null,
        sizeBytes: input.sizeBytes || null,
        uploadStatus: input.uploadStatus,
      },
    })
    return mapUploadedFile(row)
  }

  async getUploadedFile(id: string): Promise<UploadedFile | null> {
    const row = await this.prisma.uploadedFile.findUnique({
      where: { id },
    })
    return row ? mapUploadedFile(row) : null
  }

  async updateUploadedFileStatus(id: string, status: 'pending' | 'uploaded' | 'failed' | 'deleted', sizeBytes?: number): Promise<UploadedFile | null> {
    const data: any = { uploadStatus: status }
    if (status === 'uploaded') {
      data.uploadedAt = new Date()
      if (sizeBytes !== undefined) {
        data.sizeBytes = sizeBytes
      }
    }
    const row = await this.prisma.uploadedFile.update({
      where: { id },
      data,
    })
    return mapUploadedFile(row)
  }

  async getLandDocument(id: string): Promise<LandDocument | null> {
    const row = await this.prisma.landDocument.findUnique({
      where: { id },
    })
    return row ? mapLandDocument(row) : null
  }

  async updateLandDocument(id: string, update: Partial<LandDocument>): Promise<LandDocument | null> {
    const data: any = { ...update }
    if (update.ocrResult !== undefined) {
      data.ocrResult = update.ocrResult === null ? null : jsonValue(update.ocrResult)
    }
    if (update.boundaryGeojson !== undefined) {
      data.boundaryGeojson = update.boundaryGeojson === null ? null : jsonValue(update.boundaryGeojson)
    }
    if (update.submittedAt) data.submittedAt = new Date(update.submittedAt)
    if (update.completedAt) data.completedAt = new Date(update.completedAt)

    const row = await this.prisma.landDocument.update({
      where: { id },
      data,
    })
    return mapLandDocument(row)
  }

  async createLandDocument(plotId: string, uploadedFileId: string): Promise<LandDocument> {
    const row = await this.prisma.landDocument.create({
      data: {
        plotId,
        uploadedFileId,
        documentType: 'thai_land_title_deed',
        ocrStatus: 'pending_upload',
        boundaryStatus: 'pending_upload',
      },
    })
    return mapLandDocument(row)
  }
}
