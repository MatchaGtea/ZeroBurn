import { fallbackAppData, createWorkflow } from '../data/mockData'
import type {
  AppData,
  WorkflowSnapshot,
  Plot,
  PlantingRecord,
  HarvestRecord,
  Verification,
  MarketplaceListing,
  FarmerProfile,
  WorkflowStatus
} from '../data/types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4184/api/v1'
const USE_LOCAL_DATA = import.meta.env.PROD && !import.meta.env.VITE_API_BASE

type ApiEnvelope<T> = { data: T }

export class ApiResponseError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    Object.setPrototypeOf(this, ApiResponseError.prototype)
  }
}

// LocalStorage Mock system
const LS_KEY = 'zeroburn_app_data'

function getLocalData(): AppData {
  if (typeof window === 'undefined') return fallbackAppData
  const stored = localStorage.getItem(LS_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // ignore parsing error, return fallback
    }
  }
  localStorage.setItem(LS_KEY, JSON.stringify(fallbackAppData))
  return fallbackAppData
}

function saveLocalData(data: AppData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  }
}

function localUpdateProfile(input: Partial<FarmerProfile>): FarmerProfile {
  const data = getLocalData()
  const updatedProfile = {
    ...data.profile,
    ...input,
    workflowStatus: (input.workflowStatus ?? 'deed_captured') as WorkflowStatus
  }
  data.profile = updatedProfile
  data.workflow = createWorkflow(updatedProfile.workflowStatus)
  saveLocalData(data)
  return updatedProfile
}

function localCreatePlot(input: Omit<Plot, 'id' | 'status' | 'riskLevel'>): Plot {
  const data = getLocalData()
  const plot: Plot = {
    ...input,
    id: `plot-${Date.now()}`,
    status: 'pending',
    riskLevel: 'low'
  }
  data.plots = [plot, ...data.plots]
  data.summary.registeredPlots = data.plots.length
  data.profile.workflowStatus = 'deed_captured'
  data.workflow = createWorkflow('deed_captured')
  saveLocalData(data)
  return plot
}

function localCreatePlanting(input: Omit<PlantingRecord, 'id' | 'status'>): PlantingRecord {
  const data = getLocalData()
  const record: PlantingRecord = {
    ...input,
    id: `PLR-${Date.now()}`,
    status: 'submitted'
  }
  data.plantingRecords = [record, ...data.plantingRecords]
  data.profile.workflowStatus = 'planting_recorded'
  data.workflow = createWorkflow('planting_recorded')
  saveLocalData(data)
  return record
}

function localCreateHarvest(input: Omit<HarvestRecord, 'id' | 'status' | 'traceabilityId'>): HarvestRecord {
  const data = getLocalData()
  const record: HarvestRecord = {
    ...input,
    id: `HAR-${Date.now()}`,
    status: 'submitted',
    traceabilityId: `ZB-2026-${String(data.harvestRecords.length + 1).padStart(3, '0')}`
  }
  data.harvestRecords = [record, ...data.harvestRecords]
  data.profile.workflowStatus = 'harvest_recorded'
  data.workflow = createWorkflow('harvest_recorded')

  // Update total harvest tons
  const totalHarvestTons = data.harvestRecords.reduce((sum, r) => sum + (r.unit === 'ton' ? r.quantity : r.quantity / 1000), 0)
  data.summary.totalHarvestTons = totalHarvestTons

  saveLocalData(data)
  return record
}

function localSubmitEvidence(plotId: string, notes: string): Verification {
  const data = getLocalData()
  const verification: Verification = {
    id: `VER-${Date.now()}`,
    plotId,
    status: 'checking_burn',
    riskLevel: 'medium',
    issueSummary: notes,
    resultNotes: 'กำลังตรวจจาก mock adapter',
    evidenceCount: 1
  }
  data.verifications = [verification, ...data.verifications]
  data.summary.pendingReview = data.verifications.filter((item) => item.status === 'pending' || item.status === 'checking_burn').length
  data.profile.workflowStatus = 'checking_burn'
  data.workflow = createWorkflow('checking_burn')
  saveLocalData(data)
  return verification
}

function localApproveVerification(plotId: string): AppData {
  const data = getLocalData()
  data.verifications = data.verifications.map((item, index) =>
    index === 0 || item.plotId === plotId ? { ...item, status: 'approved', resultNotes: 'ผ่าน Zero-Burn ได้รับ 120 แต้ม' } : item
  )
  if (!data.tokens.some((token) => token.plotId === plotId && token.status === 'available')) {
    data.tokens = [
      {
        id: `ZBT-${Date.now()}`,
        plotId,
        harvestRecordId: data.harvestRecords.find(h => h.plotId === plotId)?.id ?? 'HAR-001',
        tokenAmount: 120,
        carbonSavedKg: 800,
        status: 'available',
        traceabilityId: `ZB-2026-${data.tokens.length + 1}`
      },
      ...data.tokens
    ]
  }
  data.profile.workflowStatus = 'token_available'
  data.workflow = createWorkflow('token_available')
  data.summary.tokenBalance = data.tokens.reduce((sum, token) => sum + token.tokenAmount, 0)
  data.summary.pendingReview = data.verifications.filter((item) => item.status === 'pending' || item.status === 'checking_burn').length

  // Set plot status to verified
  data.plots = data.plots.map(p => p.id === plotId ? { ...p, status: 'verified' } : p)
  data.summary.verifiedPlots = data.plots.filter(p => p.status === 'verified').length

  saveLocalData(data)
  return data
}

function localCreateListing(input: Omit<MarketplaceListing, 'id' | 'status'>): MarketplaceListing {
  const data = getLocalData()
  const listing: MarketplaceListing = {
    ...input,
    id: `MKT-${Date.now()}`,
    status: 'pending_approval'
  }
  data.marketplaceListings = [listing, ...data.marketplaceListings]
  data.profile.workflowStatus = 'listing_pending'
  data.workflow = createWorkflow('listing_pending')
  data.summary.marketplaceStatus = 'รออนุมัติขาย'
  saveLocalData(data)
  return listing
}

function localMarkListing(status: 'listed' | 'sold'): AppData {
  const data = getLocalData()
  data.marketplaceListings = data.marketplaceListings.map((listing, index) =>
    index === 0 ? { ...listing, status } : listing
  )
  data.profile.workflowStatus = status
  data.workflow = createWorkflow(status)
  data.summary.marketplaceStatus = status === 'listed' ? 'เปิดขายแล้ว' : 'ขายสำเร็จแล้ว'
  saveLocalData(data)
  return data
}

function localSetWorkflow(status: WorkflowStatus): WorkflowSnapshot {
  const data = getLocalData()
  data.profile.workflowStatus = status
  data.workflow = createWorkflow(status)
  saveLocalData(data)
  return data.workflow
}

let useMockFallback = USE_LOCAL_DATA

function handleMockRequest<T>(path: string, init?: RequestInit): T {
  const body = init?.body ? JSON.parse(init.body as string) : undefined

  if (path === '/bootstrap') {
    return getLocalData() as unknown as T
  }
  if (path === '/auth/profile') {
    return localUpdateProfile(body ?? {}) as unknown as T
  }
  if (path === '/profile') {
    if (init?.method === 'PATCH') {
      return localUpdateProfile(body) as unknown as T
    }
    return getLocalData().profile as unknown as T
  }
  if (path === '/plots') {
    if (init?.method === 'POST') {
      const plot = localCreatePlot(body)
      const boundary = {
        externalRequestId: `ext-${Date.now()}`,
        boundaryLabel: 'ระบบช่วยลากขอบเขตให้แล้ว',
        status: 'success'
      }
      return { plot, boundary } as unknown as T
    }
    return getLocalData().plots as unknown as T
  }
  if (path.startsWith('/plots/') && path.endsWith('/confirm-boundary')) {
    const plotId = path.split('/')[2]
    const data = getLocalData()
    const plot = data.plots.find(p => p.id === plotId)
    if (plot) {
      plot.boundaryLabel = body?.boundaryLabel ?? 'ยืนยันขอบเขตแล้ว'
      plot.status = 'pending'
      localSetWorkflow('boundary_confirmed')
      saveLocalData(data)
    }
    return plot as unknown as T
  }
  if (path === '/records/planting') {
    if (init?.method === 'POST') {
      return localCreatePlanting(body) as unknown as T
    }
    return getLocalData().plantingRecords as unknown as T
  }
  if (path === '/records/harvest') {
    if (init?.method === 'POST') {
      return localCreateHarvest(body) as unknown as T
    }
    return getLocalData().harvestRecords as unknown as T
  }
  if (path === '/verifications/evidence') {
    if (init?.method === 'POST') {
      const verification = localSubmitEvidence(body.plotId, body.notes)
      return {
        verification,
        externalCheck: {
          externalRequestId: `ext-${Date.now()}`,
          status: 'success'
        }
      } as unknown as T
    }
    return getLocalData().verifications as unknown as T
  }
  if (path.startsWith('/verifications/') && path.endsWith('/mock-approve')) {
    const plotId = path.split('/')[2]
    return localApproveVerification(plotId) as unknown as T
  }
  if (path === '/tokens') {
    return getLocalData().tokens as unknown as T
  }
  if (path === '/marketplace/listings') {
    if (init?.method === 'POST') {
      const listing = localCreateListing(body)
      const external = {
        externalListingId: `ext-mkt-${Date.now()}`,
        status: 'success'
      }
      return { listing, external } as unknown as T
    }
    return getLocalData().marketplaceListings as unknown as T
  }
  if (path === '/marketplace/listings/mock-status') {
    const status = body?.status === 'sold' ? 'sold' : 'listed'
    return localMarkListing(status) as unknown as T
  }
  if (path === '/workflow/mock-status') {
    return localSetWorkflow(body.status) as unknown as T
  }

  throw new Error(`Mock endpoint not implemented: ${path}`)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (useMockFallback) {
    return handleMockRequest<T>(path, init)
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('zeroburn_auth_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${path}`, {
      headers: { ...headers, ...init?.headers },
      ...init,
    })
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as { error?: string } | null
      throw new ApiResponseError(errorBody?.error ?? `${response.status} ${response.statusText}`, response.status)
    }
    const json = (await response.json()) as ApiEnvelope<T> | T
    return 'data' in (json as ApiEnvelope<T>) ? (json as ApiEnvelope<T>).data : (json as T)
  } catch (err) {
    if (err instanceof ApiResponseError) {
      throw err
    }
    console.warn(`API request to ${path} failed, falling back to LocalStorage mock.`, err)
    useMockFallback = true
    return handleMockRequest<T>(path, init)
  }
}

export function refreshAppData(): Promise<AppData> {
  return request<AppData>('/bootstrap')
}

export async function loadAppData(): Promise<AppData> {
  try {
    return await refreshAppData()
  } catch {
    return fallbackAppData
  }
}

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
}

export function setWorkflowStatus(status: string): Promise<WorkflowSnapshot> {
  return postJson<WorkflowSnapshot>('/workflow/mock-status', { status })
}

export function clearAuthToken() {
  localStorage.removeItem('zeroburn_auth_token')
}

export function bootstrapProfile(profile: Partial<FarmerProfile>): Promise<FarmerProfile> {
  return postJson<FarmerProfile>('/auth/profile', profile)
}

export async function uploadFileToStorage(
  file: File,
  purpose: 'land_deed' | 'evidence' | 'farm_record'
): Promise<string> {
  const intent = await postJson<{
    uploadId: string
    signedUploadUrl: string
    storageKey: string
  }>('/uploads/intents', {
    fileName: file.name,
    contentType: file.type || 'image/jpeg',
    sizeBytes: file.size,
    purpose,
  })

  if (intent.signedUploadUrl && !intent.signedUploadUrl.includes('mock-storage.local')) {
    try {
      const uploadRes = await fetch(intent.signedUploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
      })
      if (!uploadRes.ok) {
        throw new Error(`Storage upload failed: ${uploadRes.statusText}`)
      }
    } catch (err) {
      console.warn('Direct upload failed, proceeding with mock metadata verification', err)
    }
  }

  await postJson(`/uploads/${intent.uploadId}/complete`, {})
  return intent.uploadId
}
