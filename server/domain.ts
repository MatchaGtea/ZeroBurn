export type WorkflowStatus =
  | 'registration'
  | 'deed_captured'
  | 'boundary_confirmed'
  | 'planting_recorded'
  | 'harvest_recorded'
  | 'evidence_submitted'
  | 'checking_burn'
  | 'approved'
  | 'rejected'
  | 'token_available'
  | 'listing_pending'
  | 'listed'
  | 'sold'

export type PlotStatus = 'draft' | 'pending' | 'verified' | 'flagged' | 'rejected'
export type VerificationStatus = 'pending' | 'checking_burn' | 'needs_more_evidence' | 'approved' | 'rejected'
export type ListingStatus = 'draft' | 'pending_approval' | 'listed' | 'sold'

export interface FarmerProfile {
  id: string
  ownerName: string
  phone: string
  farmName: string
  province: string
  district: string
  address: string
  consent: boolean
  workflowStatus: WorkflowStatus
  authUserId?: string
}

export interface Plot {
  id: string
  name: string
  cropType: string
  cropVariety: string
  areaRai: number
  gps: string
  status: PlotStatus
  riskLevel: 'low' | 'medium' | 'high'
  boundaryLabel: string
  documentStatus: string
}

export interface UploadedFile {
  id: string
  farmerId: string
  fileName: string
  fileType: string
  purpose: string
  storageProvider: string
  storageKey: string
  bucket?: string
  sizeBytes?: number
  checksum?: string
  uploadStatus: 'pending' | 'uploaded' | 'failed' | 'deleted'
  uploadedAt?: string
  createdAt: string
}

export interface LandDocument {
  id: string
  plotId: string
  uploadedFileId?: string
  documentType: string
  ocrStatus: string
  boundaryStatus: string
  externalRequestId?: string
  provider?: string
  providerStatus?: string
  providerErrorCode?: string
  providerErrorMessage?: string
  ocrResult?: unknown
  boundaryGeojson?: unknown
  submittedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PlantingRecord {
  id: string
  plotId: string
  season: string
  plantingDate: string
  cropType: string
  cropVariety: string
  photoFileName: string
  notes: string
  status: 'draft' | 'submitted' | 'complete'
  photoFileId?: string
}

export interface HarvestRecord {
  id: string
  plotId: string
  season: string
  harvestDate: string
  quantity: number
  unit: 'kg' | 'ton'
  traceabilityId: string
  photoFileName: string
  notes: string
  status: 'draft' | 'submitted' | 'linked'
  photoFileId?: string
}

export interface Verification {
  id: string
  plotId: string
  harvestRecordId?: string
  status: VerificationStatus
  riskLevel: 'low' | 'medium' | 'high'
  issueSummary: string
  resultNotes: string
  evidenceCount: number
}

export interface TokenLot {
  id: string
  plotId: string
  harvestRecordId?: string
  tokenAmount: number
  carbonSavedKg: number
  status: 'pending' | 'available' | 'attached' | 'sold'
  traceabilityId: string
}

export interface MarketplaceListing {
  id: string
  plotId: string
  harvestRecordId: string
  tokenLotId?: string
  productName: string
  quantity: number
  unit: 'kg' | 'ton'
  price: number
  buyerVisibility: 'public' | 'approved_buyers'
  status: ListingStatus
}

export interface WorkflowSnapshot {
  status: WorkflowStatus
  nextAction: {
    title: string
    description: string
    primaryLabel: string
    primaryRoute: string
    secondaryLabel?: string
    secondaryRoute?: string
    mascot: 'welcome' | 'map' | 'mobile' | 'harvest' | 'residue' | 'sell' | 'approved' | 'titleDeed'
  }
  steps: Array<{ key: WorkflowStatus; label: string; done: boolean; current: boolean }>
}

export interface AppData {
  profile: FarmerProfile
  workflow: WorkflowSnapshot
  summary: {
    registeredPlots: number
    verifiedPlots: number
    pendingReview: number
    tokenBalance: number
    totalHarvestTons: number
    marketplaceStatus: string
  }
  plots: Plot[]
  plantingRecords: PlantingRecord[]
  harvestRecords: HarvestRecord[]
  verifications: Verification[]
  tokens: TokenLot[]
  marketplaceListings: MarketplaceListing[]
}

export interface UploadIntentInput {
  fileName: string
  contentType: string
  sizeBytes: number
  purpose: 'land_deed' | 'evidence' | 'farm_record'
}

export interface UploadIntentResult {
  uploadId: string
  bucket: string
  storageKey: string
  signedUploadUrl: string
  expiresAt: string
}

export interface LandDeedJob {
  requestId: string
  status: 'queued' | 'processing' | 'succeeded' | 'failed'
}

export interface LandDeedResult {
  requestId: string
  status: 'succeeded' | 'failed'
  document?: {
    titleDeedNumber: string
    surveyPage: string
    parcelNumber: string
    subdistrict: string
    district: string
    province: string
    area: {
      rai: number
      ngan: number
      squareWa: number
    }
  }
  boundary?: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  confidence?: {
    overall: number
    fields: Record<string, number>
  }
  warnings?: string[]
  error?: {
    code: string
    message: string
    retryable: boolean
    providerRequestId?: string
  }
}
