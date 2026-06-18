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
} from './types'

export const workflowOrder: WorkflowStatus[] = [
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

export function createWorkflow(status: WorkflowStatus): WorkflowSnapshot {
  const visibleSteps = status === 'rejected'
    ? workflowOrder.map((step) => step === 'checking_burn' ? 'rejected' : step)
    : workflowOrder
  const index = visibleSteps.indexOf(status)
  const nextAction: Record<WorkflowStatus, WorkflowSnapshot['nextAction']> = {
    registration: { title: 'ยืนยันข้อมูลไร่', description: 'เพิ่มข้อมูลเจ้าของไร่และเอกสารพื้นที่ก่อนเริ่มใช้งาน', primaryLabel: 'อัปเดตโปรไฟล์', primaryRoute: '/profile/edit', mascot: 'welcome' },
    deed_captured: { title: 'ยืนยันขอบเขตแปลง', description: 'ตรวจขอบเขตที่ระบบอ่านจากเอกสารพื้นที่', primaryLabel: 'ไปที่แปลง', primaryRoute: '/plots/new', mascot: 'map' },
    boundary_confirmed: { title: 'บันทึกวันเริ่มปลูก', description: 'เลือกแปลง ใส่วันที่เริ่มปลูก และแนบรูปจากไร่', primaryLabel: 'บันทึกวันปลูก', primaryRoute: '/records/planting/new', mascot: 'mobile' },
    planting_recorded: { title: 'บันทึกข้อมูลเก็บเกี่ยว', description: 'แปลง B พร้อมเก็บเกี่ยวแล้ว บันทึกข้อมูลเพื่อส่งตรวจ Zero-Burn', primaryLabel: 'บันทึกเก็บเกี่ยว', primaryRoute: '/records/harvest/new', secondaryLabel: 'ดูแปลง', secondaryRoute: '/plots', mascot: 'harvest' },
    harvest_recorded: { title: 'ส่งหลักฐานไม่เผา', description: 'แนบภาพการจัดการเศษซากและคำอธิบายเพื่อส่งตรวจ', primaryLabel: 'แนบหลักฐาน', primaryRoute: '/status/evidence', mascot: 'residue' },
    evidence_submitted: { title: 'รอตรวจ Zero-Burn', description: 'ระบบกำลังตรวจข้อมูลแปลงและหลักฐานที่ส่งมา', primaryLabel: 'ดูสถานะ', primaryRoute: '/status', mascot: 'mobile' },
    checking_burn: { title: 'ดูผลตรวจ Zero-Burn', description: 'ผลตรวจพร้อมดูแล้ว ตรวจรายละเอียดก่อนรับแต้ม', primaryLabel: 'ดูผลตรวจ', primaryRoute: '/status/result', mascot: 'approved' },
    approved: { title: 'รับแต้ม Zero-Burn', description: 'ผ่านการตรวจแล้ว ระบบประเมิน Carbon Saved และออกแต้มให้', primaryLabel: 'ดูแต้ม', primaryRoute: '/sell', mascot: 'approved' },
    rejected: { title: 'ต้องส่งหลักฐานเพิ่ม', description: 'มีจุดเสี่ยงในแปลง ส่งรูปหรือคำอธิบายเพิ่มเพื่อให้ตรวจต่อ', primaryLabel: 'ส่งหลักฐานเพิ่ม', primaryRoute: '/status/evidence', mascot: 'residue' },
    token_available: { title: 'ขายพร้อมแต้ม Zero-Burn', description: 'เลือก lot เก็บเกี่ยวแล้วแนบแต้มที่ผ่านการประเมิน', primaryLabel: 'ขาย + แนบแต้ม', primaryRoute: '/sell/new', mascot: 'sell' },
    listing_pending: { title: 'รออนุมัติประกาศขาย', description: 'ส่งประกาศแล้ว ระบบกำลังตรวจข้อมูลก่อนเปิดให้ผู้ซื้อเห็น', primaryLabel: 'ดูประกาศขาย', primaryRoute: '/sell/status', mascot: 'sell' },
    listed: { title: 'ประกาศขายอยู่', description: 'ผู้ซื้อสามารถเห็นประกาศพร้อมข้อมูล Zero-Burn แล้ว', primaryLabel: 'ดูประกาศขาย', primaryRoute: '/sell/status', mascot: 'sell' },
    sold: { title: 'ขายสำเร็จ', description: 'บันทึกการขายสำเร็จ เก็บประวัติไว้ในโปรไฟล์ไร่', primaryLabel: 'กลับหน้าแรก', primaryRoute: '/', mascot: 'welcome' },
  }

  return {
    status,
    nextAction: nextAction[status],
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

const profile: FarmerProfile = {
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

const plots: Plot[] = [
  { id: 'plot-a', name: 'แปลง A', cropType: 'อ้อย', cropVariety: 'Khon Kaen 3', areaRai: 12, gps: '15.2762, 100.1344', status: 'verified', riskLevel: 'low', boundaryLabel: 'ยืนยันแล้ว', documentStatus: 'ตรวจแล้ว' },
  { id: 'plot-b', name: 'แปลง B', cropType: 'อ้อย', cropVariety: 'LK92-11', areaRai: 8, gps: '15.2827, 100.1210', status: 'pending', riskLevel: 'medium', boundaryLabel: 'รอข้อมูล', documentStatus: 'รอบันทึกเก็บเกี่ยว' },
  { id: 'plot-c', name: 'แปลง C', cropType: 'อ้อย', cropVariety: 'K88-92', areaRai: 15, gps: '15.2709, 100.1518', status: 'flagged', riskLevel: 'high', boundaryLabel: 'ต้องตรวจเพิ่ม', documentStatus: 'มีจุดเสี่ยง' },
]

const plantingRecords: PlantingRecord[] = [
  { id: 'PLR-001', plotId: 'plot-a', season: '2025/26', plantingDate: '2025-06-12', cropType: 'อ้อย', cropVariety: 'Khon Kaen 3', photoFileName: 'field-a.jpg', notes: 'ปลูกตามร่องเดิม', status: 'complete' },
]

const harvestRecords: HarvestRecord[] = [
  { id: 'HAR-001', plotId: 'plot-a', season: '2025/26', harvestDate: '2026-03-15', quantity: 35, unit: 'ton', traceabilityId: 'ZB-2026-001', photoFileName: 'harvest-a.jpg', notes: 'ไม่มีการเผา', status: 'linked' },
]

const verifications: Verification[] = [
  { id: 'VER-001', plotId: 'plot-a', harvestRecordId: 'HAR-001', status: 'approved', riskLevel: 'low', issueSummary: 'ไม่พบสัญญาณเผา', resultNotes: 'ผ่าน Zero-Burn', evidenceCount: 2 },
  { id: 'VER-002', plotId: 'plot-b', status: 'pending', riskLevel: 'medium', issueSummary: 'รอบันทึกเก็บเกี่ยว', resultNotes: 'ยังไม่ส่งตรวจ', evidenceCount: 0 },
]

const tokens: TokenLot[] = [
  { id: 'ZBT-2026-001', plotId: 'plot-a', harvestRecordId: 'HAR-001', tokenAmount: 180, carbonSavedKg: 1200, status: 'available', traceabilityId: 'ZB-2026-001' },
]

const marketplaceListings: MarketplaceListing[] = [
  { id: 'MKT-001', plotId: 'plot-a', harvestRecordId: 'HAR-001', tokenLotId: 'ZBT-2026-001', productName: 'อ้อยสดคุณภาพ', quantity: 35, unit: 'ton', price: 2400, buyerVisibility: 'public', status: 'draft' },
]

export const fallbackAppData: AppData = {
  profile,
  workflow: createWorkflow(profile.workflowStatus),
  summary: {
    registeredPlots: plots.length,
    verifiedPlots: 1,
    pendingReview: 1,
    tokenBalance: 180,
    totalHarvestTons: 35,
    marketplaceStatus: 'รออนุมัติขาย',
  },
  plots,
  plantingRecords,
  harvestRecords,
  verifications,
  tokens,
  marketplaceListings,
}
