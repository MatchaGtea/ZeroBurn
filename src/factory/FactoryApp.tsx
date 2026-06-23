import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Home,
  PackageCheck,
  QrCode,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Card, Pill, StatTile } from '../components/ui'
import { factoryLots, factoryProfile } from './mockData'
import type { BurnRisk, FactoryLot, FactoryLotStatus } from './types'

type FactoryNotice = { tone: 'success' | 'error'; message: string } | null

const asset = (name: string) => `${import.meta.env.BASE_URL}zeroburn-assets/${name}`

const factoryNav = [
  { to: '/factory', label: 'ภาพรวม', icon: Home, end: true },
  { to: '/factory/queue', label: 'คิวรับซื้อ', icon: Truck },
  { to: '/factory/review', label: 'ตรวจล็อต', icon: ClipboardCheck },
  { to: '/factory/scan', label: 'สแกน', icon: QrCode },
  { to: '/factory/reports', label: 'รายงาน', icon: BarChart3 },
]

export function FactoryApp() {
  const [lots, setLots] = useState(factoryLots)
  const [selectedId, setSelectedId] = useState(factoryLots[0]?.id ?? '')
  const [notice, setNotice] = useState<FactoryNotice>(null)
  const selectedLot = lots.find((lot) => lot.id === selectedId) ?? lots[0]

  const updateLotStatus = (lotId: string, status: FactoryLotStatus) => {
    setLots((currentLots) => currentLots.map((lot) => lot.id === lotId ? { ...lot, status } : lot))
    setNotice({
      tone: status === 'rejected' ? 'error' : 'success',
      message: statusMessage(status),
    })
  }

  return (
    <div className="app-canvas factory-canvas">
      <div className="phone-shell factory-shell">
        <FactoryTopBar />
        <main className="screen-scroll factory-scroll">
          {notice && (
            <div className={`mutation-notice mutation-notice-${notice.tone}`}>
              {notice.message}
            </div>
          )}
          <Routes>
            <Route path="/factory" element={<FactoryDashboard lots={lots} selectedLot={selectedLot} onSelect={setSelectedId} />} />
            <Route path="/factory/queue" element={<FactoryQueue lots={lots} selectedId={selectedId} onSelect={setSelectedId} />} />
            <Route path="/factory/review" element={<FactoryReview lot={selectedLot} onUpdateStatus={updateLotStatus} />} />
            <Route path="/factory/scan" element={<FactoryScan lots={lots} onSelect={setSelectedId} />} />
            <Route path="/factory/reports" element={<FactoryReports lots={lots} />} />
            <Route path="/factory/profile" element={<FactoryProfilePage lots={lots} />} />
            <Route path="*" element={<Navigate to="/factory" replace />} />
          </Routes>
        </main>
        <FactoryBottomNav />
      </div>
    </div>
  )
}

function FactoryTopBar() {
  return (
    <header className="top-bar factory-top-bar">
      <div className="factory-brand">
        <span className="factory-mark"><Factory size={19} /></span>
        <div>
          <span className="top-label">ZeroBurn Factory</span>
          <strong>{factoryProfile.factoryName}</strong>
        </div>
      </div>
      <NavLink to="/factory/profile" className="profile-dot" aria-label="Factory profile">
        <UserRound size={18} />
      </NavLink>
    </header>
  )
}

function FactoryBottomNav() {
  return (
    <nav className="bottom-nav factory-bottom-nav" aria-label="Factory navigation">
      {factoryNav.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <item.icon size={19} strokeWidth={2.2} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function FactoryDashboard({ lots, selectedLot, onSelect }: { lots: FactoryLot[]; selectedLot: FactoryLot; onSelect: (id: string) => void }) {
  const metrics = useFactoryMetrics(lots)
  const navigate = useNavigate()

  return (
    <Page title="โรงงาน">
      <section className="factory-hero-card">
        <img src={asset('harvest-evidence.png')} alt="" />
        <div>
          <Pill tone="green">ล็อตพร้อมรับ</Pill>
          <h2>{selectedLot.traceabilityId}</h2>
          <p>{selectedLot.farmName} · {selectedLot.quantityTon} ตัน · CCS {selectedLot.ccs}</p>
          <div className="button-row">
            <button className="primary-button" onClick={() => navigate('/factory/review')}>ตรวจล็อต</button>
            <button className="ghost-button" onClick={() => navigate('/factory/queue')}>ดูคิว</button>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <StatTile icon={<Truck size={19} />} label="ตันวันนี้" value={metrics.totalTon} helper="รอรับเข้า" />
        <StatTile icon={<CheckCircle2 size={19} />} label="อนุมัติแล้ว" value={metrics.approvedCount} helper="ล็อต" />
        <StatTile icon={<AlertTriangle size={19} />} label="เสี่ยงเผา" value={metrics.highRiskCount} helper="ต้องตรวจ" />
        <StatTile icon={<ShieldCheck size={19} />} label="Carbon saved" value={`${metrics.carbonTon}t`} helper="CO2e" />
      </div>

      <Card title="คิวตรวจล่าสุด" action={<Pill tone="amber">คิวตรวจ</Pill>}>
        <div className="list-stack compact">
          {lots.slice(0, 3).map((lot) => (
            <FactoryLotRow key={lot.id} lot={lot} active={lot.id === selectedLot.id} onSelect={onSelect} />
          ))}
        </div>
      </Card>
    </Page>
  )
}

function FactoryQueue({ lots, selectedId, onSelect }: { lots: FactoryLot[]; selectedId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | FactoryLotStatus | BurnRisk>('all')
  const visibleLots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return lots.filter((lot) => {
      const matchesQuery = !normalizedQuery || `${lot.traceabilityId} ${lot.farmName} ${lot.farmerName}`.toLowerCase().includes(normalizedQuery)
      const matchesFilter = filter === 'all' || lot.status === filter || lot.risk === filter
      return matchesQuery && matchesFilter
    })
  }, [filter, lots, query])

  return (
    <Page title="คิวรับซื้อ">
      <label className="factory-search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา trace ID หรือชื่อไร่" />
      </label>
      <div className="factory-filter-row">
        {[
          ['all', 'ทั้งหมด'],
          ['pending_review', 'รอตรวจ'],
          ['approved', 'อนุมัติ'],
          ['needs_info', 'ขอข้อมูล'],
          ['high', 'เสี่ยงสูง'],
        ].map(([value, label]) => (
          <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value as typeof filter)}>
            {label}
          </button>
        ))}
      </div>
      <Card>
        <div className="list-stack compact">
          {visibleLots.map((lot) => (
            <FactoryLotRow key={lot.id} lot={lot} active={lot.id === selectedId} onSelect={onSelect} />
          ))}
        </div>
      </Card>
    </Page>
  )
}

function FactoryReview({ lot, onUpdateStatus }: { lot: FactoryLot; onUpdateStatus: (lotId: string, status: FactoryLotStatus) => void }) {
  return (
    <Page title="ตรวจล็อต">
      <Card title={lot.traceabilityId} action={<RiskPill risk={lot.risk} />}>
        <div className="factory-review-summary">
          <div>
            <span>เกษตรกร</span>
            <strong>{lot.farmerName}</strong>
          </div>
          <div>
            <span>ปริมาณ</span>
            <strong>{lot.quantityTon} ตัน</strong>
          </div>
          <div>
            <span>CCS</span>
            <strong>{lot.ccs}</strong>
          </div>
          <div>
            <span>ราคา</span>
            <strong>{lot.pricePerTon.toLocaleString()} บาท/ตัน</strong>
          </div>
        </div>
      </Card>

      <Card title="หลักฐาน Zero-Burn">
        <div className="factory-evidence-grid">
          {lot.evidence.map((image) => <img key={image} src={asset(image)} alt="" />)}
        </div>
        <p className="factory-note">{lot.notes}</p>
      </Card>

      <Card title="Token และการรับซื้อ">
        <div className="info-rows">
          <div><span>Token lot</span><strong>{lot.tokenId ?? 'รอออก token'}</strong></div>
          <div><span>Carbon saved</span><strong>{lot.carbonSavedKg.toLocaleString()} kg CO2e</strong></div>
          <div><span>ช่วงส่งมอบ</span><strong>{lot.deliveryWindow}</strong></div>
          <div><span>สถานะ</span><StatusPill status={lot.status} /></div>
        </div>
      </Card>

      <div className="factory-action-grid">
        <button className="primary-button" onClick={() => onUpdateStatus(lot.id, 'approved')}><CheckCircle2 size={18} /> อนุมัติรับซื้อ</button>
        <button className="ghost-button" onClick={() => onUpdateStatus(lot.id, 'needs_info')}><AlertTriangle size={18} /> ขอข้อมูลเพิ่ม</button>
        <button className="ghost-button danger" onClick={() => onUpdateStatus(lot.id, 'rejected')}><XCircle size={18} /> ปฏิเสธ</button>
        <button className="ghost-button" onClick={() => onUpdateStatus(lot.id, 'scheduled')}><Truck size={18} /> จัดคิวรถ</button>
      </div>
    </Page>
  )
}

function FactoryScan({ lots, onSelect }: { lots: FactoryLot[]; onSelect: (id: string) => void }) {
  const navigate = useNavigate()

  return (
    <Page title="สแกนล็อต">
      <section className="factory-scan-panel">
        <QrCode size={82} />
        <h2>สแกน QR หรือ Trace ID</h2>
        <p>สำหรับจุดชั่งน้ำหนักและจุดรับอ้อย ใช้ข้อมูลจำลองเพื่อเปิด lot ที่เกี่ยวข้องทันที</p>
      </section>
      <div className="list-stack">
        {lots.map((lot) => (
          <button key={lot.id} className="factory-scan-result" onClick={() => {
            onSelect(lot.id)
            navigate('/factory/review')
          }}>
            <PackageCheck size={19} />
            <span>{lot.traceabilityId}</span>
            <strong>{lot.quantityTon} ตัน</strong>
          </button>
        ))}
      </div>
    </Page>
  )
}

function FactoryReports({ lots }: { lots: FactoryLot[] }) {
  const metrics = useFactoryMetrics(lots)

  return (
    <Page title="รายงาน">
      <Card title="สรุปวันนี้">
        <div className="factory-report-bars">
          <ReportBar label="ผ่านตรวจ" value={metrics.approvedCount} max={lots.length} tone="green" />
          <ReportBar label="รอตรวจ" value={metrics.pendingCount} max={lots.length} tone="amber" />
          <ReportBar label="เสี่ยงสูง" value={metrics.highRiskCount} max={lots.length} tone="red" />
        </div>
      </Card>
      <Card title="กำลังรับซื้อ">
        <div className="info-rows">
          <div><span>ปริมาณรวม</span><strong>{metrics.totalTon} ตัน</strong></div>
          <div><span>ความจุรายวัน</span><strong>{factoryProfile.dailyCapacityTon.toLocaleString()} ตัน</strong></div>
          <div><span>ค่าเฉลี่ย CCS</span><strong>{metrics.avgCcs}</strong></div>
          <div><span>Carbon saved</span><strong>{metrics.carbonTon} tCO2e</strong></div>
        </div>
      </Card>
    </Page>
  )
}

function FactoryProfilePage({ lots }: { lots: FactoryLot[] }) {
  const metrics = useFactoryMetrics(lots)

  return (
    <Page title="โปรไฟล์โรงงาน">
      <Card title={factoryProfile.factoryName} action={<Pill tone="blue">{factoryProfile.buyingSeason}</Pill>}>
        <div className="info-rows">
          <div><span>เจ้าหน้าที่</span><strong>{factoryProfile.officerName}</strong></div>
          <div><span>จังหวัด</span><strong>{factoryProfile.province}</strong></div>
          <div><span>กำลังรับซื้อ</span><strong>{factoryProfile.dailyCapacityTon.toLocaleString()} ตัน/วัน</strong></div>
          <div><span>ล็อตในระบบ</span><strong>{lots.length} ล็อต</strong></div>
          <div><span>รอพิจารณา</span><strong>{metrics.pendingCount} ล็อต</strong></div>
        </div>
      </Card>
      <NavLink to="/" className="ghost-button full factory-farmer-link">กลับไปฝั่ง Farmer</NavLink>
    </Page>
  )
}

function FactoryLotRow({ lot, active, onSelect }: { lot: FactoryLot; active: boolean; onSelect: (id: string) => void }) {
  return (
    <button className={`factory-lot-row ${active ? 'active' : ''}`} onClick={() => onSelect(lot.id)}>
      <img src={asset('sugarcane-close-up.png')} alt="" />
      <div>
        <strong>{lot.traceabilityId}</strong>
        <span>{lot.farmName} · {lot.quantityTon} ตัน · {lot.deliveryWindow}</span>
      </div>
      <StatusPill status={lot.status} />
    </button>
  )
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-stack factory-page">
      <div className="page-head">
        <h1>{title}</h1>
        <Pill tone="green">Factory</Pill>
      </div>
      {children}
    </div>
  )
}

function ReportBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: 'green' | 'amber' | 'red' }) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="factory-report-bar">
      <div><span>{label}</span><strong>{value}</strong></div>
      <i className={`factory-bar-${tone}`} style={{ width: `${percent}%` }} />
    </div>
  )
}

function StatusPill({ status }: { status: FactoryLotStatus }) {
  return <Pill tone={statusTone(status)}>{statusLabel(status)}</Pill>
}

function RiskPill({ risk }: { risk: BurnRisk }) {
  const tone = risk === 'high' ? 'red' : risk === 'medium' ? 'amber' : 'green'
  const label = risk === 'high' ? 'เสี่ยงสูง' : risk === 'medium' ? 'เสี่ยงกลาง' : 'เสี่ยงต่ำ'
  return <Pill tone={tone}>{label}</Pill>
}

function useFactoryMetrics(lots: FactoryLot[]) {
  return useMemo(() => {
    const totalTon = lots.reduce((sum, lot) => sum + lot.quantityTon, 0)
    const approvedCount = lots.filter((lot) => ['approved', 'scheduled', 'completed'].includes(lot.status)).length
    const pendingCount = lots.filter((lot) => lot.status === 'pending_review' || lot.status === 'verified').length
    const highRiskCount = lots.filter((lot) => lot.risk === 'high').length
    const carbonTon = Math.round(lots.reduce((sum, lot) => sum + lot.carbonSavedKg, 0) / 100) / 10
    const avgCcs = lots.length === 0 ? '0.0' : (lots.reduce((sum, lot) => sum + lot.ccs, 0) / lots.length).toFixed(1)
    return { totalTon, approvedCount, pendingCount, highRiskCount, carbonTon, avgCcs }
  }, [lots])
}

function statusTone(status: FactoryLotStatus): 'green' | 'amber' | 'red' | 'blue' | 'neutral' {
  if (['approved', 'scheduled', 'completed'].includes(status)) return 'green'
  if (['pending_review', 'verified'].includes(status)) return 'amber'
  if (status === 'needs_info') return 'blue'
  if (status === 'rejected') return 'red'
  return 'neutral'
}

function statusLabel(status: FactoryLotStatus) {
  const labels: Record<FactoryLotStatus, string> = {
    pending_review: 'รอตรวจ',
    verified: 'ผ่านระบบ',
    needs_info: 'ขอข้อมูล',
    approved: 'อนุมัติ',
    scheduled: 'จัดคิว',
    completed: 'รับแล้ว',
    rejected: 'ปฏิเสธ',
  }
  return labels[status]
}

function statusMessage(status: FactoryLotStatus) {
  const messages: Record<FactoryLotStatus, string> = {
    pending_review: 'ย้ายล็อตกลับไปรอตรวจแล้ว',
    verified: 'บันทึกว่าผ่านระบบตรวจแล้ว',
    needs_info: 'ส่งคำขอข้อมูลเพิ่มให้เกษตรกรแล้ว',
    approved: 'อนุมัติรับซื้อล็อตนี้แล้ว',
    scheduled: 'จัดคิวรถรับเข้าโรงงานแล้ว',
    completed: 'บันทึกรับซื้อสำเร็จแล้ว',
    rejected: 'ปฏิเสธล็อตนี้แล้ว',
  }
  return messages[status]
}
