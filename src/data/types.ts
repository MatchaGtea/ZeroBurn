export type PlotStatus = 'verified' | 'pending' | 'flagged' | 'rejected'
export type RecordStatus = 'complete' | 'incomplete' | 'waiting-review' | 'draft' | 'submitted' | 'linked' | 'listed'
export type VerificationStatus = 'pending' | 'monitoring' | 'verified' | 'flagged' | 'rejected'
export type TokenStatus = 'available' | 'sold' | 'pending' | 'linked'
export type ListingStatus = 'active' | 'draft' | 'offer' | 'sold'

export interface Plot {
  id: string
  name: string
  cropType: string
  cropVariety: string
  areaRai: number
  gps: string
  province: string
  district: string
  owner: string
  plantingDate: string
  expectedHarvestDate: string
  actualHarvestDate: string
  harvestQuantity: string
  status: PlotStatus
  tokenLotId: string
  productLotId: string
  certificateId: string
  riskLevel: 'Low' | 'Medium' | 'High'
  polygon: string
}

export interface PlantingRecord {
  id: string
  plotId: string
  season: string
  cropType: string
  cropVariety: string
  plantingDate: string
  plantingMethod: string
  fertilizerInput: string
  notes: string
  status: RecordStatus
}

export interface HarvestRecord {
  id: string
  plotId: string
  season: string
  harvestDate: string
  productType: string
  quantity: number
  unit: 'kg' | 'ton'
  grade: string
  buyer: string
  tokenLotId: string
  status: RecordStatus
}

export interface VerificationRecord {
  id: string
  plotId: string
  season: string
  cropType: string
  lastInspectionDate: string
  detectionSource: 'Satellite' | 'Drone' | 'Field data'
  riskLevel: 'Low' | 'Medium' | 'High'
  status: VerificationStatus
  notes: string
}

export interface TokenLot {
  id: string
  plotId: string
  season: string
  harvestQuantity: string
  tokenAmount: number
  status: TokenStatus
  linkedProductLot: string
  blockchainRecordId: string
}

export interface MarketplaceListing {
  id: string
  productType: string
  quantity: string
  price: string
  harvestDate: string
  sourcePlotId: string
  zeroBurnStatus: string
  tokenAttached: boolean
  buyerInterest: number
  status: ListingStatus
  mode: 'Produce Only' | 'Produce + Zero-Burn Token'
}

export interface Certificate {
  id: string
  farmerName: string
  plotId: string
  productLot: string
  tokenLot: string
  verificationDate: string
  status: string
  traceabilityId: string
}

export interface FarmerProfile {
  name: string
  province: string
  crop: string
  phone: string
  address: string
  ownerInfo: string
  paymentInfo: string
  walletAddress: string
  kycStatus: string
  accountStatus: string
}

export interface Summary {
  registeredPlots: number
  verifiedPlots: number
  pendingReview: number
  flaggedPlots: number
  totalHarvest: string
  tokenBalance: number
  revenueProduce: string
  revenueTokens: string
}
