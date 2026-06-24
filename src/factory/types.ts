export type FactoryLotStatus =
  | 'available'
  | 'pending_review'
  | 'verified'
  | 'needs_info'
  | 'purchase_requested'
  | 'delivering'
  | 'goods_received'
  | 'payment_confirmed'
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
  tokenAmount: number
  carbonSavedKg: number
  pricePerTon: number
  evidence: string[]
  notes: string
}

export interface FactoryWalletToken {
  id: string
  traceabilityId: string
  farmName: string
  farmerName: string
  tokenAmount: number
  carbonSavedKg: number
}

export interface FactoryProfile {
  id: string
  factoryName: string
  officerName: string
  province: string
  buyingSeason: string
  dailyCapacityTon: number
}
