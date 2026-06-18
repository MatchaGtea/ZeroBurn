import type {
  AppData,
  FarmerProfile,
  HarvestRecord,
  MarketplaceListing,
  PlantingRecord,
  Plot,
  TokenLot,
  Verification,
  WorkflowSnapshot,
  WorkflowStatus,
} from './domain'

export type Awaitable<T> = T | Promise<T>
export type ProfileUpdate = Partial<FarmerProfile>
export type CreatePlotInput = Omit<Plot, 'id' | 'status' | 'riskLevel'>
export type CreatePlantingInput = Omit<PlantingRecord, 'id' | 'status'>
export type CreateHarvestInput = Omit<HarvestRecord, 'id' | 'status' | 'traceabilityId'>
export type CreateListingInput = Omit<MarketplaceListing, 'id' | 'status'>
export interface EvidenceInput {
  photoFileName?: string
  gps?: string
  externalRequestId?: string
  externalRawPayload?: unknown
}
export interface PlotDocumentInput {
  fileName?: string
  externalRequestId?: string
  externalRawPayload?: unknown
}

export interface Repository {
  getAppData(): Awaitable<AppData>
  setWorkflow(status: WorkflowStatus): Awaitable<WorkflowSnapshot>
  updateProfile(input: ProfileUpdate): Awaitable<FarmerProfile>
  createPlot(input: CreatePlotInput, document?: PlotDocumentInput): Awaitable<Plot>
  confirmBoundary(plotId: string, boundaryLabel: string): Awaitable<Plot | undefined>
  createPlanting(input: CreatePlantingInput): Awaitable<PlantingRecord>
  createHarvest(input: CreateHarvestInput): Awaitable<HarvestRecord>
  submitEvidence(plotId: string, notes: string, evidence?: EvidenceInput): Awaitable<Verification>
  approveVerification(plotId: string): Awaitable<AppData>
  createListing(input: CreateListingInput): Awaitable<MarketplaceListing>
  markListing(status: 'listed' | 'sold'): Awaitable<AppData>
}

const stepOrder: WorkflowStatus[] = [
  'registration',
  'deed_captured',
  'boundary_confirmed',
  'planting_recorded',
  'harvest_recorded',
  'evidence_submitted',
  'checking_burn',
  'approved',
  'token_available',
  'listing_pending',
  'listed',
  'sold',
]

export function buildWorkflow(status: WorkflowStatus): WorkflowSnapshot {
  const visibleSteps = status === 'rejected'
    ? stepOrder.map((step) => step === 'checking_burn' ? 'rejected' : step)
    : stepOrder
  const index = visibleSteps.indexOf(status)
  const nextActionMap: Record<WorkflowStatus, WorkflowSnapshot['nextAction']> = {
    registration: {
      title: 'ยืนยันข้อมูลไร่',
      description: 'เพิ่มข้อมูลเจ้าของไร่และเอกสารพื้นที่ก่อนเริ่มใช้งาน',
      primaryLabel: 'อัปเดตโปรไฟล์',
      primaryRoute: '/profile/edit',
      mascot: 'welcome',
    },
    deed_captured: {
      title: 'ยืนยันขอบเขตแปลง',
      description: 'ตรวจขอบเขตที่ระบบอ่านจากเอกสารพื้นที่',
      primaryLabel: 'ไปที่แปลง',
      primaryRoute: '/plots/new',
      mascot: 'map',
    },
    boundary_confirmed: {
      title: 'บันทึกวันเริ่มปลูก',
      description: 'เลือกแปลง ใส่วันที่เริ่มปลูก และแนบรูปจากไร่',
      primaryLabel: 'บันทึกวันปลูก',
      primaryRoute: '/records/planting/new',
      mascot: 'mobile',
    },
    planting_recorded: {
      title: 'บันทึกข้อมูลเก็บเกี่ยว',
      description: 'แปลง B พร้อมเก็บเกี่ยวแล้ว บันทึกข้อมูลเพื่อส่งตรวจ Zero-Burn',
      primaryLabel: 'บันทึกเก็บเกี่ยว',
      primaryRoute: '/records/harvest/new',
      secondaryLabel: 'ดูแปลง',
      secondaryRoute: '/plots',
      mascot: 'harvest',
    },
    harvest_recorded: {
      title: 'ส่งหลักฐานไม่เผา',
      description: 'แนบภาพการจัดการเศษซากและคำอธิบายเพื่อส่งตรวจ',
      primaryLabel: 'แนบหลักฐาน',
      primaryRoute: '/status/evidence',
      mascot: 'residue',
    },
    evidence_submitted: {
      title: 'รอตรวจ Zero-Burn',
      description: 'ระบบกำลังตรวจข้อมูลแปลงและหลักฐานที่ส่งมา',
      primaryLabel: 'ดูสถานะ',
      primaryRoute: '/status',
      mascot: 'mobile',
    },
    checking_burn: {
      title: 'ดูผลตรวจ Zero-Burn',
      description: 'ผลตรวจพร้อมดูแล้ว ตรวจรายละเอียดก่อนรับแต้ม',
      primaryLabel: 'ดูผลตรวจ',
      primaryRoute: '/status/result',
      mascot: 'approved',
    },
    approved: {
      title: 'รับแต้ม Zero-Burn',
      description: 'ผ่านการตรวจแล้ว ระบบประเมิน Carbon Saved และออกแต้มให้',
      primaryLabel: 'ดูแต้ม',
      primaryRoute: '/sell',
      mascot: 'approved',
    },
    rejected: {
      title: 'ต้องส่งหลักฐานเพิ่ม',
      description: 'มีจุดเสี่ยงในแปลง ส่งรูปหรือคำอธิบายเพิ่มเพื่อให้ตรวจต่อ',
      primaryLabel: 'ส่งหลักฐานเพิ่ม',
      primaryRoute: '/status/evidence',
      mascot: 'residue',
    },
    token_available: {
      title: 'ขายพร้อมแต้ม Zero-Burn',
      description: 'เลือก lot เก็บเกี่ยวแล้วแนบแต้มที่ผ่านการประเมิน',
      primaryLabel: 'ขาย + แนบแต้ม',
      primaryRoute: '/sell/new',
      mascot: 'sell',
    },
    listing_pending: {
      title: 'รออนุมัติประกาศขาย',
      description: 'ส่งประกาศแล้ว ระบบกำลังตรวจข้อมูลก่อนเปิดให้ผู้ซื้อเห็น',
      primaryLabel: 'ดูประกาศขาย',
      primaryRoute: '/sell/status',
      mascot: 'sell',
    },
    listed: {
      title: 'ประกาศขายอยู่',
      description: 'ผู้ซื้อสามารถเห็นประกาศพร้อมข้อมูล Zero-Burn แล้ว',
      primaryLabel: 'ดูประกาศขาย',
      primaryRoute: '/sell/status',
      mascot: 'sell',
    },
    sold: {
      title: 'ขายสำเร็จ',
      description: 'บันทึกการขายสำเร็จ เก็บประวัติไว้ในโปรไฟล์ไร่',
      primaryLabel: 'กลับหน้าแรก',
      primaryRoute: '/',
      mascot: 'welcome',
    },
  }

  return {
    status,
    nextAction: nextActionMap[status],
    steps: visibleSteps.map((key, stepIndex) => ({
      key,
      label: {
        registration: 'เริ่ม',
        deed_captured: 'เอกสาร',
        boundary_confirmed: 'แปลง',
        planting_recorded: 'ปลูก',
        harvest_recorded: 'เก็บ',
        evidence_submitted: 'หลักฐาน',
        checking_burn: 'ตรวจ',
        approved: 'ผ่าน',
        rejected: 'แก้ไข',
        token_available: 'แต้ม',
        listing_pending: 'รอขาย',
        listed: 'ขาย',
        sold: 'สำเร็จ',
      }[key],
      done: stepIndex < index,
      current: stepIndex === index,
    })),
  }
}

export class MemoryRepository implements Repository {
  private profile: FarmerProfile = {
    id: 'farmer-somchai',
    ownerName: 'สมชาย ใจดี',
    phone: '08X-XXX-XXXX',
    farmName: 'Somchai Farm',
    province: 'นครสวรรค์',
    district: 'ตาคลี',
    address: 'หมู่ 4 ตาคลี นครสวรรค์',
    consent: true,
    workflowStatus: 'planting_recorded',
  }

  private plots: Plot[] = [
    { id: 'plot-a', name: 'แปลง A', cropType: 'อ้อย', cropVariety: 'Khon Kaen 3', areaRai: 12, gps: '15.2762, 100.1344', status: 'verified', riskLevel: 'low', boundaryLabel: 'ยืนยันแล้ว', documentStatus: 'ตรวจแล้ว' },
    { id: 'plot-b', name: 'แปลง B', cropType: 'อ้อย', cropVariety: 'LK92-11', areaRai: 8, gps: '15.2827, 100.1210', status: 'pending', riskLevel: 'medium', boundaryLabel: 'รอข้อมูล', documentStatus: 'รอบันทึกเก็บเกี่ยว' },
    { id: 'plot-c', name: 'แปลง C', cropType: 'อ้อย', cropVariety: 'K88-92', areaRai: 15, gps: '15.2709, 100.1518', status: 'flagged', riskLevel: 'high', boundaryLabel: 'ต้องตรวจเพิ่ม', documentStatus: 'มีจุดเสี่ยง' },
  ]

  private plantingRecords: PlantingRecord[] = [
    { id: 'PLR-001', plotId: 'plot-a', season: '2025/26', plantingDate: '2025-06-12', cropType: 'อ้อย', cropVariety: 'Khon Kaen 3', photoFileName: 'field-a.jpg', notes: 'ปลูกตามร่องเดิม', status: 'complete' },
  ]

  private harvestRecords: HarvestRecord[] = [
    { id: 'HAR-001', plotId: 'plot-a', season: '2025/26', harvestDate: '2026-03-15', quantity: 35, unit: 'ton', traceabilityId: 'ZB-2026-001', photoFileName: 'harvest-a.jpg', notes: 'ไม่มีการเผา', status: 'linked' },
  ]

  private verifications: Verification[] = [
    { id: 'VER-001', plotId: 'plot-a', harvestRecordId: 'HAR-001', status: 'approved', riskLevel: 'low', issueSummary: 'ไม่พบสัญญาณเผา', resultNotes: 'ผ่าน Zero-Burn', evidenceCount: 2 },
    { id: 'VER-002', plotId: 'plot-b', status: 'pending', riskLevel: 'medium', issueSummary: 'รอบันทึกเก็บเกี่ยว', resultNotes: 'ยังไม่ส่งตรวจ', evidenceCount: 0 },
  ]

  private tokens: TokenLot[] = [
    { id: 'ZBT-2026-001', plotId: 'plot-a', harvestRecordId: 'HAR-001', tokenAmount: 180, carbonSavedKg: 1200, status: 'available', traceabilityId: 'ZB-2026-001' },
  ]

  private listings: MarketplaceListing[] = [
    { id: 'MKT-001', plotId: 'plot-a', harvestRecordId: 'HAR-001', tokenLotId: 'ZBT-2026-001', productName: 'อ้อยสดคุณภาพ', quantity: 35, unit: 'ton', price: 2400, buyerVisibility: 'public', status: 'draft' },
  ]

  getAppData(): AppData {
    const totalHarvestTons = this.harvestRecords.reduce((sum, record) => sum + (record.unit === 'ton' ? record.quantity : record.quantity / 1000), 0)
    return {
      profile: this.profile,
      workflow: buildWorkflow(this.profile.workflowStatus),
      summary: {
        registeredPlots: this.plots.length,
        verifiedPlots: this.plots.filter((plot) => plot.status === 'verified').length,
        pendingReview: this.verifications.filter((item) => item.status === 'pending' || item.status === 'checking_burn').length,
        tokenBalance: this.tokens.reduce((sum, token) => sum + token.tokenAmount, 0),
        totalHarvestTons,
        marketplaceStatus: this.listings.some((listing) => listing.status === 'listed') ? 'เปิดขายแล้ว' : 'รออนุมัติขาย',
      },
      plots: this.plots,
      plantingRecords: this.plantingRecords,
      harvestRecords: this.harvestRecords,
      verifications: this.verifications,
      tokens: this.tokens,
      marketplaceListings: this.listings,
    }
  }

  setWorkflow(status: WorkflowStatus) {
    this.profile = { ...this.profile, workflowStatus: status }
    return this.getAppData().workflow
  }

  updateProfile(input: Partial<FarmerProfile>) {
    this.profile = { ...this.profile, ...input, workflowStatus: input.workflowStatus ?? 'deed_captured' }
    return this.profile
  }

  createPlot(input: Omit<Plot, 'id' | 'status' | 'riskLevel'>) {
    const plot: Plot = { ...input, id: `plot-${Date.now()}`, status: 'pending', riskLevel: 'low' }
    this.plots = [plot, ...this.plots]
    this.setWorkflow('deed_captured')
    return plot
  }

  confirmBoundary(plotId: string, boundaryLabel: string) {
    const existing = this.plots.find((plot) => plot.id === plotId)
    if (!existing) return undefined

    this.plots = this.plots.map((plot) => plot.id === plotId ? { ...plot, boundaryLabel, status: 'pending' } : plot)
    this.setWorkflow('boundary_confirmed')
    return this.plots.find((plot) => plot.id === plotId)
  }

  createPlanting(input: Omit<PlantingRecord, 'id' | 'status'>) {
    const record: PlantingRecord = { ...input, id: `PLR-${Date.now()}`, status: 'submitted' }
    this.plantingRecords = [record, ...this.plantingRecords]
    this.setWorkflow('planting_recorded')
    return record
  }

  createHarvest(input: Omit<HarvestRecord, 'id' | 'status' | 'traceabilityId'>) {
    const record: HarvestRecord = { ...input, id: `HAR-${Date.now()}`, status: 'submitted', traceabilityId: `ZB-2026-${String(this.harvestRecords.length + 1).padStart(3, '0')}` }
    this.harvestRecords = [record, ...this.harvestRecords]
    this.setWorkflow('harvest_recorded')
    return record
  }

  submitEvidence(plotId: string, notes: string) {
    const verification: Verification = { id: `VER-${Date.now()}`, plotId, status: 'checking_burn', riskLevel: 'medium', issueSummary: notes, resultNotes: 'กำลังตรวจจาก mock adapter', evidenceCount: 1 }
    this.verifications = [verification, ...this.verifications]
    this.setWorkflow('checking_burn')
    return verification
  }

  approveVerification(plotId: string) {
    this.verifications = this.verifications.map((item, index) => index === 0 || item.plotId === plotId ? { ...item, status: 'approved', resultNotes: 'ผ่าน Zero-Burn ได้รับ 120 แต้ม' } : item)
    if (!this.tokens.some((token) => token.plotId === plotId && token.status === 'available')) {
      this.tokens = [{ id: `ZBT-${Date.now()}`, plotId, tokenAmount: 120, carbonSavedKg: 800, status: 'available', traceabilityId: `ZB-2026-${this.tokens.length + 1}` }, ...this.tokens]
    }
    this.setWorkflow('token_available')
    return this.getAppData()
  }

  createListing(input: Omit<MarketplaceListing, 'id' | 'status'>) {
    const listing: MarketplaceListing = { ...input, id: `MKT-${Date.now()}`, status: 'pending_approval' }
    this.listings = [listing, ...this.listings]
    this.setWorkflow('listing_pending')
    return listing
  }

  markListing(status: 'listed' | 'sold') {
    this.listings = this.listings.map((listing, index) => index === 0 ? { ...listing, status } : listing)
    this.setWorkflow(status)
    return this.getAppData()
  }
}
