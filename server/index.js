import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const profile = {
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

const summary = {
  registeredPlots: 3,
  verifiedPlots: 1,
  pendingReview: 1,
  flaggedPlots: 1,
  totalHarvest: '35 tons',
  tokenBalance: 180,
  revenueProduce: '฿314,000',
  revenueTokens: '฿48,750',
}

const plots = [
  { id: 'plot-a', name: 'Plot A', cropType: 'Sugarcane', cropVariety: 'Khon Kaen 3', areaRai: 12, gps: '15.2762, 100.1344', province: 'Nakhon Sawan', district: 'Takhli', owner: 'Somchai Farm', plantingDate: '12 Jun 2025', expectedHarvestDate: '20 Nov 2025', actualHarvestDate: '18 Nov 2025', harvestQuantity: '20 tons', status: 'verified', tokenLotId: 'ZBT-2026-001', productLotId: 'ZB-2026-001', certificateId: 'CERT-ZB-001', riskLevel: 'Low', polygon: '250,92 432,66 520,158 470,280 300,300 212,210' },
  { id: 'plot-b', name: 'Plot B', cropType: 'Sugarcane', cropVariety: 'LK92-11', areaRai: 8, gps: '15.2827, 100.1210', province: 'Nakhon Sawan', district: 'Takhli', owner: 'Somchai Farm', plantingDate: '25 Jun 2025', expectedHarvestDate: '05 Dec 2025', actualHarvestDate: 'Pending', harvestQuantity: 'Pending', status: 'pending', tokenLotId: 'Pending issue', productLotId: 'Not linked', certificateId: 'Pending', riskLevel: 'Medium', polygon: '80,240 238,198 326,292 278,405 106,384' },
  { id: 'plot-c', name: 'Plot C', cropType: 'Sugarcane', cropVariety: 'K88-92', areaRai: 15, gps: '15.2709, 100.1518', province: 'Nakhon Sawan', district: 'Takhli', owner: 'Somchai Farm', plantingDate: '03 Jul 2025', expectedHarvestDate: '17 Dec 2025', actualHarvestDate: '16 Dec 2025', harvestQuantity: '15 tons', status: 'flagged', tokenLotId: 'Review hold', productLotId: 'ZB-2026-002', certificateId: 'Review hold', riskLevel: 'High', polygon: '520,286 704,240 792,332 740,456 556,440' },
]

const plantingRecords = [
  { id: 'PLR-001', plotId: 'plot-a', season: '2025/26', cropType: 'Sugarcane', cropVariety: 'Khon Kaen 3', plantingDate: '12 Jun 2025', plantingMethod: 'Manual rows', fertilizerInput: 'Organic compost', notes: 'Photos uploaded', status: 'complete' },
  { id: 'PLR-002', plotId: 'plot-b', season: '2025/26', cropType: 'Sugarcane', cropVariety: 'LK92-11', plantingDate: '25 Jun 2025', plantingMethod: 'Mechanical', fertilizerInput: 'Low nitrogen mix', notes: 'Waiting drone photo', status: 'waiting-review' },
  { id: 'PLR-003', plotId: 'plot-c', season: '2025/26', cropType: 'Sugarcane', cropVariety: 'K88-92', plantingDate: '03 Jul 2025', plantingMethod: 'Manual rows', fertilizerInput: 'Organic compost', notes: 'Missing image proof', status: 'incomplete' },
]

const harvestRecords = [
  { id: 'HAR-001', plotId: 'plot-a', season: '2025/26', harvestDate: '18 Nov 2025', productType: 'Sugarcane Lot ZB-2026-001', quantity: 20, unit: 'ton', grade: 'A', buyer: 'Nakhon Biofuel Factory', tokenLotId: 'ZBT-2026-001', status: 'linked' },
  { id: 'HAR-002', plotId: 'plot-c', season: '2025/26', harvestDate: '16 Dec 2025', productType: 'Sugarcane Lot ZB-2026-002', quantity: 15, unit: 'ton', grade: 'B+', buyer: 'Pending buyer', tokenLotId: 'Review hold', status: 'submitted' },
]

const verifications = [
  { id: 'VER-001', plotId: 'plot-a', season: '2025/26', cropType: 'Sugarcane', lastInspectionDate: '10 Jan 2026', detectionSource: 'Satellite', riskLevel: 'Low', status: 'verified', notes: 'No burn signals detected across harvest window.' },
  { id: 'VER-002', plotId: 'plot-b', season: '2025/26', cropType: 'Sugarcane', lastInspectionDate: '08 Jan 2026', detectionSource: 'Drone', riskLevel: 'Medium', status: 'monitoring', notes: 'Boundary data accepted. Harvest proof pending.' },
  { id: 'VER-003', plotId: 'plot-c', season: '2025/26', cropType: 'Sugarcane', lastInspectionDate: '11 Jan 2026', detectionSource: 'Field data', riskLevel: 'High', status: 'flagged', notes: 'Thermal signal near southern boundary requires review.' },
]

const tokens = [
  { id: 'ZBT-2026-001', plotId: 'plot-a', season: '2025/26', harvestQuantity: '20 tons', tokenAmount: 50, status: 'linked', linkedProductLot: 'ZB-2026-001', blockchainRecordId: 'TRC-NSW-001' },
  { id: 'ZBT-2026-002', plotId: 'plot-a', season: '2025/26', harvestQuantity: '12 tons', tokenAmount: 70, status: 'available', linkedProductLot: 'Unlinked', blockchainRecordId: 'TRC-NSW-002' },
  { id: 'ZBT-2025-SOLD', plotId: 'plot-c', season: '2024/25', harvestQuantity: '18 tons', tokenAmount: 60, status: 'sold', linkedProductLot: 'ZB-2025-009', blockchainRecordId: 'TRC-NSW-OLD' },
]

const marketplace = [
  { id: 'MKT-001', productType: 'Sugarcane', quantity: '20 tons', price: '฿176,000', harvestDate: '18 Nov 2025', sourcePlotId: 'plot-a', zeroBurnStatus: 'Verified Zero-Burn', tokenAttached: true, buyerInterest: 6, status: 'active', mode: 'Produce + Zero-Burn Token' },
  { id: 'MKT-002', productType: 'Sugarcane', quantity: '15 tons', price: '฿138,000', harvestDate: '16 Dec 2025', sourcePlotId: 'plot-c', zeroBurnStatus: 'Flagged review', tokenAttached: false, buyerInterest: 2, status: 'draft', mode: 'Produce Only' },
]

const certificates = [
  { id: 'CERT-ZB-001', farmerName: 'Somchai Farm', plotId: 'plot-a', productLot: 'ZB-2026-001', tokenLot: 'ZBT-2026-001', verificationDate: '10 Jan 2026', status: 'Verified', traceabilityId: 'TRC-NSW-001' },
  { id: 'CERT-ZB-002', farmerName: 'Somchai Farm', plotId: 'plot-b', productLot: 'Pending harvest', tokenLot: 'Pending issue', verificationDate: 'In review', status: 'Pending', traceabilityId: 'TRC-NSW-PENDING' },
]

const data = { summary, plots, plantingRecords, harvestRecords, verifications, tokens, marketplace, certificates, profile }
const port = Number(process.env.PORT ?? 4184)
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const prototypePath = join(root, 'prototype', 'index.html')

function json(res, body, status = 200) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(body))
}

const routes = {
  '/api/summary': summary,
  '/api/plots': plots,
  '/api/planting-records': plantingRecords,
  '/api/harvest-records': harvestRecords,
  '/api/verifications': verifications,
  '/api/tokens': tokens,
  '/api/marketplace': marketplace,
  '/api/certificates': certificates,
  '/api/profile': profile,
  '/api/all': data,
}

createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, {})
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  if (url.pathname === '/') {
    readFile(prototypePath, 'utf8').then((html) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
    }).catch(() => json(res, { message: 'Prototype not found' }, 500))
    return
  }
  if (url.pathname.startsWith('/api/plots/')) {
    const id = url.pathname.split('/').pop()
    const plot = plots.find((item) => item.id === id)
    json(res, plot ?? { message: 'Plot not found' }, plot ? 200 : 404)
    return
  }

  if (url.pathname in routes) {
    json(res, routes[url.pathname])
    return
  }

  json(res, { message: 'Not found' }, 404)
}).listen(port, () => {
  console.log(`Zero-Burn Farmer mock API running at http://localhost:${port}`)
})
