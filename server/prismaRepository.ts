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

const FARMER_ID = 'farmer-somchai'

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

export class PrismaRepository implements Repository {
  constructor(private readonly prisma: AppPrismaClient) {}

  private async requireOwnedPlot(client: Prisma.TransactionClient, plotId: string) {
    const plot = await client.plot.findFirst({
      where: { id: plotId, farmerId: FARMER_ID },
      select: { id: true },
    })
    if (!plot) throw httpError('Plot not found', 404)
    return plot
  }

  private async updateWorkflow(
    client: Prisma.TransactionClient,
    status: WorkflowStatus,
    label = `Workflow advanced to ${status}`,
  ) {
    await client.farmerProfile.update({
      where: { id: FARMER_ID },
      data: { workflowStatus: status },
    })
    await client.workflowEvent.create({
      data: {
        farmerId: FARMER_ID,
        status,
        label,
        metadata: { source: 'api' },
      },
    })
  }

  async getAppData(): Promise<AppData> {
    const [
      profileRow,
      plotRows,
      plantingRows,
      harvestRows,
      verificationRows,
      tokenRows,
      listingRows,
    ] = await Promise.all([
      this.prisma.farmerProfile.findUnique({ where: { id: FARMER_ID } }),
      this.prisma.plot.findMany({
        where: { farmerId: FARMER_ID },
        include: { landDocuments: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plantingRecord.findMany({
        where: { plot: { farmerId: FARMER_ID } },
        include: { photoFile: true },
        orderBy: { plantingDate: 'desc' },
      }),
      this.prisma.harvestRecord.findMany({
        where: { plot: { farmerId: FARMER_ID } },
        include: { photoFile: true },
        orderBy: { harvestDate: 'desc' },
      }),
      this.prisma.verification.findMany({
        where: { plot: { farmerId: FARMER_ID } },
        include: { evidence: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.carbonTokenLot.findMany({
        where: { plot: { farmerId: FARMER_ID } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketplaceListing.findMany({
        where: { plot: { farmerId: FARMER_ID } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!profileRow) {
      throw httpError(`Farmer profile ${FARMER_ID} not found`, 404)
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

  async setWorkflow(status: WorkflowStatus) {
    await this.prisma.$transaction((client) => this.updateWorkflow(client, status))
    return buildWorkflow(status)
  }

  async updateProfile(input: ProfileUpdate) {
    const workflowStatus = input.workflowStatus ?? 'deed_captured'
    const row = await this.prisma.$transaction(async (client) => {
      const profile = await client.farmerProfile.update({
        where: { id: FARMER_ID },
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
          farmerId: FARMER_ID,
          status: workflowStatus,
          label: 'Farmer profile updated',
          metadata: { source: 'api' },
        },
      })
      return profile
    })
    return mapProfile(row)
  }

  async createPlot(input: CreatePlotInput, document: PlotDocumentInput = {}) {
    const row = await this.prisma.$transaction(async (client) => {
      const farmer = await client.farmerProfile.findUnique({
        where: { id: FARMER_ID },
        select: { province: true, district: true },
      })
      if (!farmer) throw httpError(`Farmer profile ${FARMER_ID} not found`, 404)

      const uploadedFile = document.fileName
        ? await client.uploadedFile.create({
            data: {
              farmerId: FARMER_ID,
              fileName: document.fileName,
              fileType: 'image/jpeg',
              purpose: 'land_document',
            },
          })
        : undefined

      const plot = await client.plot.create({
        data: {
          farmerId: FARMER_ID,
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
      await this.updateWorkflow(client, 'deed_captured', 'Land document captured')
      return plot
    })
    return mapPlot(row)
  }

  async confirmBoundary(plotId: string, boundaryLabel: string) {
    const row = await this.prisma.$transaction(async (client) => {
      const existing = await client.plot.findFirst({
        where: { id: plotId, farmerId: FARMER_ID },
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
      await this.updateWorkflow(client, 'boundary_confirmed', 'Plot boundary confirmed')
      return plot
    })
    return row ? mapPlot(row) : undefined
  }

  async createPlanting(input: CreatePlantingInput) {
    const row = await this.prisma.$transaction(async (client) => {
      await this.requireOwnedPlot(client, input.plotId)

      const photoFile = input.photoFileName
        ? await client.uploadedFile.create({
            data: {
              farmerId: FARMER_ID,
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
      await this.updateWorkflow(client, 'planting_recorded', 'Planting record submitted')
      return record
    })
    return mapPlanting(row)
  }

  async createHarvest(input: CreateHarvestInput) {
    const row = await this.prisma.$transaction(async (client) => {
      await this.requireOwnedPlot(client, input.plotId)

      const photoFile = input.photoFileName
        ? await client.uploadedFile.create({
            data: {
              farmerId: FARMER_ID,
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
      await this.updateWorkflow(client, 'harvest_recorded', 'Harvest record submitted')
      return record
    })
    return mapHarvest(row)
  }

  async submitEvidence(plotId: string, notes: string, evidence: EvidenceInput = {}) {
    const row = await this.prisma.$transaction(async (client) => {
      await this.requireOwnedPlot(client, plotId)

      const harvest = await client.harvestRecord.findFirst({
        where: { plotId, plot: { farmerId: FARMER_ID } },
        orderBy: { harvestDate: 'desc' },
        select: { id: true },
      })
      const photoFile = evidence.photoFileName
        ? await client.uploadedFile.create({
            data: {
              farmerId: FARMER_ID,
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
      await this.updateWorkflow(client, 'checking_burn', 'Zero-Burn evidence submitted')
      return verification
    })
    return mapVerification(row)
  }

  async approveVerification(plotId: string) {
    await this.prisma.$transaction(async (client) => {
      const verification = await client.verification.findFirst({
        where: { plotId, plot: { farmerId: FARMER_ID } },
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
      await this.updateWorkflow(client, 'token_available', 'Zero-Burn token issued')
    })
    return this.getAppData()
  }

  async createListing(input: CreateListingInput) {
    const row = await this.prisma.$transaction(async (client) => {
      await this.requireOwnedPlot(client, input.plotId)

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
      await this.updateWorkflow(client, 'listing_pending', 'Marketplace listing submitted')
      return listing
    })
    return mapListing(row)
  }

  async markListing(status: 'listed' | 'sold') {
    await this.prisma.$transaction(async (client) => {
      const listing = await client.marketplaceListing.findFirst({
        where: { plot: { farmerId: FARMER_ID } },
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
      await this.updateWorkflow(client, status, `Marketplace listing marked ${status}`)
    })
    return this.getAppData()
  }
}
