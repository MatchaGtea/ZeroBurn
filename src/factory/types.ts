export type FactoryLotStatus =
  | 'pending_review'
  | 'verified'
  | 'needs_info'
  | 'approved'
  | 'scheduled'
  | 'completed'
  | 'rejected'

export type BurnRisk = 'low' | 'medium' | 'high'

export interface FactoryLot {
  id: string
  farmerName: string
  farmName: string
  district: string
  province: string
  plotName: string
  cropType: string
  cropVariety: string
  quantityTon: number
  ccs: number
  harvestDate: string
  deliveryWindow: string
  status: FactoryLotStatus
  risk: BurnRisk
  traceabilityId: string
  tokenId?: string
  carbonSavedKg: number
  pricePerTon: number
  evidence: string[]
  notes: string
}

export interface FactoryProfile {
  id: string
  factoryName: string
  officerName: string
  province: string
  buyingSeason: string
  dailyCapacityTon: number
}
