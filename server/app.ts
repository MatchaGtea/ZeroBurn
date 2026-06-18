import cors from 'cors'
import express from 'express'
import { z } from 'zod'
import { createMockAdapters } from './adapters'
import type { ExternalAdapters } from './adapters'
import type { FarmerProfile } from './domain'
import type { Repository } from './repository'
import { MemoryRepository } from './repository'

export interface CreateAppOptions {
  repository?: Repository
  adapters?: ExternalAdapters
  repositoryMode?: 'memory' | 'postgres'
}

function ok<T>(data: T) {
  return { data }
}

function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw Object.assign(new Error(issue?.message ?? 'Invalid request'), { status: 400, details: parsed.error.flatten() })
  }
  return parsed.data
}

const profileSchema = z.object({
  ownerName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  farmName: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  address: z.string().optional(),
  consent: z.boolean().optional(),
})

const plotSchema = z.object({
  name: z.string().min(1),
  cropType: z.string().min(1),
  cropVariety: z.string().optional().default(''),
  areaRai: z.coerce.number().positive(),
  gps: z.string().optional().default('GPS ปัจจุบัน'),
  boundaryLabel: z.string().optional().default('รอยืนยันขอบเขต'),
  documentStatus: z.string().optional().default('อัปโหลดเอกสารแล้ว'),
  documentFileName: z.string().optional().default('title-deed-mock.jpg'),
})

const plantingSchema = z.object({
  plotId: z.string().min(1),
  season: z.string().default('2025/26'),
  plantingDate: z.string().min(1),
  cropType: z.string().default('อ้อย'),
  cropVariety: z.string().optional().default(''),
  photoFileName: z.string().optional().default('planting-evidence.jpg'),
  notes: z.string().optional().default(''),
})

const harvestSchema = z.object({
  plotId: z.string().min(1),
  season: z.string().default('2025/26'),
  harvestDate: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.enum(['kg', 'ton']).default('ton'),
  photoFileName: z.string().optional().default('harvest-evidence.jpg'),
  notes: z.string().optional().default(''),
})

const evidenceSchema = z.object({
  plotId: z.string().min(1),
  notes: z.string().min(1),
  photoFileName: z.string().optional().default('residue-evidence.jpg'),
  gps: z.string().optional(),
})

const listingSchema = z.object({
  plotId: z.string().min(1),
  harvestRecordId: z.string().min(1),
  tokenLotId: z.string().optional(),
  productName: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.enum(['kg', 'ton']).default('ton'),
  price: z.coerce.number().positive(),
  buyerVisibility: z.enum(['public', 'approved_buyers']).default('public'),
})

const workflowSchema = z.object({
  status: z.enum([
    'registration',
    'deed_captured',
    'boundary_confirmed',
    'planting_recorded',
    'harvest_recorded',
    'evidence_submitted',
    'checking_burn',
    'approved',
    'rejected',
    'token_available',
    'listing_pending',
    'listed',
    'sold',
  ]),
})

export function createApp(options: CreateAppOptions = {}) {
  const app = express()
  const repository = options.repository ?? new MemoryRepository()
  const adapters = options.adapters ?? createMockAdapters()
  const repositoryMode = options.repositoryMode ?? 'memory'
  const asyncRoute = (
    handler: (req: express.Request, res: express.Response) => Promise<void>,
  ): express.RequestHandler => (req, res, next) => {
    void handler(req, res).catch(next)
  }

  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/v1/health', (_req, res) => {
    res.json(ok({ status: 'ok', repositoryMode }))
  })

  app.get('/api/v1/bootstrap', asyncRoute(async (_req, res) => {
    res.json(ok(await repository.getAppData()))
  }))

  app.get('/api/v1/me/workflow', asyncRoute(async (_req, res) => {
    res.json(ok((await repository.getAppData()).workflow))
  }))

  app.get('/api/v1/profile', asyncRoute(async (_req, res) => {
    res.json(ok((await repository.getAppData()).profile))
  }))

  app.patch('/api/v1/profile', asyncRoute(async (req, res) => {
    const input = parseBody(profileSchema, req.body)
    res.json(ok(await repository.updateProfile(input as Partial<FarmerProfile>)))
  }))

  app.get('/api/v1/plots', asyncRoute(async (_req, res) => {
    res.json(ok((await repository.getAppData()).plots))
  }))

  app.post('/api/v1/plots', asyncRoute(async (req, res) => {
    const input = parseBody(plotSchema, req.body)
    const boundary = await adapters.landBoundaryFromDocument(input.documentFileName)
    const plot = await repository.createPlot(
      {
        name: input.name,
        cropType: input.cropType,
        cropVariety: input.cropVariety,
        areaRai: input.areaRai,
        gps: input.gps,
        boundaryLabel: boundary.boundaryLabel,
        documentStatus: input.documentStatus,
      },
      {
        fileName: input.documentFileName,
        externalRequestId: boundary.externalRequestId,
        externalRawPayload: boundary,
      },
    )
    res.status(201).json(ok({ plot, boundary }))
  }))

  app.post('/api/v1/plots/:id/confirm-boundary', asyncRoute(async (req, res) => {
    const plot = await repository.confirmBoundary(String(req.params.id), String(req.body?.boundaryLabel ?? 'ยืนยันขอบเขตแล้ว'))
    if (!plot) {
      res.status(404).json({ error: 'Plot not found' })
      return
    }
    res.json(ok(plot))
  }))

  app.get('/api/v1/records/planting', asyncRoute(async (_req, res) => {
    res.json(ok((await repository.getAppData()).plantingRecords))
  }))

  app.post('/api/v1/records/planting', asyncRoute(async (req, res) => {
    const input = parseBody(plantingSchema, req.body)
    res.status(201).json(ok(await repository.createPlanting(input)))
  }))

  app.get('/api/v1/records/harvest', asyncRoute(async (_req, res) => {
    res.json(ok((await repository.getAppData()).harvestRecords))
  }))

  app.post('/api/v1/records/harvest', asyncRoute(async (req, res) => {
    const input = parseBody(harvestSchema, req.body)
    res.status(201).json(ok(await repository.createHarvest(input)))
  }))

  app.get('/api/v1/verifications', asyncRoute(async (_req, res) => {
    res.json(ok((await repository.getAppData()).verifications))
  }))

  app.post('/api/v1/verifications/evidence', asyncRoute(async (req, res) => {
    const input = parseBody(evidenceSchema, req.body)
    const result = await adapters.checkBurnEvidence(input.plotId)
    const verification = await repository.submitEvidence(input.plotId, input.notes, {
      photoFileName: input.photoFileName,
      gps: input.gps,
      externalRequestId: result.externalRequestId,
      externalRawPayload: result,
    })
    res.status(201).json(ok({ verification, externalCheck: result }))
  }))

  app.post('/api/v1/verifications/:plotId/mock-approve', asyncRoute(async (req, res) => {
    res.json(ok(await repository.approveVerification(String(req.params.plotId))))
  }))

  app.get('/api/v1/tokens', asyncRoute(async (_req, res) => {
    res.json(ok((await repository.getAppData()).tokens))
  }))

  app.get('/api/v1/marketplace/listings', asyncRoute(async (_req, res) => {
    res.json(ok((await repository.getAppData()).marketplaceListings))
  }))

  app.post('/api/v1/marketplace/listings', asyncRoute(async (req, res) => {
    const input = parseBody(listingSchema, req.body)
    const listing = await repository.createListing(input)
    const external = await adapters.createMarketplaceListing(listing.id)
    res.status(201).json(ok({ listing, external }))
  }))

  app.post('/api/v1/marketplace/listings/mock-status', asyncRoute(async (req, res) => {
    const status = req.body?.status === 'sold' ? 'sold' : 'listed'
    res.json(ok(await repository.markListing(status)))
  }))

  app.post('/api/v1/workflow/mock-status', asyncRoute(async (req, res) => {
    const input = parseBody(workflowSchema, req.body)
    res.json(ok(await repository.setWorkflow(input.status)))
  }))

  app.use((error: Error & { status?: number; details?: unknown }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    void next
    res.status(error.status ?? 500).json({ error: error.message, details: error.details })
  })

  return app
}
