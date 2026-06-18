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
  UploadedFile,
  LandDocument,
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
  uploadedFileId?: string
}
export interface PlotDocumentInput {
  fileName?: string
  externalRequestId?: string
  externalRawPayload?: unknown
  uploadedFileId?: string
}

export interface Repository {
  getAppData(farmerId: string): Awaitable<AppData>
  setWorkflow(farmerId: string, status: WorkflowStatus): Awaitable<WorkflowSnapshot>
  updateProfile(farmerId: string, input: ProfileUpdate): Awaitable<FarmerProfile>
  createPlot(farmerId: string, input: CreatePlotInput, document?: PlotDocumentInput): Awaitable<Plot>
  confirmBoundary(farmerId: string, plotId: string, boundaryLabel: string): Awaitable<Plot | undefined>
  createPlanting(farmerId: string, input: CreatePlantingInput): Awaitable<PlantingRecord>
  createHarvest(farmerId: string, input: CreateHarvestInput): Awaitable<HarvestRecord>
  submitEvidence(farmerId: string, plotId: string, notes: string, evidence?: EvidenceInput): Awaitable<Verification>
  approveVerification(farmerId: string, plotId: string): Awaitable<AppData>
  createListing(farmerId: string, input: CreateListingInput): Awaitable<MarketplaceListing>
  markListing(farmerId: string, status: 'listed' | 'sold'): Awaitable<AppData>
  findProfileByAuthId(authUserId: string): Awaitable<FarmerProfile | undefined>
  createProfileWithAuth(authUserId: string, input: ProfileUpdate): Awaitable<FarmerProfile>
  createUploadedFile(input: Omit<UploadedFile, 'id' | 'createdAt' | 'uploadedAt'>): Awaitable<UploadedFile>
  getUploadedFile(id: string): Awaitable<UploadedFile | null>
  updateUploadedFileStatus(id: string, status: 'pending' | 'uploaded' | 'failed' | 'deleted', sizeBytes?: number): Awaitable<UploadedFile | null>
  getLandDocument(id: string): Awaitable<LandDocument | null>
  updateLandDocument(id: string, update: Partial<LandDocument>): Awaitable<LandDocument | null>
  createLandDocument(plotId: string, uploadedFileId: string): Awaitable<LandDocument>
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
  private profiles: FarmerProfile[] = [
    {
      id: 'farmer-somchai',
      ownerName: 'สมชาย ใจดี',
      phone: '08X-XXX-XXXX',
      farmName: 'Somchai Farm',
      province: 'นครสวรรค์',
      district: 'ตาคลี',
      address: 'หมู่ 4 ตาคลี นครสวรรค์',
      consent: true,
      workflowStatus: 'planting_recorded',
      authUserId: 'somchai-auth-id',
    }
  ]

  private plots: Plot[] = [
    { id: 'plot-a', name: 'แปลง A', cropType: 'อ้อย', cropVariety: 'Khon Kaen 3', areaRai: 12, gps: '15.2762, 100.1344', status: 'verified', riskLevel: 'low', boundaryLabel: 'ยืนยันแล้ว', documentStatus: 'ตรวจแล้ว' },
    { id: 'plot-b', name: 'แปลง B', cropType: 'อ้อย', cropVariety: 'LK92-11', areaRai: 8, gps: '15.2827, 100.1210', status: 'pending', riskLevel: 'medium', boundaryLabel: 'รอข้อมูล', documentStatus: 'รอบันทึกเก็บเกี่ยว' },
    { id: 'plot-c', name: 'แปลง C', cropType: 'อ้อย', cropVariety: 'K88-92', areaRai: 15, gps: '15.2709, 100.1518', status: 'flagged', riskLevel: 'high', boundaryLabel: 'ต้องตรวจเพิ่ม', documentStatus: 'มีจุดเสี่ยง' },
  ]

  private plotToFarmer = new Map<string, string>([
    ['plot-a', 'farmer-somchai'],
    ['plot-b', 'farmer-somchai'],
    ['plot-c', 'farmer-somchai'],
  ])

  private uploadedFiles: UploadedFile[] = []
  private landDocuments: LandDocument[] = []

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

  private requireOwnedPlot(farmerId: string, plotId: string) {
    if (this.plotToFarmer.get(plotId) !== farmerId) {
      throw Object.assign(new Error('Plot not found'), { status: 404 })
    }
  }

  getAppData(farmerId: string): AppData {
    const profile = this.profiles.find((p) => p.id === farmerId)
    if (!profile) {
      throw Object.assign(new Error(`Farmer profile ${farmerId} not found`), { status: 404 })
    }

    const plots = this.plots.filter((p) => this.plotToFarmer.get(p.id) === farmerId)
    const plantingRecords = this.plantingRecords.filter((r) => this.plotToFarmer.get(r.plotId) === farmerId)
    const harvestRecords = this.harvestRecords.filter((r) => this.plotToFarmer.get(r.plotId) === farmerId)
    const verifications = this.verifications.filter((v) => this.plotToFarmer.get(v.plotId) === farmerId)
    const tokens = this.tokens.filter((t) => this.plotToFarmer.get(t.plotId) === farmerId)
    const listings = this.listings.filter((l) => this.plotToFarmer.get(l.plotId) === farmerId)

    const totalHarvestTons = harvestRecords.reduce((sum, record) => sum + (record.unit === 'ton' ? record.quantity : record.quantity / 1000), 0)
    return {
      profile,
      workflow: buildWorkflow(profile.workflowStatus),
      summary: {
        registeredPlots: plots.length,
        verifiedPlots: plots.filter((plot) => plot.status === 'verified').length,
        pendingReview: verifications.filter((item) => item.status === 'pending' || item.status === 'checking_burn').length,
        tokenBalance: tokens.reduce((sum, token) => sum + token.tokenAmount, 0),
        totalHarvestTons,
        marketplaceStatus: listings.some((listing) => listing.status === 'listed') ? 'เปิดขายแล้ว' : 'รออนุมัติขาย',
      },
      plots,
      plantingRecords,
      harvestRecords,
      verifications,
      tokens,
      marketplaceListings: listings,
    }
  }

  setWorkflow(farmerId: string, status: WorkflowStatus) {
    const profile = this.profiles.find((p) => p.id === farmerId)
    if (!profile) {
      throw Object.assign(new Error(`Farmer profile ${farmerId} not found`), { status: 404 })
    }
    profile.workflowStatus = status
    return buildWorkflow(status)
  }

  updateProfile(farmerId: string, input: Partial<FarmerProfile>) {
    const profile = this.profiles.find((p) => p.id === farmerId)
    if (!profile) {
      throw Object.assign(new Error(`Farmer profile ${farmerId} not found`), { status: 404 })
    }
    Object.assign(profile, input)
    profile.workflowStatus = input.workflowStatus ?? profile.workflowStatus
    return profile
  }

  createPlot(farmerId: string, input: Omit<Plot, 'id' | 'status' | 'riskLevel'>, document?: PlotDocumentInput) {
    const id = `plot-${Date.now()}`
    const plot: Plot = {
      ...input,
      id,
      status: 'pending',
      riskLevel: 'low',
      documentStatus: document?.uploadedFileId ? 'เอกสารอัปโหลดแล้ว' : input.documentStatus,
    }
    this.plots = [plot, ...this.plots]
    this.plotToFarmer.set(id, farmerId)
    this.setWorkflow(farmerId, 'deed_captured')
    return plot
  }

  confirmBoundary(farmerId: string, plotId: string, boundaryLabel: string) {
    this.requireOwnedPlot(farmerId, plotId)
    this.plots = this.plots.map((plot) => plot.id === plotId ? { ...plot, boundaryLabel, status: 'pending' } : plot)
    this.setWorkflow(farmerId, 'boundary_confirmed')
    return this.plots.find((plot) => plot.id === plotId)
  }

  createPlanting(farmerId: string, input: CreatePlantingInput) {
    this.requireOwnedPlot(farmerId, input.plotId)
    const file = input.photoFileId ? this.getUploadedFile(input.photoFileId) : null
    const photoFileName = file ? file.fileName : (input.photoFileName || 'planting-evidence.jpg')
    const record: PlantingRecord = {
      ...input,
      photoFileName,
      id: `PLR-${Date.now()}`,
      status: 'submitted',
    }
    this.plantingRecords = [record, ...this.plantingRecords]
    this.setWorkflow(farmerId, 'planting_recorded')
    return record
  }

  createHarvest(farmerId: string, input: CreateHarvestInput) {
    this.requireOwnedPlot(farmerId, input.plotId)
    const file = input.photoFileId ? this.getUploadedFile(input.photoFileId) : null
    const photoFileName = file ? file.fileName : (input.photoFileName || 'harvest-evidence.jpg')
    const record: HarvestRecord = {
      ...input,
      photoFileName,
      id: `HAR-${Date.now()}`,
      status: 'submitted',
      traceabilityId: `ZB-2026-${String(this.harvestRecords.length + 1).padStart(3, '0')}`,
    }
    this.harvestRecords = [record, ...this.harvestRecords]
    this.setWorkflow(farmerId, 'harvest_recorded')
    return record
  }

  submitEvidence(farmerId: string, plotId: string, notes: string, evidence?: EvidenceInput) {
    this.requireOwnedPlot(farmerId, plotId)
    const harvest = this.harvestRecords
      .filter((r) => r.plotId === plotId)
      .sort((a, b) => b.harvestDate.localeCompare(a.harvestDate))[0]

    const verification: Verification = {
      id: `VER-${Date.now()}`,
      plotId,
      harvestRecordId: harvest?.id,
      status: 'checking_burn',
      riskLevel: 'medium',
      issueSummary: notes,
      resultNotes: 'กำลังตรวจจาก mock adapter',
      evidenceCount: evidence?.uploadedFileId ? 1 : 0,
    }
    this.verifications = [verification, ...this.verifications]
    this.setWorkflow(farmerId, 'checking_burn')
    return verification
  }

  approveVerification(farmerId: string, plotId: string) {
    this.requireOwnedPlot(farmerId, plotId)
    this.verifications = this.verifications.map((item) => item.plotId === plotId ? { ...item, status: 'approved', resultNotes: 'ผ่าน Zero-Burn ได้รับ 120 แต้ม' } : item)
    if (!this.tokens.some((token) => token.plotId === plotId && token.status === 'available')) {
      this.tokens = [{ id: `ZBT-${Date.now()}`, plotId, tokenAmount: 120, carbonSavedKg: 800, status: 'available', traceabilityId: `ZB-2026-${this.tokens.length + 1}` }, ...this.tokens]
    }
    this.setWorkflow(farmerId, 'token_available')
    return this.getAppData(farmerId)
  }

  createListing(farmerId: string, input: Omit<MarketplaceListing, 'id' | 'status'>) {
    this.requireOwnedPlot(farmerId, input.plotId)
    const listing: MarketplaceListing = { ...input, id: `MKT-${Date.now()}`, status: 'pending_approval' }
    this.listings = [listing, ...this.listings]
    this.setWorkflow(farmerId, 'listing_pending')
    return listing
  }

  markListing(farmerId: string, status: 'listed' | 'sold') {
    this.listings = this.listings.map((listing) => this.plotToFarmer.get(listing.plotId) === farmerId ? { ...listing, status } : listing)
    this.setWorkflow(farmerId, status)
    return this.getAppData(farmerId)
  }

  findProfileByAuthId(authUserId: string) {
    return this.profiles.find((p) => p.authUserId === authUserId)
  }

  createProfileWithAuth(authUserId: string, input: ProfileUpdate) {
    const existing = this.findProfileByAuthId(authUserId)
    if (existing) return existing

    const profile: FarmerProfile = {
      id: `farmer-${Date.now()}`,
      ownerName: input.ownerName ?? '',
      phone: input.phone ?? '',
      farmName: input.farmName ?? '',
      province: input.province ?? '',
      district: input.district ?? '',
      address: input.address ?? '',
      consent: input.consent ?? false,
      workflowStatus: 'deed_captured',
      authUserId,
    }
    this.profiles.push(profile)
    return profile
  }

  createUploadedFile(input: Omit<UploadedFile, 'id' | 'createdAt' | 'uploadedAt'>) {
    const id = `upload-${Date.now()}`
    const file: UploadedFile = {
      ...input,
      id,
      createdAt: new Date().toISOString(),
      uploadedAt: undefined,
    }
    this.uploadedFiles.push(file)
    return file
  }

  getUploadedFile(id: string) {
    return this.uploadedFiles.find((f) => f.id === id) || null
  }

  updateUploadedFileStatus(id: string, status: 'pending' | 'uploaded' | 'failed' | 'deleted', sizeBytes?: number) {
    const file = this.uploadedFiles.find((f) => f.id === id)
    if (!file) return null
    file.uploadStatus = status
    if (status === 'uploaded') {
      file.uploadedAt = new Date().toISOString()
      if (sizeBytes !== undefined) file.sizeBytes = sizeBytes
    }
    return file
  }

  getLandDocument(id: string) {
    return this.landDocuments.find((d) => d.id === id) || null
  }

  updateLandDocument(id: string, update: Partial<LandDocument>) {
    const doc = this.landDocuments.find((d) => d.id === id)
    if (!doc) return null
    Object.assign(doc, update)
    doc.updatedAt = new Date().toISOString()

    if (update.ocrStatus) {
      this.plots = this.plots.map((p) => p.id === doc.plotId ? { ...p, documentStatus: update.ocrStatus! } : p)
    }
    if (update.boundaryStatus) {
      this.plots = this.plots.map((p) => p.id === doc.plotId ? { ...p, boundaryLabel: update.boundaryStatus! } : p)
    }

    return doc
  }

  createLandDocument(plotId: string, uploadedFileId: string) {
    const id = `doc-${Date.now()}`
    const doc: LandDocument = {
      id,
      plotId,
      uploadedFileId,
      documentType: 'thai_land_title_deed',
      ocrStatus: 'pending_upload',
      boundaryStatus: 'pending_upload',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.landDocuments.push(doc)
    return doc
  }
}
