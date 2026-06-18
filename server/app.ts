import { createClient } from '@supabase/supabase-js'
import cors from 'cors'
import crypto from 'crypto'
import express from 'express'
import { z } from 'zod'
import { createMockAdapters } from './adapters'
import type { ExternalAdapters } from './adapters'
import type { FarmerProfile } from './domain'
import type { Repository } from './repository'
import { MemoryRepository } from './repository'
import { createStorageAdapter, createLandDeedAdapter } from './adapters/createExternalAdapters'
import type { StorageAdapter, LandDeedAdapter } from './adapters/createExternalAdapters'

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      authUserId?: string
      farmer?: FarmerProfile
    }
  }
}

export interface CreateAppOptions {
  repository?: Repository
  adapters?: ExternalAdapters
  repositoryMode?: 'memory' | 'postgres'
  storageAdapter?: StorageAdapter
  landDeedAdapter?: LandDeedAdapter
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
  uploadedFileId: z.string().optional(),
})

const plantingSchema = z.object({
  plotId: z.string().min(1),
  season: z.string().default('2025/26'),
  plantingDate: z.string().min(1),
  cropType: z.string().default('อ้อย'),
  cropVariety: z.string().optional().default(''),
  photoFileName: z.string().optional().default('planting-evidence.jpg'),
  photoFileId: z.string().optional(),
  notes: z.string().optional().default(''),
})

const harvestSchema = z.object({
  plotId: z.string().min(1),
  season: z.string().default('2025/26'),
  harvestDate: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.enum(['kg', 'ton']).default('ton'),
  photoFileName: z.string().optional().default('harvest-evidence.jpg'),
  photoFileId: z.string().optional(),
  notes: z.string().optional().default(''),
})

const evidenceSchema = z.object({
  plotId: z.string().min(1),
  notes: z.string().min(1),
  photoFileName: z.string().optional().default('residue-evidence.jpg'),
  uploadedFileId: z.string().optional(),
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

  const storageMode = (process.env.STORAGE_MODE as 'mock' | 'supabase') ?? 'mock'
  const landDeedMode = (process.env.LAND_DEED_ADAPTER_MODE as 'mock' | 'http') ?? 'mock'

  const storageAdapter = options.storageAdapter ?? createStorageAdapter(storageMode)
  const landDeedAdapter = options.landDeedAdapter ?? createLandDeedAdapter(landDeedMode)
  const asyncRoute = (
    handler: (req: express.Request, res: express.Response) => Promise<void>,
  ): express.RequestHandler => (req, res, next) => {
    void handler(req, res).catch(next)
  }

  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  const authMode = process.env.AUTH_MODE ?? 'mock'
  const supabase = authMode === 'supabase'
    ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    : null

  const authMiddleware: express.RequestHandler = (req, res, next) => {
    void (async () => {
      try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Missing token' })
          return
        }
        const token = authHeader.split(' ')[1]
        if (!token) {
          res.status(401).json({ error: 'Missing token' })
          return
        }

        let authUserId: string
        if (authMode === 'supabase') {
          if (token.startsWith('mock-token-')) {
            res.status(401).json({ error: 'Mock tokens are not allowed in supabase auth mode' })
            return
          }
          const { data: { user }, error } = await supabase!.auth.getUser(token)
          if (error || !user) {
            res.status(401).json({ error: 'Invalid or expired token' })
            return
          }
          authUserId = user.id
        } else {
          if (token === 'mock-token-invalid' || token === 'expired') {
            res.status(401).json({ error: 'Invalid or expired token' })
            return
          }
          if (!token.startsWith('mock-token-')) {
            res.status(401).json({ error: 'Invalid token format' })
            return
          }
          const suffix = token.replace('mock-token-', '')
          authUserId = `${suffix}-auth-id`
        }

        req.authUserId = authUserId

        const profile = await repository.findProfileByAuthId(authUserId)
        if (profile) {
          req.farmer = profile
        }

        next()
      } catch (error) {
        next(error)
      }
    })()
  }

  const requireFarmer = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.farmer) {
      res.status(404).json({ error: 'Farmer profile not found' })
      return
    }
    next()
  }

  app.get('/api/v1/health', (_req, res) => {
    res.json(ok({ status: 'ok', repositoryMode }))
  })

  app.post('/api/v1/auth/profile', authMiddleware, asyncRoute(async (req, res) => {
    const authUserId = req.authUserId
    if (!authUserId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const existing = await repository.findProfileByAuthId(authUserId)
    if (existing) {
      res.json(ok(existing))
      return
    }
    const input = parseBody(profileSchema, req.body)
    const profile = await repository.createProfileWithAuth(authUserId, input)
    res.status(201).json(ok(profile))
  }))

  const uploadIntentSchema = z.object({
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    sizeBytes: z.coerce.number().positive(),
    purpose: z.enum(['land_deed', 'evidence', 'farm_record']),
  })

  function getBucketForPurpose(purpose: string): string {
    if (purpose === 'land_deed') return process.env.SUPABASE_LAND_DEEDS_BUCKET || 'land-deeds'
    if (purpose === 'evidence') return process.env.SUPABASE_EVIDENCE_BUCKET || 'evidence'
    return process.env.SUPABASE_FARM_RECORDS_BUCKET || 'farm-records'
  }

  function getSanitizedExtension(fileName: string, contentType: string): string {
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/)
    let ext = extMatch ? extMatch[1].toLowerCase() : ''
    if (!ext) {
      if (contentType === 'image/jpeg') ext = 'jpg'
      else if (contentType === 'image/png') ext = 'png'
      else if (contentType === 'application/pdf') ext = 'pdf'
      else if (contentType === 'video/mp4') ext = 'mp4'
    }
    if (ext === 'jpeg') ext = 'jpg'
    if (!['jpg', 'png', 'pdf', 'mp4'].includes(ext)) {
      throw Object.assign(new Error('Unsupported file extension'), { status: 400 })
    }
    return ext
  }

  app.post('/api/v1/uploads/intents', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const input = parseBody(uploadIntentSchema, req.body)

    const ext = getSanitizedExtension(input.fileName, input.contentType)
    if (input.purpose === 'land_deed') {
      if (!['jpg', 'png', 'pdf'].includes(ext)) {
        res.status(400).json({ error: 'Invalid file extension for land deed. Must be jpg, png, or pdf' })
        return
      }
      if (input.sizeBytes > 15 * 1024 * 1024) {
        res.status(400).json({ error: 'Land deed size exceeds 15 MB limit' })
        return
      }
    } else {
      if (!['jpg', 'png', 'mp4'].includes(ext)) {
        res.status(400).json({ error: 'Invalid file extension for evidence/record. Must be jpg, png, or mp4' })
        return
      }
      const maxRecordSize = Number(process.env.MAX_RECORD_SIZE_BYTES) || 50 * 1024 * 1024
      if (input.sizeBytes > maxRecordSize) {
        res.status(400).json({ error: `File size exceeds limit of ${maxRecordSize / (1024 * 1024)} MB` })
        return
      }
    }

    const uuid = crypto.randomUUID()
    const storageKey = `${farmerId}/${input.purpose}/${uuid}.${ext}`
    const bucket = getBucketForPurpose(input.purpose)

    const { signedUploadUrl, expiresAt } = await storageAdapter.createSignedUploadUrl(bucket, storageKey)

    const uploadedFile = await repository.createUploadedFile({
      farmerId,
      fileName: input.fileName,
      fileType: input.contentType,
      purpose: input.purpose,
      storageProvider: storageMode === 'supabase' ? 'supabase' : 'prototype_metadata',
      storageKey,
      bucket,
      sizeBytes: input.sizeBytes,
      uploadStatus: 'pending',
    })

    res.status(201).json(ok({
      uploadId: uploadedFile.id,
      bucket,
      storageKey,
      signedUploadUrl,
      expiresAt,
    }))
  }))

  app.post('/api/v1/uploads/:uploadId/complete', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const fileId = String(req.params.uploadId)

    const file = await repository.getUploadedFile(fileId)
    if (!file) {
      res.status(404).json({ error: 'Upload intent not found' })
      return
    }

    if (file.farmerId !== farmerId) {
      res.status(403).json({ error: 'Forbidden: This upload belongs to another farmer' })
      return
    }

    const isVerified = await storageAdapter.verifyObject(file.bucket!, file.storageKey!, file.sizeBytes, file.fileType)
    if (!isVerified) {
      await repository.updateUploadedFileStatus(fileId, 'failed')
      res.status(400).json({ error: 'Object verification in storage failed' })
      return
    }

    const updated = await repository.updateUploadedFileStatus(fileId, 'uploaded', file.sizeBytes)
    res.json(ok(updated))
  }))

  app.post('/api/v1/plots/:plotId/land-documents', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const plotId = String(req.params.plotId)
    const uploadedFileId = String(req.body.uploadedFileId)

    if (!req.body.uploadedFileId) {
      res.status(400).json({ error: 'Missing uploadedFileId' })
      return
    }

    const plots = await repository.getAppData(farmerId)
    const ownsPlot = plots.plots.some((p) => p.id === plotId)
    if (!ownsPlot) {
      res.status(403).json({ error: 'Forbidden: You do not own this plot' })
      return
    }

    const file = await repository.getUploadedFile(uploadedFileId)
    if (!file || file.farmerId !== farmerId || file.uploadStatus !== 'uploaded') {
      res.status(400).json({ error: 'Invalid or incomplete uploaded file' })
      return
    }

    const doc = await repository.createLandDocument(plotId, uploadedFileId)
    res.status(201).json(ok(doc))
  }))

  app.post('/api/v1/land-documents/:id/process', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const docId = String(req.params.id)

    const doc = await repository.getLandDocument(docId)
    if (!doc) {
      res.status(404).json({ error: 'Land document not found' })
      return
    }

    const plots = await repository.getAppData(farmerId)
    const ownsPlot = plots.plots.some((p) => p.id === doc.plotId)
    if (!ownsPlot) {
      res.status(403).json({ error: 'Forbidden: You do not own this plot' })
      return
    }

    if (!doc.uploadedFileId) {
      res.status(400).json({ error: 'No uploaded file attached to this document' })
      return
    }

    const file = await repository.getUploadedFile(doc.uploadedFileId)
    if (!file || file.uploadStatus !== 'uploaded') {
      res.status(400).json({ error: 'File is not fully uploaded' })
      return
    }

    const { signedDownloadUrl } = await storageAdapter.createSignedDownloadUrl(file.bucket!, file.storageKey!)

    await repository.updateLandDocument(docId, {
      ocrStatus: 'queued',
      boundaryStatus: 'queued',
      submittedAt: new Date().toISOString(),
    })

    try {
      const job = await landDeedAdapter.submit({
        landDocumentId: docId,
        documentUrl: signedDownloadUrl,
      })

      const updated = await repository.updateLandDocument(docId, {
        ocrStatus: 'processing',
        boundaryStatus: 'processing',
        externalRequestId: job.requestId,
        provider: 'external_deed_ocr',
        providerStatus: job.status,
      })

      res.json(ok(updated))
    } catch (err: any) {
      const updated = await repository.updateLandDocument(docId, {
        ocrStatus: 'failed',
        boundaryStatus: 'failed',
        providerStatus: 'failed',
        providerErrorCode: 'PROVIDER_UNAVAILABLE',
        providerErrorMessage: err?.message || 'Failed to submit job to land deed provider',
      })
      res.status(500).json({ error: err?.message || 'Failed to submit job to land deed provider', details: updated })
    }
  }))

  app.get('/api/v1/land-documents/:id/status', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const docId = String(req.params.id)

    const doc = await repository.getLandDocument(docId)
    if (!doc) {
      res.status(404).json({ error: 'Land document not found' })
      return
    }

    const plots = await repository.getAppData(farmerId)
    const ownsPlot = plots.plots.some((p) => p.id === doc.plotId)
    if (!ownsPlot) {
      res.status(403).json({ error: 'Forbidden: You do not own this plot' })
      return
    }

    if ((doc.ocrStatus === 'queued' || doc.ocrStatus === 'processing') && doc.externalRequestId) {
      try {
        const result = await landDeedAdapter.getResult(doc.externalRequestId)
        if (result.status === 'succeeded' && result.document && result.boundary) {
          const boundaryLabel = `ตรวจสอบขอบเขต (${result.document.area.rai} ไร่)`
          await repository.updateLandDocument(docId, {
            ocrStatus: 'complete',
            boundaryStatus: 'complete',
            providerStatus: 'succeeded',
            ocrResult: result.document,
            boundaryGeojson: result.boundary,
            completedAt: new Date().toISOString(),
          })

          await repository.confirmBoundary(farmerId, doc.plotId, boundaryLabel)

          const freshDoc = await repository.getLandDocument(docId)
          res.json(ok(freshDoc))
          return
        } else if (result.status === 'failed') {
          const error = result.error || { code: 'DOCUMENT_UNREADABLE', message: 'OCR process failed' }
          const updated = await repository.updateLandDocument(docId, {
            ocrStatus: 'failed',
            boundaryStatus: 'failed',
            providerStatus: 'failed',
            providerErrorCode: error.code,
            providerErrorMessage: error.message,
            completedAt: new Date().toISOString(),
          })
          res.json(ok(updated))
          return
        }
      } catch (err: any) {
        console.error('Failed to poll land deed job status:', err)
      }
    }

    res.json(ok(doc))
  }))

  app.post('/api/v1/integrations/land-deed/webhook', asyncRoute(async (_req, res) => {
    res.json(ok({ status: 'received' }))
  }))

  app.get('/api/v1/bootstrap', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok(await repository.getAppData(farmerId)))
  }))

  app.get('/api/v1/me/workflow', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok((await repository.getAppData(farmerId)).workflow))
  }))

  app.get('/api/v1/profile', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok((await repository.getAppData(farmerId)).profile))
  }))

  app.patch('/api/v1/profile', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const input = parseBody(profileSchema, req.body)
    res.json(ok(await repository.updateProfile(farmerId, input as Partial<FarmerProfile>)))
  }))

  app.get('/api/v1/plots', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok((await repository.getAppData(farmerId)).plots))
  }))

  app.post('/api/v1/plots', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const input = parseBody(plotSchema, req.body)

    let boundary: any
    if (input.uploadedFileId) {
      const file = await repository.getUploadedFile(input.uploadedFileId)
      if (!file || file.farmerId !== farmerId || file.uploadStatus !== 'uploaded') {
        res.status(400).json({ error: 'Invalid or incomplete uploaded file' })
        return
      }
      boundary = await adapters.landBoundaryFromDocument(file.fileName)
    } else {
      boundary = await adapters.landBoundaryFromDocument(input.documentFileName)
    }

    const plot = await repository.createPlot(
      farmerId,
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
        fileName: input.uploadedFileId ? undefined : input.documentFileName,
        uploadedFileId: input.uploadedFileId,
        externalRequestId: boundary.externalRequestId,
        externalRawPayload: boundary,
      },
    )
    res.status(201).json(ok({ plot, boundary }))
  }))

  app.post('/api/v1/plots/:id/confirm-boundary', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const plot = await repository.confirmBoundary(farmerId, String(req.params.id), String(req.body?.boundaryLabel ?? 'ยืนยันขอบเขตแล้ว'))
    if (!plot) {
      res.status(404).json({ error: 'Plot not found' })
      return
    }
    res.json(ok(plot))
  }))

  app.get('/api/v1/records/planting', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok((await repository.getAppData(farmerId)).plantingRecords))
  }))

  app.post('/api/v1/records/planting', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const input = parseBody(plantingSchema, req.body)
    res.status(201).json(ok(await repository.createPlanting(farmerId, input)))
  }))

  app.get('/api/v1/records/harvest', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok((await repository.getAppData(farmerId)).harvestRecords))
  }))

  app.post('/api/v1/records/harvest', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const input = parseBody(harvestSchema, req.body)
    res.status(201).json(ok(await repository.createHarvest(farmerId, input)))
  }))

  app.get('/api/v1/verifications', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok((await repository.getAppData(farmerId)).verifications))
  }))

  app.post('/api/v1/verifications/evidence', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const input = parseBody(evidenceSchema, req.body)
    const result = await adapters.checkBurnEvidence(input.plotId)
    const verification = await repository.submitEvidence(farmerId, input.plotId, input.notes, {
      photoFileName: input.photoFileName,
      gps: input.gps,
      externalRequestId: result.externalRequestId,
      externalRawPayload: result,
      uploadedFileId: input.uploadedFileId,
    })
    res.status(201).json(ok({ verification, externalCheck: result }))
  }))

  app.post('/api/v1/verifications/:plotId/mock-approve', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok(await repository.approveVerification(farmerId, String(req.params.plotId))))
  }))

  app.get('/api/v1/tokens', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok((await repository.getAppData(farmerId)).tokens))
  }))

  app.get('/api/v1/marketplace/listings', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    res.json(ok((await repository.getAppData(farmerId)).marketplaceListings))
  }))

  app.post('/api/v1/marketplace/listings', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const input = parseBody(listingSchema, req.body)
    const listing = await repository.createListing(farmerId, input)
    const external = await adapters.createMarketplaceListing(listing.id)
    res.status(201).json(ok({ listing, external }))
  }))

  app.post('/api/v1/marketplace/listings/mock-status', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const status = req.body?.status === 'sold' ? 'sold' : 'listed'
    res.json(ok(await repository.markListing(farmerId, status)))
  }))

  app.post('/api/v1/workflow/mock-status', authMiddleware, requireFarmer, asyncRoute(async (req, res) => {
    const farmerId = req.farmer!.id
    const input = parseBody(workflowSchema, req.body)
    res.json(ok(await repository.setWorkflow(farmerId, input.status)))
  }))

  app.use((error: Error & { status?: number; details?: unknown }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    void next
    res.status(error.status ?? 500).json({ error: error.message, details: error.details })
  })

  return app
}
