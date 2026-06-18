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
