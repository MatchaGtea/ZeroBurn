import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Card, FormField, Pill, StatTile, TextAreaField } from './components/ui'
import { fallbackAppData } from './data/mockData'
import type {
  AppData,
  HarvestRecord,
  MarketplaceListing,
  MascotPose,
  PlantingRecord,
  Plot,
  PlotStatus,
  Verification,
  VerificationStatus,
  WorkflowStatus,
} from './data/types'
import { loadAppData, patchJson, postJson, refreshAppData, setWorkflowStatus } from './lib/api'

type IconProps = { size?: number; strokeWidth?: number }

function makeIcon(paths: ReactNode) {
  return ({ size = 20, strokeWidth = 2 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  )
}

const BadgeCheck = makeIcon(<><path d="M4 12a4 4 0 0 1 2.2-3.6 4 4 0 0 1 6.8-2 4 4 0 0 1 6.8 2A4 4 0 0 1 20 16a4 4 0 0 1-7 1.6A4 4 0 0 1 6.2 16 4 4 0 0 1 4 12Z" /><path d="m8.5 12.5 2.3 2.3 4.8-5" /></>)
const CalendarDays = makeIcon(<><path d="M7 3v4M17 3v4M4 9h16M5 5h14v16H5z" /><path d="M8 13h2M14 13h2M8 17h2M14 17h2" /></>)
const Check = makeIcon(<path d="m5 12 4 4L19 6" />)
const CheckCircle2 = makeIcon(<><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>)
const CircleDollarSign = makeIcon(<><circle cx="12" cy="12" r="9" /><path d="M12 6v12M15 9.5c-.5-1-1.6-1.5-3-1.5-2 0-3 .9-3 2s1 1.8 3 2 3 .9 3 2-1 2-3 2c-1.5 0-2.6-.5-3.2-1.5" /></>)
const ClipboardList = makeIcon(<><path d="M9 4h6l1 2h3v15H5V6h3z" /><path d="M9 11h6M9 15h6" /></>)
const Clock3 = makeIcon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
const Home = makeIcon(<><path d="M3 11 12 4l9 7" /><path d="M6 10v10h12V10" /></>)
const Map = makeIcon(<><path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3z" /><path d="M9 3v15M15 6v15" /></>)
const MapPin = makeIcon(<><path d="M12 22s7-5 7-12a7 7 0 0 0-14 0c0 7 7 12 7 12Z" /><circle cx="12" cy="10" r="2" /></>)
const PackageCheck = makeIcon(<><path d="m3 7 9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="m9 16 2 2 4-5" /></>)
const Plus = makeIcon(<><path d="M12 5v14M5 12h14" /></>)
const ShieldCheck = makeIcon(<><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="m8 12 3 3 5-6" /></>)
const ShoppingBag = makeIcon(<><path d="M6 8h12l-1 13H7z" /><path d="M9 8a3 3 0 0 1 6 0" /></>)
const Upload = makeIcon(<><path d="M16 16h2a4 4 0 0 0 0-8 6 6 0 0 0-11-2A5 5 0 0 0 6 16h2" /><path d="M12 19V9M8 13l4-4 4 4" /></>)
const User = makeIcon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c2-5 14-5 16 0" /></>)
const Wheat = makeIcon(<><path d="M12 22V4" /><path d="M8 6c0 2 2 3 4 3M16 6c0 2-2 3-4 3M8 11c0 2 2 3 4 3M16 11c0 2-2 3-4 3M8 16c0 2 2 3 4 3M16 16c0 2-2 3-4 3" /></>)

const asset = (name: string) => `${import.meta.env.BASE_URL}zeroburn-assets/${name}`

const farmFieldImage = asset('farm-field-background.png')
const farmerMobileImage = asset('farmer-using-mobile-app.png')
const harvestImage = asset('harvest-evidence.png')
const residueImage = asset('residue-management.png')
const sugarcaneImage = asset('sugarcane-close-up.png')
const titleDeedImage = asset('title-deed-capture-mock.png')
const mascotApproved = asset('thiraphak-mascot-approved.png')
const mascotHarvest = asset('thiraphak-mascot-harvest.png')
const mascotMap = asset('thiraphak-mascot-map.png')
const mascotMobile = asset('thiraphak-mascot-mobile.png')
const mascotResidue = asset('thiraphak-mascot-residue.png')
const mascotSell = asset('thiraphak-mascot-sell.png')
const mascotTitleDeed = asset('thiraphak-mascot-title-deed.png')
const mascotWelcome = asset('thiraphak-mascot-welcome.png')

const mascotByPose: Record<MascotPose, string> = {
  welcome: mascotWelcome,
  map: mascotMap,
  mobile: mascotMobile,
  harvest: mascotHarvest,
  residue: mascotResidue,
  sell: mascotSell,
  approved: mascotApproved,
  titleDeed: mascotTitleDeed,
}

const navItems = [
  { to: '/', label: 'หน้าแรก', icon: Home },
  { to: '/plots', label: 'แปลง', icon: Map },
  { to: '/records', label: 'บันทึก', icon: ClipboardList },
  { to: '/status', label: 'สถานะ', icon: CheckCircle2 },
  { to: '/sell', label: 'ขาย', icon: ShoppingBag },
  { to: '/profile', label: 'โปรไฟล์', icon: User },
]

type AppActions = {
  submittingAction: AppActionName | null
  updateProfile: (input: Partial<AppData['profile']>) => Promise<boolean>
  addPlot: (input: Omit<Plot, 'id' | 'status' | 'riskLevel'>) => Promise<boolean>
  addPlanting: (input: Omit<PlantingRecord, 'id' | 'status'>) => Promise<boolean>
  addHarvest: (input: Omit<HarvestRecord, 'id' | 'status' | 'traceabilityId'>) => Promise<boolean>
  submitEvidence: (plotId: string, notes: string) => Promise<boolean>
  approveVerification: (plotId: string) => Promise<boolean>
  rejectVerification: () => Promise<boolean>
  createListing: (input: Omit<MarketplaceListing, 'id' | 'status'>) => Promise<boolean>
  markListed: () => Promise<boolean>
  markSold: () => Promise<boolean>
  setWorkflow: (status: WorkflowStatus) => Promise<boolean>
}

type AppActionName = 'profile' | 'plot' | 'planting' | 'harvest' | 'evidence' | 'approve' | 'reject' | 'listing' | 'listed' | 'sold' | 'workflow'
type MutationFeedback = { tone: 'success' | 'error'; message: string }

function App() {
  const [data, setData] = useState<AppData>(fallbackAppData)
  const [isLoading, setIsLoading] = useState(true)
  const [submittingAction, setSubmittingAction] = useState<AppActionName | null>(null)
  const [feedback, setFeedback] = useState<MutationFeedback | null>(null)
  const mutationLock = useRef(false)

  useEffect(() => {
    let active = true
    loadAppData().then((loadedData) => {
      if (!active) return
      setData(loadedData)
      setIsLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const runMutation = useCallback(async (
    action: AppActionName,
    successMessage: string,
    mutation: () => Promise<unknown>,
  ) => {
    if (mutationLock.current) return false

    mutationLock.current = true
    setSubmittingAction(action)
    setFeedback(null)

    try {
      await mutation()
      const freshData = await refreshAppData()
      setData(freshData)
      setFeedback({ tone: 'success', message: successMessage })
      return true
    } catch {
      setFeedback({ tone: 'error', message: 'บันทึกไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่' })
      return false
    } finally {
      mutationLock.current = false
      setSubmittingAction(null)
    }
  }, [])

  const actions = useMemo<AppActions>(() => ({
    submittingAction,
    updateProfile(input) {
      return runMutation('profile', 'บันทึกโปรไฟล์แล้ว', () => patchJson('/profile', input))
    },
    addPlot(input) {
      return runMutation('plot', 'บันทึกแปลงแล้ว', () => postJson('/plots', input))
    },
    addPlanting(input) {
      return runMutation('planting', 'บันทึกวันปลูกแล้ว', () => postJson('/records/planting', input))
    },
    addHarvest(input) {
      return runMutation('harvest', 'บันทึกการเก็บเกี่ยวแล้ว', () => postJson('/records/harvest', input))
    },
    submitEvidence(plotId, notes) {
      return runMutation('evidence', 'ส่งหลักฐานแล้ว', () => postJson('/verifications/evidence', { plotId, notes, photoFileName: 'residue-evidence.jpg' }))
    },
    approveVerification(plotId) {
      return runMutation('approve', 'อนุมัติและรับแต้มแล้ว', () => postJson(`/verifications/${plotId}/mock-approve`, {}))
    },
    rejectVerification() {
      return runMutation('reject', 'อัปเดตสถานะให้ส่งหลักฐานเพิ่มแล้ว', () => setWorkflowStatus('rejected'))
    },
    createListing(input) {
      return runMutation('listing', 'ส่งประกาศขายแล้ว', () => postJson('/marketplace/listings', input))
    },
    markListed() {
      return runMutation('listed', 'เปิดประกาศขายแล้ว', () => postJson('/marketplace/listings/mock-status', { status: 'listed' }))
    },
    markSold() {
      return runMutation('sold', 'บันทึกว่าขายสำเร็จแล้ว', () => postJson('/marketplace/listings/mock-status', { status: 'sold' }))
    },
    setWorkflow(status) {
      return runMutation('workflow', 'อัปเดตขั้นตอนแล้ว', () => setWorkflowStatus(status))
    },
  }), [runMutation, submittingAction])

  return (
    <div className="app-canvas">
      <div className="phone-shell">
        <TopBar data={data} isLoading={isLoading} />
        <main className="screen-scroll">
          <MutationNotice feedback={feedback} />
          <Routes>
            <Route path="/" element={<DashboardPage data={data} />} />
            <Route path="/plots" element={<PlotsPage data={data} />} />
            <Route path="/plots/new" element={<AddPlotPage data={data} actions={actions} />} />
            <Route path="/records" element={<RecordsPage data={data} />} />
            <Route path="/records/planting/new" element={<PlantingPage data={data} actions={actions} />} />
            <Route path="/records/harvest/new" element={<HarvestPage data={data} actions={actions} />} />
            <Route path="/records/success" element={<RecordSuccessPage data={data} />} />
            <Route path="/status" element={<StatusPage data={data} />} />
            <Route path="/status/evidence" element={<EvidencePage data={data} actions={actions} />} />
            <Route path="/status/result" element={<ResultPage data={data} actions={actions} />} />
            <Route path="/sell" element={<SellPage data={data} />} />
            <Route path="/sell/new" element={<SellFormPage data={data} actions={actions} />} />
            <Route path="/sell/status" element={<SellStatusPage data={data} actions={actions} />} />
            <Route path="/profile" element={<ProfilePage data={data} />} />
            <Route path="/profile/edit" element={<ProfileEditPage data={data} actions={actions} />} />
            <Route path="/token-marketplace" element={<Navigate to="/sell" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}

function TopBar({ data, isLoading }: { data: AppData; isLoading: boolean }) {
  return (
    <header className="top-bar">
      <div>
        <span className="top-label">{isLoading ? 'กำลังโหลดข้อมูล' : 'ZeroBurn Farmer'}</span>
        <strong>{data.profile.farmName}</strong>
      </div>
      <div className="season-chip">
        <CalendarDays size={15} />
        ฤดู 2025/26
      </div>
    </header>
  )
}

function MutationNotice({ feedback }: { feedback: MutationFeedback | null }) {
  return (
    <div className="mutation-notice-region" aria-live="polite" aria-atomic="true">
      {feedback && (
        <div className={`mutation-notice mutation-notice-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </div>
      )}
    </div>
  )
}

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <item.icon size={19} strokeWidth={2.2} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function DashboardPage({ data }: { data: AppData }) {
  const navigate = useNavigate()
  const next = data.workflow.nextAction

  return (
    <PageStack title="หน้าแรก" action={<ProfileDot initials="SF" />}>
      <section className="next-action-card">
        <div className="mascot-frame">
          <img src={mascotByPose[next.mascot]} alt="" />
        </div>
        <div className="next-copy">
          <Pill>งานต่อไป</Pill>
          <h2>{next.title}</h2>
          <p>{next.description}</p>
          <div className="button-row">
            <button className="primary-button" onClick={() => navigate(next.primaryRoute)}>{next.primaryLabel}</button>
            {next.secondaryRoute && <button className="ghost-button" onClick={() => navigate(next.secondaryRoute)}>{next.secondaryLabel}</button>}
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <StatTile icon={<Map size={19} />} label="แปลงทั้งหมด" value={data.summary.registeredPlots} helper="ลงทะเบียนแล้ว" />
        <StatTile icon={<Check size={19} />} label="ผ่านตรวจ" value={data.summary.verifiedPlots} helper="Zero-Burn" />
        <StatTile icon={<Clock3 size={19} />} label="รอตรวจ" value={data.summary.pendingReview} helper="ต้องติดตาม" />
        <StatTile icon={<CircleDollarSign size={19} />} label="แต้ม" value={data.summary.tokenBalance} helper="พร้อมใช้" />
        <StatTile icon={<Wheat size={19} />} label="เก็บเกี่ยว" value={`${data.summary.totalHarvestTons} ตัน`} />
        <StatTile icon={<ShoppingBag size={19} />} label="ตลาด" value={data.summary.marketplaceStatus} />
      </div>

      <Card title="ภาพรวมไร่" action={<button className="link-button" onClick={() => navigate('/plots')}>ดูแปลง</button>}>
        <ImageCard src={farmFieldImage} title="Somchai Farm" caption="นครสวรรค์ · อ้อย" />
      </Card>
    </PageStack>
  )
}

function PlotsPage({ data }: { data: AppData }) {
  const navigate = useNavigate()
  const selectedPlot = data.plots[0]

  return (
    <PageStack title="แปลงของฉัน" action={<button className="circle-button" onClick={() => navigate('/plots/new')}><Plus size={20} /></button>}>
      <GuideCard pose="map" label="จัดการพื้นที่" title="ตรวจขอบเขตแปลง" text="แตะแผนที่เพื่อดูสถานะแต่ละแปลง หรือเพิ่มแปลงใหม่" cta="เพิ่มแปลง" onClick={() => navigate('/plots/new')} />
      <FarmMap plots={data.plots} />
      <div className="list-stack">
        {data.plots.map((plot) => <PlotRow key={plot.id} plot={plot} />)}
      </div>
      {selectedPlot && (
        <Card title={`${selectedPlot.name} detail`}>
          <InfoRows rows={[
            ['พืช', selectedPlot.cropType],
            ['พื้นที่', `${selectedPlot.areaRai} ไร่`],
            ['ขอบเขต', selectedPlot.boundaryLabel],
            ['เอกสาร', selectedPlot.documentStatus],
          ]} />
          <button className="primary-button full" onClick={() => navigate('/plots/new')}>ดู / แก้รายละเอียดแปลง</button>
        </Card>
      )}
    </PageStack>
  )
}

function AddPlotPage({ data, actions }: { data: AppData; actions: AppActions }) {
  const navigate = useNavigate()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await actions.addPlot({
      name: getFormString(form, 'name') || 'แปลงใหม่',
      cropType: getFormString(form, 'cropType') || 'อ้อย',
      cropVariety: getFormString(form, 'cropVariety') || 'ยังไม่ระบุ',
      areaRai: Number(form.get('areaRai') || 0),
      gps: getFormString(form, 'gps') || 'GPS จากเครื่อง',
      boundaryLabel: 'ระบบช่วยลากขอบเขตให้แล้ว',
      documentStatus: 'มีรูปเอกสารพื้นที่',
    })
    if (saved) navigate('/plots')
  }

  return (
    <FormScreen title="เพิ่ม/ยืนยันแปลง" stepIndex={2} data={data}>
      <GuideMedia image={farmFieldImage} mascot="map" text="ระบบช่วยลากขอบเขตให้แล้ว ตรวจชื่อแปลงและพื้นที่ก่อนบันทึก" />
      <form className="form-grid" onSubmit={onSubmit}>
        <FormField label="ชื่อแปลง" name="name" defaultValue="แปลง D" required />
        <FormField label="พืชที่ปลูก" name="cropType" defaultValue="อ้อย" required />
        <FormField label="พื้นที่ไร่" name="areaRai" type="number" defaultValue={10} required />
        <FormField label="พันธุ์อ้อย" name="cropVariety" defaultValue="LK92-11" />
        <FormField label="GPS / ที่ตั้ง" name="gps" defaultValue={data.plots[0]?.gps ?? 'นครสวรรค์'} />
        <UploadBox title="รูปเอกสารพื้นที่" helper="โฉนดตัวอย่าง · ไม่เก็บข้อมูลจริงใน prototype" image={titleDeedImage} />
        <MiniBoundary />
        <SubmitButton actions={actions} action="plot" label="บันทึกแปลง" />
      </form>
    </FormScreen>
  )
}

function RecordsPage({ data }: { data: AppData }) {
  const [tab, setTab] = useState<'planting' | 'harvest'>('planting')
  const navigate = useNavigate()
  const isPlanting = tab === 'planting'
  const records = isPlanting ? data.plantingRecords : data.harvestRecords

  return (
    <PageStack title="บันทึก" action={<button className="circle-button" onClick={() => navigate(isPlanting ? '/records/planting/new' : '/records/harvest/new')}><Plus size={20} /></button>}>
      <div className="segmented">
        <button className={isPlanting ? 'active' : ''} onClick={() => setTab('planting')}>ปลูก</button>
        <button className={!isPlanting ? 'active' : ''} onClick={() => setTab('harvest')}>เก็บเกี่ยว</button>
      </div>
      <GuideCard pose={isPlanting ? 'mobile' : 'harvest'} label="บันทึกง่ายๆ" title={isPlanting ? 'เพิ่มวันเริ่มปลูก' : 'บันทึกเก็บเกี่ยว'} text="เลือกแปลง ใส่วันที่ และแนบรูปถ่ายจากไร่" cta={isPlanting ? 'เพิ่มบันทึกปลูก' : 'บันทึกเก็บเกี่ยว'} onClick={() => navigate(isPlanting ? '/records/planting/new' : '/records/harvest/new')} />
      <div className="list-stack">
        {records.map((record) => (
          <RecordRow
            key={record.id}
            title={isPlanting ? plotName(data, record.plotId) : record.traceabilityId}
            meta={isPlanting ? `เริ่มปลูก ${record.plantingDate}` : `${plotName(data, record.plotId)} · ${record.quantity} ${record.unit}`}
            status={record.status}
          />
        ))}
      </div>
    </PageStack>
  )
}

function PlantingPage({ data, actions }: { data: AppData; actions: AppActions }) {
  const navigate = useNavigate()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await actions.addPlanting({
      plotId: getFormString(form, 'plotId') || (data.plots[0]?.id ?? 'plot-a'),
      season: getFormString(form, 'season') || '2025/26',
      plantingDate: getFormString(form, 'plantingDate') || '2026-06-12',
      cropType: 'อ้อย',
      cropVariety: getFormString(form, 'cropVariety') || 'LK92-11',
      photoFileName: 'planting-photo.jpg',
      notes: getFormString(form, 'notes'),
    })
    if (saved) navigate('/records/success')
  }

  return (
    <FormScreen title="เพิ่มวันเริ่มปลูก" stepIndex={3} data={data}>
      <GuideMedia image={sugarcaneImage} mascot="mobile" text="ถ่ายรูปจากไร่ไว้เป็นหลักฐาน แล้วบันทึกวันที่เริ่มปลูก" />
      <form className="form-grid" onSubmit={onSubmit}>
        <SelectPlot data={data} />
        <FormField label="วันที่เริ่มปลูก" name="plantingDate" type="date" defaultValue="2026-06-12" required />
        <FormField label="ฤดูเพาะปลูก" name="season" defaultValue="2025/26" />
        <FormField label="พันธุ์อ้อย" name="cropVariety" defaultValue="LK92-11" />
        <UploadBox title="รูปจากไร่" helper="รูปต้นอ้อยหรือพื้นที่ปลูก" image={sugarcaneImage} />
        <TextAreaField label="หมายเหตุ" name="notes" placeholder="เช่น ปลูกตามร่องเดิม" />
        <SubmitButton actions={actions} action="planting" label="บันทึกวันปลูก" />
      </form>
    </FormScreen>
  )
}

function HarvestPage({ data, actions }: { data: AppData; actions: AppActions }) {
  const navigate = useNavigate()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await actions.addHarvest({
      plotId: getFormString(form, 'plotId') || (data.plots[1]?.id ?? data.plots[0]?.id ?? 'plot-a'),
      season: getFormString(form, 'season') || '2025/26',
      harvestDate: getFormString(form, 'harvestDate') || '2026-03-15',
      quantity: Number(form.get('quantity') || 0),
      unit: 'ton',
      photoFileName: 'harvest-evidence.jpg',
      notes: getFormString(form, 'notes'),
    })
    if (saved) navigate('/status/evidence')
  }

  return (
    <FormScreen title="บันทึกเก็บเกี่ยว" stepIndex={4} data={data}>
      <GuideMedia image={harvestImage} mascot="harvest" text="ใส่วันที่ ปริมาณ และรูปผลผลิต เพื่อส่งตรวจ Zero-Burn ต่อ" />
      <form className="form-grid" onSubmit={onSubmit}>
        <SelectPlot data={data} preferredId="plot-b" />
        <FormField label="วันที่เก็บเกี่ยว" name="harvestDate" type="date" defaultValue="2026-03-15" required />
        <FormField label="ปริมาณผลผลิต (ตัน)" name="quantity" type="number" defaultValue={35} required />
        <FormField label="ฤดูเพาะปลูก" name="season" defaultValue="2025/26" />
        <UploadBox title="รูป harvest" helper="รูปมัดอ้อย รถบรรทุก หรือจุดชั่ง" image={harvestImage} />
        <TextAreaField label="หมายเหตุ" name="notes" placeholder="เช่น เก็บเกี่ยวสด ไม่เผา" />
        <SubmitButton actions={actions} action="harvest" label="ส่งตรวจ Zero-Burn" />
      </form>
    </FormScreen>
  )
}

function RecordSuccessPage({ data }: { data: AppData }) {
  const navigate = useNavigate()
  return (
    <PageStack title="บันทึกสำเร็จ">
      <SuccessCard pose="mobile" title="บันทึกแล้ว" text="ข้อมูลถูกบันทึกไว้ในประวัติไร่แล้ว" />
      <WorkflowStepper steps={data.workflow.steps} />
      <button className="primary-button full" onClick={() => navigate('/')}>กลับหน้าแรก</button>
    </PageStack>
  )
}

function StatusPage({ data }: { data: AppData }) {
  const navigate = useNavigate()
  return (
    <PageStack title="สถานะ Zero-Burn" action={<button className="soft-button" onClick={() => navigate('/status/evidence')}>หลักฐาน</button>}>
      <GuideCard pose="residue" label="ตรวจไม่เผา" title="ติดตามผลตรวจแต่ละแปลง" text="ดูสถานะตรวจ หลักฐาน และผลอนุมัติ Zero-Burn" cta="ดูผลตรวจ" onClick={() => navigate('/status/result')} />
      <Card title="สถานะแปลง">
        <div className="list-stack compact">
          {data.plots.map((plot) => {
            const verification = data.verifications.find((item) => item.plotId === plot.id)
            return <StatusRow key={plot.id} plot={plot} verification={verification} />
          })}
        </div>
      </Card>
      <Card title="Inspection timeline">
        <Timeline items={['รับข้อมูลแปลง', 'ตรวจภาพพื้นที่และหลักฐาน', 'ประเมิน Carbon Saved', 'ออกผลอนุมัติ']} />
      </Card>
      <button className="primary-button full" onClick={() => navigate('/status/result')}>ดูผลอนุมัติ / ใบรับรอง</button>
    </PageStack>
  )
}

function EvidencePage({ data, actions }: { data: AppData; actions: AppActions }) {
  const navigate = useNavigate()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await actions.submitEvidence(
      getFormString(form, 'plotId') || (data.plots[1]?.id ?? 'plot-b'),
      getFormString(form, 'notes') || 'ส่งหลักฐานการจัดการเศษซาก',
    )
    if (saved) navigate('/status/result')
  }

  return (
    <FormScreen title="ส่งหลักฐานเพิ่ม" stepIndex={5} data={data}>
      <GuideMedia image={residueImage} mascot="residue" text="ถ่ายภาพเศษซากอ้อยที่จัดการแล้ว ไม่มีควันหรือไฟ" />
      <Card title="พื้นที่เสี่ยงบนแผนที่">
        <MiniBoundary warning />
        <p className="helper-text">พบจุดที่ต้องตรวจเพิ่มใกล้ขอบแปลงด้านใต้</p>
      </Card>
      <form className="form-grid" onSubmit={onSubmit}>
        <SelectPlot data={data} preferredId="plot-b" />
        <UploadBox title="อัปโหลดรูปหลักฐาน" helper="รูปเศษซากอ้อยบนดิน หรือการคลุมดิน" image={residueImage} />
        <TextAreaField label="อธิบายเพิ่มเติม" name="notes" defaultValue="จัดการเศษซากโดยสับคลุมดิน ไม่มีการเผา" />
        <div className="auto-note"><MapPin size={16} /> วันที่/GPS บันทึกอัตโนมัติจากเครื่อง</div>
        <SubmitButton actions={actions} action="evidence" label="ส่งหลักฐานเพิ่ม" />
      </form>
    </FormScreen>
  )
}

function ResultPage({ data, actions }: { data: AppData; actions: AppActions }) {
  const navigate = useNavigate()
  const plotId = data.verifications[0]?.plotId ?? data.plots[0]?.id ?? 'plot-a'
  const status = data.workflow.status
  const isApproved = status === 'approved' || status === 'token_available' || status === 'listing_pending' || status === 'listed' || status === 'sold'
  const isSubmitting = actions.submittingAction !== null

  async function approve() {
    if (await actions.approveVerification(plotId)) navigate('/sell')
  }

  async function reject() {
    if (await actions.rejectVerification()) navigate('/status/evidence')
  }

  return (
    <PageStack title="ผลการตรวจ">
      <SuccessCard pose={isApproved ? 'approved' : 'residue'} title={isApproved ? 'ผ่าน Zero-Burn' : 'กำลังตรวจหลักฐาน'} text={isApproved ? 'ระบบประเมิน Carbon Saved และออกแต้มให้แล้ว' : 'prototype นี้กดจำลองผลตรวจเพื่อไปขั้นตอนถัดไปได้'} />
      <Card title="Evidence / result card">
        <InfoRows rows={[
          ['ผลตรวจ', isApproved ? 'ผ่าน' : data.workflow.status === 'rejected' ? 'ต้องส่งเพิ่ม' : 'รอตรวจ'],
          ['Traceability ID', data.harvestRecords[0]?.traceabilityId ?? 'รอสร้าง'],
          ['หลักฐาน', `${data.verifications[0]?.evidenceCount ?? 1} รูป`],
          ['แต้มที่คาดได้', '120 แต้ม'],
        ]} />
      </Card>
      <div className="button-grid">
        <button className="primary-button" disabled={isSubmitting} onClick={approve}>
          {actions.submittingAction === 'approve' ? 'กำลังบันทึก...' : 'จำลองผ่าน / รับแต้ม'}
        </button>
        <button className="ghost-button" disabled={isSubmitting} onClick={reject}>
          {actions.submittingAction === 'reject' ? 'กำลังบันทึก...' : 'ต้องส่งเพิ่ม'}
        </button>
      </div>
    </PageStack>
  )
}

function SellPage({ data }: { data: AppData }) {
  const navigate = useNavigate()
  const availableTokens = data.tokens.filter((token) => token.status === 'available')
  return (
    <PageStack title="ขายผลผลิต" action={<Pill>{data.summary.marketplaceStatus}</Pill>}>
      <section className="sell-hero">
        <img src={mascotSell} alt="" />
        <div>
          <Pill>ตลาด</Pill>
          <h2>ขายพร้อมแต้ม Zero-Burn</h2>
          <p>เลือก lot เก็บเกี่ยว แล้วแนบแต้มที่ผ่านการประเมิน</p>
          <button className="inverse-button" onClick={() => navigate('/sell/new')}>ขาย + แนบแต้ม</button>
        </div>
      </section>
      <div className="balance-card">
        <span>ยอดแต้ม</span>
        <strong>{data.summary.tokenBalance}</strong>
        <p>ใช้ได้ {availableTokens.reduce((sum, token) => sum + token.tokenAmount, 0)} · ขายแล้ว {data.tokens.filter((token) => token.status === 'sold').length}</p>
      </div>
      <Card title="Harvest lots">
        <div className="list-stack compact">
          {data.harvestRecords.map((record) => <HarvestLotRow key={record.id} data={data} record={record} />)}
        </div>
      </Card>
      <Card title="Product listings">
        <div className="list-stack compact">
          {data.marketplaceListings.map((listing) => <ListingRow key={listing.id} listing={listing} />)}
        </div>
      </Card>
    </PageStack>
  )
}

function SellFormPage({ data, actions }: { data: AppData; actions: AppActions }) {
  const navigate = useNavigate()
  const harvest = data.harvestRecords[0]
  const token = data.tokens.find((item) => item.status === 'available') ?? data.tokens[0]

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await actions.createListing({
      plotId: getFormString(form, 'plotId') || (harvest?.plotId ?? data.plots[0]?.id ?? 'plot-a'),
      harvestRecordId: getFormString(form, 'harvestRecordId') || (harvest?.id ?? 'HAR-001'),
      tokenLotId: getFormString(form, 'tokenLotId') || token?.id,
      productName: getFormString(form, 'productName') || 'อ้อยสดคุณภาพ',
      quantity: Number(form.get('quantity') || harvest?.quantity || 0),
      unit: 'ton',
      price: Number(form.get('price') || 2400),
      buyerVisibility: 'public',
    })
    if (saved) navigate('/sell/status')
  }

  return (
    <FormScreen title="แนบแต้มก่อนลงขาย" stepIndex={6} data={data}>
      <GuideMedia image={harvestImage} mascot="sell" text="ตรวจ lot ผลผลิตและแต้ม Zero-Burn ก่อนส่งประกาศขาย" />
      <form className="form-grid" onSubmit={onSubmit}>
        <label className="form-field">
          <span>lot ผลผลิต</span>
          <select name="harvestRecordId" defaultValue={harvest?.id}>
            {data.harvestRecords.map((record) => <option key={record.id} value={record.id}>{record.traceabilityId} · {record.quantity} {record.unit}</option>)}
          </select>
        </label>
        <input type="hidden" name="plotId" value={harvest?.plotId ?? data.plots[0]?.id} />
        <label className="form-field">
          <span>แต้ม Zero-Burn ที่แนบ</span>
          <select name="tokenLotId" defaultValue={token?.id}>
            {data.tokens.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.tokenAmount} แต้ม</option>)}
          </select>
        </label>
        <FormField label="ชื่อสินค้า" name="productName" defaultValue="อ้อยสดคุณภาพ" required />
        <FormField label="ปริมาณ (ตัน)" name="quantity" type="number" defaultValue={harvest?.quantity ?? 35} required />
        <FormField label="ราคาขาย / ตัน" name="price" type="number" defaultValue={2400} required />
        <div className="auto-note"><ShieldCheck size={16} /> ผู้ซื้อเห็น Traceability ID และแต้มที่แนบ</div>
        <SubmitButton actions={actions} action="listing" label="ยืนยันลงขาย" />
      </form>
    </FormScreen>
  )
}

function SellStatusPage({ data, actions }: { data: AppData; actions: AppActions }) {
  const navigate = useNavigate()
  const listing = data.marketplaceListings[0]
  const isSubmitting = actions.submittingAction !== null
  return (
    <PageStack title="สถานะประกาศขาย">
      <SuccessCard pose={data.workflow.status === 'sold' ? 'approved' : 'sell'} title={sellStateTitle(data.workflow.status)} text={sellStateText(data.workflow.status)} />
      {listing && <ListingRow listing={listing} />}
      <div className="button-grid">
        <button className="primary-button" disabled={isSubmitting} onClick={() => void actions.markListed()}>
          {actions.submittingAction === 'listed' ? 'กำลังบันทึก...' : 'จำลองอนุมัติขาย'}
        </button>
        <button className="ghost-button" disabled={isSubmitting} onClick={() => void actions.markSold()}>
          {actions.submittingAction === 'sold' ? 'กำลังบันทึก...' : 'จำลองขายได้แล้ว'}
        </button>
      </div>
      <button className="link-button centered" onClick={() => navigate('/')}>กลับหน้าแรก</button>
    </PageStack>
  )
}

function ProfilePage({ data }: { data: AppData }) {
  const navigate = useNavigate()
  return (
    <PageStack title="โปรไฟล์" action={<ProfileDot initials="SF" />}>
      <GuideCard pose="welcome" label="เริ่มใช้งาน" title="ยืนยันข้อมูลไร่" text={data.profile.consent ? 'ข้อมูลพร้อมใช้งานแล้ว' : 'เพิ่มข้อมูลเจ้าของไร่ก่อนเริ่ม workflow'} cta="อัปเดตโปรไฟล์" onClick={() => navigate('/profile/edit')} />
      <ImageCard src={farmerMobileImage} title={data.profile.farmName} caption={`${data.profile.district} · ${data.profile.province}`} />
      <Card title="ข้อมูลไร่">
        <InfoRows rows={[
          ['เจ้าของไร่', data.profile.ownerName],
          ['เบอร์โทร', data.profile.phone],
          ['ที่ตั้งไร่', `${data.profile.district} ${data.profile.province}`],
          ['เอกสารพื้นที่', 'โฉนดตัวอย่าง · ไม่มีข้อมูลจริง'],
        ]} />
      </Card>
    </PageStack>
  )
}

function ProfileEditPage({ data, actions }: { data: AppData; actions: AppActions }) {
  const navigate = useNavigate()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const saved = await actions.updateProfile({
      ownerName: getFormString(form, 'ownerName'),
      phone: getFormString(form, 'phone'),
      farmName: getFormString(form, 'farmName'),
      province: getFormString(form, 'province'),
      district: getFormString(form, 'district'),
      address: getFormString(form, 'address'),
      consent: true,
    })
    if (saved) navigate('/plots/new')
  }

  return (
    <FormScreen title="อัปเดตโปรไฟล์ / ลงทะเบียน" stepIndex={1} data={data}>
      <GuideMedia image={farmerMobileImage} mascot="welcome" text="กรอกข้อมูลไร่แบบสั้น ๆ แล้วไปถ่ายเอกสารพื้นที่ต่อ" />
      <form className="form-grid" onSubmit={onSubmit}>
        <FormField label="ชื่อเจ้าของไร่" name="ownerName" defaultValue={data.profile.ownerName} required />
        <FormField label="เบอร์โทร" name="phone" defaultValue={data.profile.phone} required />
        <FormField label="ชื่อไร่" name="farmName" defaultValue={data.profile.farmName} required />
        <FormField label="จังหวัด" name="province" defaultValue={data.profile.province} required />
        <FormField label="อำเภอ" name="district" defaultValue={data.profile.district} required />
        <FormField label="ที่ตั้งไร่" name="address" defaultValue={data.profile.address} />
        <UploadBox title="เอกสารพื้นที่" helper="ใช้รูปโฉนดตัวอย่างใน prototype" image={titleDeedImage} />
        <label className="consent-row"><input type="checkbox" defaultChecked /> ยินยอมให้ใช้ข้อมูลเพื่อประเมิน Zero-Burn</label>
        <SubmitButton actions={actions} action="profile" label="บันทึกโปรไฟล์" />
      </form>
    </FormScreen>
  )
}

function PageStack({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="page-stack">
      <div className="page-head">
        <h1>{title}</h1>
        {action}
      </div>
      {children}
    </div>
  )
}

function FormScreen({ title, stepIndex, data, children }: { title: string; stepIndex: number; data: AppData; children: ReactNode }) {
  return (
    <PageStack title={title} action={<Pill tone="neutral">ฤดู 2025/26</Pill>}>
      <WorkflowStepper steps={data.workflow.steps} compact currentIndex={stepIndex} />
      {children}
    </PageStack>
  )
}

function SubmitButton({ actions, action, label }: { actions: AppActions; action: AppActionName; label: string }) {
  return (
    <button className="primary-button form-submit" type="submit" disabled={actions.submittingAction !== null}>
      {actions.submittingAction === action ? 'กำลังบันทึก...' : label}
    </button>
  )
}

function GuideCard({ pose, label, title, text, cta, onClick }: { pose: MascotPose; label: string; title: string; text: string; cta: string; onClick: () => void }) {
  return (
    <section className="guide-card">
      <div className="mascot-frame small">
        <img src={mascotByPose[pose]} alt="" />
      </div>
      <div>
        <Pill>{label}</Pill>
        <h2>{title}</h2>
        <p>{text}</p>
        <button className="primary-button" onClick={onClick}>{cta}</button>
      </div>
    </section>
  )
}

function GuideMedia({ image, mascot, text }: { image: string; mascot: MascotPose; text: string }) {
  return (
    <section className="guide-media">
      <img className="guide-photo" src={image} alt="" />
      <div className="guide-bubble">
        <img src={mascotByPose[mascot]} alt="" />
        <p>{text}</p>
      </div>
    </section>
  )
}

function ImageCard({ src, title, caption }: { src: string; title: string; caption: string }) {
  return (
    <div className="image-card">
      <img src={src} alt="" />
      <div>
        <strong>{title}</strong>
        <span>{caption}</span>
      </div>
    </div>
  )
}

function UploadBox({ title, helper, image }: { title: string; helper: string; image: string }) {
  return (
    <div className="upload-box">
      <img src={image} alt="" />
      <div>
        <Upload size={18} />
        <strong>{title}</strong>
        <span>{helper}</span>
      </div>
      <input type="file" aria-label={title} />
    </div>
  )
}

function FarmMap({ plots }: { plots: Plot[] }) {
  return (
    <section className="farm-map">
      <div className="map-bg">
        <div className="plot-shape plot-a">แปลง A</div>
        <div className="plot-shape plot-b">แปลง B</div>
        <div className="plot-shape plot-c">C</div>
      </div>
      <div className="map-legend">
        {plots.slice(0, 3).map((plot) => <span key={plot.id}><i className={`legend-dot ${plot.status}`} />{plot.name}</span>)}
      </div>
    </section>
  )
}

function MiniBoundary({ warning = false }: { warning?: boolean }) {
  return (
    <div className={`mini-boundary ${warning ? 'warning' : ''}`}>
      <span>แปลง A</span>
      <span>แปลง B</span>
      <span>C</span>
    </div>
  )
}

function PlotRow({ plot }: { plot: Plot }) {
  return (
    <div className="item-row">
      <img src={sugarcaneImage} alt="" />
      <div>
        <strong>{plot.name}</strong>
        <span>{plot.cropType} · {plot.areaRai} ไร่</span>
      </div>
      <StatusPill status={plot.status} />
    </div>
  )
}

function RecordRow({ title, meta, status }: { title: string; meta: string; status: string }) {
  return (
    <div className="item-row">
      <div className="row-icon"><ClipboardList size={18} /></div>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <StatusPill status={status} />
    </div>
  )
}

function StatusRow({ plot, verification }: { plot: Plot; verification?: Verification }) {
  return (
    <div className="status-row">
      <div>
        <strong>{plot.name}</strong>
        <span>{verification?.issueSummary ?? plot.documentStatus}</span>
      </div>
      <StatusPill status={verification?.status ?? plot.status} />
    </div>
  )
}

function HarvestLotRow({ data, record }: { data: AppData; record: HarvestRecord }) {
  return (
    <div className="item-row">
      <img src={harvestImage} alt="" />
      <div>
        <strong>{record.traceabilityId}</strong>
        <span>{record.quantity} {record.unit} · {plotName(data, record.plotId)}</span>
      </div>
      <Pill tone="green">พร้อม</Pill>
    </div>
  )
}

function ListingRow({ listing }: { listing: MarketplaceListing }) {
  return (
    <div className="item-row">
      <div className="row-icon"><PackageCheck size={18} /></div>
      <div>
        <strong>{listing.productName}</strong>
        <span>{listing.quantity} {listing.unit} · {listing.price.toLocaleString()} บาท/ตัน</span>
      </div>
      <StatusPill status={listing.status} />
    </div>
  )
}

function Timeline({ items }: { items: string[] }) {
  return (
    <div className="timeline">
      {items.map((item, index) => (
        <div key={item} className="timeline-item">
          <span>{index + 1}</span>
          <p>{item}</p>
        </div>
      ))}
    </div>
  )
}

function WorkflowStepper({ steps, compact = false, currentIndex }: { steps: AppData['workflow']['steps']; compact?: boolean; currentIndex?: number }) {
  const visible = steps.filter((step) => ['boundary_confirmed', 'planting_recorded', 'harvest_recorded', 'checking_burn', 'token_available', 'listed'].includes(step.key))
  return (
    <div className={`workflow-stepper ${compact ? 'compact' : ''}`}>
      {visible.map((step, index) => {
        const active = currentIndex ? index + 2 === currentIndex : step.current
        return (
          <div key={step.key} className={`workflow-step ${step.done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <i />
            <span>{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function SuccessCard({ pose, title, text }: { pose: MascotPose; title: string; text: string }) {
  return (
    <section className="success-card">
      <img src={mascotByPose[pose]} alt="" />
      <div>
        <BadgeCheck size={22} />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </section>
  )
}

function InfoRows({ rows }: { rows: Array<[string, string | number | undefined]> }) {
  return (
    <div className="info-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value ?? '--'}</strong>
        </div>
      ))}
    </div>
  )
}

function SelectPlot({ data, preferredId }: { data: AppData; preferredId?: string }) {
  return (
    <label className="form-field">
      <span>แปลง</span>
      <select name="plotId" defaultValue={preferredId ?? data.plots[0]?.id}>
        {data.plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name} · {plot.areaRai} ไร่</option>)}
      </select>
    </label>
  )
}

function ProfileDot({ initials }: { initials: string }) {
  return <div className="profile-dot">{initials}</div>
}

function StatusPill({ status }: { status: PlotStatus | VerificationStatus | string }) {
  const tone = statusTone(status)
  return <Pill tone={tone}>{statusLabel(status)}</Pill>
}

function statusTone(status: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' {
  if (['verified', 'approved', 'available', 'listed', 'sold', 'complete', 'linked'].includes(status)) return 'green'
  if (['pending', 'pending_approval', 'submitted', 'checking_burn', 'draft'].includes(status)) return 'amber'
  if (['flagged', 'rejected', 'needs_more_evidence'].includes(status)) return 'red'
  return 'neutral'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    verified: 'ผ่าน',
    approved: 'ผ่าน',
    available: 'พร้อม',
    listed: 'เปิดขาย',
    sold: 'ขายแล้ว',
    pending: 'รอข้อมูล',
    pending_approval: 'รออนุมัติ',
    submitted: 'ส่งแล้ว',
    checking_burn: 'กำลังตรวจ',
    draft: 'ร่าง',
    flagged: 'ต้องตรวจ',
    rejected: 'ไม่ผ่าน',
    needs_more_evidence: 'ส่งเพิ่ม',
    complete: 'ครบ',
    linked: 'แนบแล้ว',
  }
  return labels[status] ?? status
}

function sellStateTitle(status: WorkflowStatus) {
  if (status === 'sold') return 'ขายได้แล้ว'
  if (status === 'listed') return 'ลงขายสำเร็จ'
  return 'รออนุมัติขาย'
}

function sellStateText(status: WorkflowStatus) {
  if (status === 'sold') return 'มีผู้ซื้อแล้ว ระบบบันทึกประวัติไว้ในโปรไฟล์ไร่'
  if (status === 'listed') return 'ผู้ซื้อเห็นประกาศพร้อมข้อมูล Zero-Burn แล้ว'
  return 'ส่งประกาศแล้ว ระบบกำลังตรวจข้อมูลก่อนเปิดขาย'
}

function plotName(data: AppData, plotId: string) {
  return data.plots.find((plot) => plot.id === plotId)?.name ?? 'แปลง'
}

function getFormString(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

export default App
