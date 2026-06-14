import type {
  Certificate,
  FarmerProfile,
  HarvestRecord,
  MarketplaceListing,
  PlantingRecord,
  Plot,
  Summary,
  TokenLot,
  VerificationRecord,
} from './types'

export const profile: FarmerProfile = {
  name: 'Somchai Farm',
  province: 'Nakhon Sawan',
  crop: 'Sugarcane',
  phone: '+66 81 234 5678',
  address: 'Moo 4, Takhli District, Nakhon Sawan',
  ownerInfo: 'Somchai Farm Cooperative',
  paymentInfo: 'Kasikorn Bank •••• 4281',
  walletAddress: '0xZBF...9A21',
  kycStatus: 'Verified',
  accountStatus: 'Active',
}

export const summary: Summary = {
  registeredPlots: 3,
  verifiedPlots: 1,
  pendingReview: 1,
  flaggedPlots: 1,
  totalHarvest: '35 tons',
  tokenBalance: 180,
  revenueProduce: '฿314,000',
  revenueTokens: '฿48,750',
}

export const plots: Plot[] = [
  {
    id: 'plot-a',
    name: 'Plot A',
    cropType: 'Sugarcane',
    cropVariety: 'Khon Kaen 3',
    areaRai: 12,
    gps: '15.2762, 100.1344',
    province: 'Nakhon Sawan',
    district: 'Takhli',
    owner: 'Somchai Farm',
    plantingDate: '12 Jun 2025',
    expectedHarvestDate: '20 Nov 2025',
    actualHarvestDate: '18 Nov 2025',
    harvestQuantity: '20 tons',
    status: 'verified',
    tokenLotId: 'ZBT-2026-001',
    productLotId: 'ZB-2026-001',
    certificateId: 'CERT-ZB-001',
    riskLevel: 'Low',
    polygon: '250,92 432,66 520,158 470,280 300,300 212,210',
  },
  {
    id: 'plot-b',
    name: 'Plot B',
    cropType: 'Sugarcane',
    cropVariety: 'LK92-11',
    areaRai: 8,
    gps: '15.2827, 100.1210',
    province: 'Nakhon Sawan',
    district: 'Takhli',
    owner: 'Somchai Farm',
    plantingDate: '25 Jun 2025',
    expectedHarvestDate: '05 Dec 2025',
    actualHarvestDate: 'Pending',
    harvestQuantity: 'Pending',
    status: 'pending',
    tokenLotId: 'Pending issue',
    productLotId: 'Not linked',
    certificateId: 'Pending',
    riskLevel: 'Medium',
    polygon: '80,240 238,198 326,292 278,405 106,384',
  },
  {
    id: 'plot-c',
    name: 'Plot C',
    cropType: 'Sugarcane',
    cropVariety: 'K88-92',
    areaRai: 15,
    gps: '15.2709, 100.1518',
    province: 'Nakhon Sawan',
    district: 'Takhli',
    owner: 'Somchai Farm',
    plantingDate: '03 Jul 2025',
    expectedHarvestDate: '17 Dec 2025',
    actualHarvestDate: '16 Dec 2025',
    harvestQuantity: '15 tons',
    status: 'flagged',
    tokenLotId: 'Review hold',
    productLotId: 'ZB-2026-002',
    certificateId: 'Review hold',
    riskLevel: 'High',
    polygon: '520,286 704,240 792,332 740,456 556,440',
  },
]

export const plantingRecords: PlantingRecord[] = [
  { id: 'PLR-001', plotId: 'plot-a', season: '2025/26', cropType: 'Sugarcane', cropVariety: 'Khon Kaen 3', plantingDate: '12 Jun 2025', plantingMethod: 'Manual rows', fertilizerInput: 'Organic compost', notes: 'Photos uploaded', status: 'complete' },
  { id: 'PLR-002', plotId: 'plot-b', season: '2025/26', cropType: 'Sugarcane', cropVariety: 'LK92-11', plantingDate: '25 Jun 2025', plantingMethod: 'Mechanical', fertilizerInput: 'Low nitrogen mix', notes: 'Waiting drone photo', status: 'waiting-review' },
  { id: 'PLR-003', plotId: 'plot-c', season: '2025/26', cropType: 'Sugarcane', cropVariety: 'K88-92', plantingDate: '03 Jul 2025', plantingMethod: 'Manual rows', fertilizerInput: 'Organic compost', notes: 'Missing image proof', status: 'incomplete' },
]

export const harvestRecords: HarvestRecord[] = [
  { id: 'HAR-001', plotId: 'plot-a', season: '2025/26', harvestDate: '18 Nov 2025', productType: 'Sugarcane Lot ZB-2026-001', quantity: 20, unit: 'ton', grade: 'A', buyer: 'Nakhon Biofuel Factory', tokenLotId: 'ZBT-2026-001', status: 'linked' },
  { id: 'HAR-002', plotId: 'plot-c', season: '2025/26', harvestDate: '16 Dec 2025', productType: 'Sugarcane Lot ZB-2026-002', quantity: 15, unit: 'ton', grade: 'B+', buyer: 'Pending buyer', tokenLotId: 'Review hold', status: 'submitted' },
]

export const verifications: VerificationRecord[] = [
  { id: 'VER-001', plotId: 'plot-a', season: '2025/26', cropType: 'Sugarcane', lastInspectionDate: '10 Jan 2026', detectionSource: 'Satellite', riskLevel: 'Low', status: 'verified', notes: 'No burn signals detected across harvest window.' },
  { id: 'VER-002', plotId: 'plot-b', season: '2025/26', cropType: 'Sugarcane', lastInspectionDate: '08 Jan 2026', detectionSource: 'Drone', riskLevel: 'Medium', status: 'monitoring', notes: 'Boundary data accepted. Harvest proof pending.' },
  { id: 'VER-003', plotId: 'plot-c', season: '2025/26', cropType: 'Sugarcane', lastInspectionDate: '11 Jan 2026', detectionSource: 'Field data', riskLevel: 'High', status: 'flagged', notes: 'Thermal signal near southern boundary requires review.' },
]

export const tokens: TokenLot[] = [
  { id: 'ZBT-2026-001', plotId: 'plot-a', season: '2025/26', harvestQuantity: '20 tons', tokenAmount: 50, status: 'linked', linkedProductLot: 'ZB-2026-001', traceabilityId: 'TRC-NSW-001' },
  { id: 'ZBT-2026-002', plotId: 'plot-a', season: '2025/26', harvestQuantity: '12 tons', tokenAmount: 70, status: 'available', linkedProductLot: 'Unlinked', traceabilityId: 'TRC-NSW-002' },
  { id: 'ZBT-2025-SOLD', plotId: 'plot-c', season: '2024/25', harvestQuantity: '18 tons', tokenAmount: 60, status: 'sold', linkedProductLot: 'ZB-2025-009', traceabilityId: 'TRC-NSW-OLD' },
]

export const marketplace: MarketplaceListing[] = [
  { id: 'MKT-001', productType: 'Sugarcane', quantity: '20 tons', price: '฿176,000', harvestDate: '18 Nov 2025', sourcePlotId: 'plot-a', zeroBurnStatus: 'Verified Zero-Burn', tokenAttached: true, buyerInterest: 6, status: 'active', mode: 'Produce + Zero-Burn Token' },
  { id: 'MKT-002', productType: 'Sugarcane', quantity: '15 tons', price: '฿138,000', harvestDate: '16 Dec 2025', sourcePlotId: 'plot-c', zeroBurnStatus: 'Flagged review', tokenAttached: false, buyerInterest: 2, status: 'draft', mode: 'Produce Only' },
]

export const certificates: Certificate[] = [
  { id: 'CERT-ZB-001', farmerName: 'Somchai Farm', plotId: 'plot-a', productLot: 'ZB-2026-001', tokenLot: 'ZBT-2026-001', verificationDate: '10 Jan 2026', status: 'Verified', traceabilityId: 'TRC-NSW-001' },
  { id: 'CERT-ZB-002', farmerName: 'Somchai Farm', plotId: 'plot-b', productLot: 'Pending harvest', tokenLot: 'Pending issue', verificationDate: 'In review', status: 'Pending', traceabilityId: 'TRC-NSW-PENDING' },
]

export const activity = [
  'Plot A verified successfully',
  'Harvest record linked to 50 ZBT',
  'Plot B submitted for review',
  'Marketplace listing MKT-001 received buyer interest',
  'Plot C flagged for verification review',
]

export const allMockData = {
  summary,
  plots,
  plantingRecords,
  harvestRecords,
  verifications,
  tokens,
  marketplace,
  certificates,
  profile,
  activity,
}
