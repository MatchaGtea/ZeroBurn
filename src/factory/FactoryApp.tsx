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
import type { BurnRisk, FactoryLot, FactoryLotStatus, FactoryWalletToken } from './types'

type FactoryNotice = { tone: 'success' | 'error'; message: string } | null
type FactoryActionStatus = FactoryLotStatus

const FACTORY_LOTS_KEY = 'zeroburn_factory_lots'
const FACTORY_WALLET_KEY = 'zeroburn_factory_wallet'
const factoryStatuses: FactoryLotStatus[] = [
  'available',
  'pending_review',
  'verified',
  'needs_info',
  'purchase_requested',
  'delivering',
  'goods_received',
  'payment_confirmed',
  'completed',
  'rejected',
]

const asset = (name: string) => `${import.meta.env.BASE_URL}zeroburn-assets/${name}`

const factoryNav = [
  { to: '/factory', label: 'ภาพรวม', icon: Home, end: true },
  { to: '/factory/market', label: 'ตลาด', icon: Truck },
  { to: '/factory/review', label: 'ตรวจล็อต', icon: ClipboardCheck },
  { to: '/factory/scan', label: 'สแกน', icon: QrCode },
  { to: '/factory/orders', label: 'รับสินค้า', icon: PackageCheck },
  { to: '/factory/wallet', label: 'กระเป๋า', icon: BarChart3 },
]

function loadFactoryLots() {
  if (typeof window === 'undefined') return factoryLots
  const stored = localStorage.getItem(FACTORY_LOTS_KEY)
  if (!stored) return factoryLots
  try {
    const parsed = JSON.parse(stored) as Array<FactoryLot & { status: string; tokenAmount?: number }>
    return parsed.map((lot) => ({
      ...lot,
      status: factoryStatuses.includes(lot.status as FactoryLotStatus)
        ? (lot.status as FactoryLotStatus)
        : 'available',
      tokenAmount: lot.tokenAmount ?? Math.round(lot.carbonSavedKg * 0.15),
    }))
  } catch {
    return factoryLots
  }
}

function loadFactoryWallet() {
  if (typeof window === 'undefined') return [] as FactoryWalletToken[]
  const stored = localStorage.getItem(FACTORY_WALLET_KEY)
  if (!stored) return [] as FactoryWalletToken[]
  try {
    return JSON.parse(stored) as FactoryWalletToken[]
  } catch {
    return [] as FactoryWalletToken[]
  }
}

function saveFactoryLots(lots: FactoryLot[]) {
  localStorage.setItem(FACTORY_LOTS_KEY, JSON.stringify(lots))
}

function saveFactoryWallet(wallet: FactoryWalletToken[]) {
  localStorage.setItem(FACTORY_WALLET_KEY, JSON.stringify(wallet))
}

function isMarketVisible(status: FactoryLotStatus) {
  return ['available', 'pending_review', 'verified', 'needs_info'].includes(status)
}

function walletTokenFromLot(lot: FactoryLot): FactoryWalletToken | null {
  if (!lot.tokenId || lot.tokenAmount <= 0) return null
  return {
    id: lot.tokenId,
    traceabilityId: lot.traceabilityId,
    farmName: lot.farmName,
    farmerName: lot.farmerName,
    tokenAmount: lot.tokenAmount,
    carbonSavedKg: lot.carbonSavedKg,
  }
}

export function FactoryApp({ onLogout }: { onLogout?: () => void }) {
  const [lots, setLots] = useState(loadFactoryLots)
  const [wallet, setWallet] = useState(loadFactoryWallet)
  const [selectedId, setSelectedId] = useState(() => loadFactoryLots().find((lot) => isMarketVisible(lot.status))?.id ?? factoryLots[0]?.id ?? '')
  const [notice, setNotice] = useState<FactoryNotice>(null)
  const selectedLot = lots.find((lot) => lot.id === selectedId) ?? lots.find((lot) => isMarketVisible(lot.status)) ?? lots[0]

  const updateLotStatus = (lotId: string, status: FactoryActionStatus) => {
    setLots((currentLots) => {
      const targetLot = currentLots.find((lot) => lot.id === lotId)
      const nextLots = currentLots.map((lot) => lot.id === lotId ? { ...lot, status } : lot)
      saveFactoryLots(nextLots)

      if (status === 'completed' && targetLot) {
        const token = walletTokenFromLot(targetLot)
        if (token) {
          setWallet((currentWallet) => {
            if (currentWallet.some((item) => item.id === token.id)) return currentWallet
            const nextWallet = [token, ...currentWallet]
            saveFactoryWallet(nextWallet)
            return nextWallet
          })
        }
      }

      if (status === 'purchase_requested' || status === 'needs_info' || status === 'rejected') {
        const currentIndex = currentLots.findIndex((lot) => lot.id === lotId)
        const nextLot = [...currentLots.slice(currentIndex + 1), ...currentLots.slice(0, currentIndex)]
          .find((lot) => lot.id !== lotId && isMarketVisible(lot.status))
        if (nextLot) setSelectedId(nextLot.id)
      }

      return nextLots
    })
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
            <Route path="/factory" element={<FactoryDashboard lots={lots} selectedLot={selectedLot} wallet={wallet} onSelect={setSelectedId} />} />
            <Route path="/factory/market" element={<FactoryMarket lots={lots} selectedId={selectedId} onSelect={setSelectedId} />} />
            <Route path="/factory/queue" element={<Navigate to="/factory/market" replace />} />
            <Route path="/factory/review" element={<FactoryReview lot={selectedLot} onUpdateStatus={updateLotStatus} />} />
            <Route path="/factory/scan" element={<FactoryScan lots={lots} onSelect={setSelectedId} />} />
            <Route path="/factory/orders" element={<FactoryOrders lots={lots} onUpdateStatus={updateLotStatus} />} />
            <Route path="/factory/wallet" element={<FactoryWallet wallet={wallet} lots={lots} />} />
            <Route path="/factory/reports" element={<Navigate to="/factory/wallet" replace />} />
            <Route path="/factory/profile" element={<FactoryProfilePage lots={lots} wallet={wallet} onLogout={onLogout} />} />
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

function FactoryDashboard({ lots, selectedLot, wallet, onSelect }: { lots: FactoryLot[]; selectedLot: FactoryLot; wallet: FactoryWalletToken[]; onSelect: (id: string) => void }) {
  const metrics = useFactoryMetrics(lots)
  const navigate = useNavigate()

  return (
    <Page title="โรงงาน">
      <section className="factory-hero-card">
        <img src={asset('harvest-evidence.png')} alt="" />
        <div>
          <Pill tone="green">รายการในตลาด</Pill>
          <h2>{selectedLot.traceabilityId}</h2>
          <p>{selectedLot.farmName} · {selectedLot.quantityTon} ตัน · CCS {selectedLot.ccs}</p>
          <div className="button-row">
            <button className="primary-button" onClick={() => navigate('/factory/review')}>ตรวจและขอซื้อ</button>
            <button className="ghost-button" onClick={() => navigate('/factory/market')}>เปิดตลาด</button>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <StatTile icon={<Truck size={19} />} label="ตันในตลาด" value={metrics.marketTon} helper="รอผู้ซื้อเลือก" />
        <StatTile icon={<CheckCircle2 size={19} />} label="กำลังซื้อ" value={metrics.activeOrderCount} helper="ล็อต" />
        <StatTile icon={<AlertTriangle size={19} />} label="เสี่ยงเผา" value={metrics.highRiskCount} helper="ต้องตรวจ" />
        <StatTile icon={<ShieldCheck size={19} />} label="Token wallet" value={wallet.reduce((sum, token) => sum + token.tokenAmount, 0)} helper="token" />
      </div>

      <Card title="รายการขายล่าสุด" action={<Pill tone="amber">Marketplace</Pill>}>
        <div className="list-stack compact">
          {lots.filter((lot) => isMarketVisible(lot.status)).slice(0, 3).map((lot) => (
            <FactoryLotRow key={lot.id} lot={lot} active={lot.id === selectedLot.id} onSelect={(id) => {
              onSelect(id)
              navigate('/factory/review')
            }} />
          ))}
        </div>
      </Card>
    </Page>
  )
}

function FactoryMarket({ lots, selectedId, onSelect }: { lots: FactoryLot[]; selectedId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | FactoryLotStatus | BurnRisk>('all')
  const navigate = useNavigate()
  const visibleLots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return lots.filter((lot) => isMarketVisible(lot.status)).filter((lot) => {
      const matchesQuery = !normalizedQuery || `${lot.traceabilityId} ${lot.farmName} ${lot.farmerName}`.toLowerCase().includes(normalizedQuery)
      const matchesFilter = filter === 'all' || lot.status === filter || lot.risk === filter
      return matchesQuery && matchesFilter
    })
  }, [filter, lots, query])

  return (
    <Page title="ตลาดรับซื้อ">
      <label className="factory-search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา trace ID หรือชื่อไร่" />
      </label>
      <div className="factory-filter-row">
        {[
          ['all', 'ทั้งหมด'],
          ['available', 'พร้อมขาย'],
          ['pending_review', 'รอตรวจ'],
          ['needs_info', 'ขอข้อมูล'],
          ['high', 'เสี่ยงสูง'],
        ].map(([value, label]) => (
          <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value as typeof filter)}>
            {label}
          </button>
        ))}
      </div>
      <Card>
        {visibleLots.length > 0 ? (
          <div className="list-stack compact">
            {visibleLots.map((lot) => (
              <FactoryLotRow key={lot.id} lot={lot} active={lot.id === selectedId} onSelect={(id) => {
                onSelect(id)
                navigate('/factory/review')
              }} />
            ))}
          </div>
        ) : (
          <FactoryEmptyState title="ไม่พบรายการขาย" message="ลองตรวจ Trace ID ชื่อไร่ หรือเปลี่ยนตัวกรองอีกครั้ง" />
        )}
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
          <div><span>Token ที่แปลงได้</span><strong>{lot.tokenAmount.toLocaleString()} token</strong></div>
          <div><span>Carbon saved</span><strong>{lot.carbonSavedKg.toLocaleString()} kg CO2e</strong></div>
          <div><span>ช่วงส่งมอบ</span><strong>{lot.deliveryWindow}</strong></div>
          <div><span>สถานะ</span><StatusPill status={lot.status} /></div>
        </div>
      </Card>

      <div className="factory-action-grid">
        <button className="primary-button" onClick={() => onUpdateStatus(lot.id, 'purchase_requested')}><CheckCircle2 size={18} /> ขอซื้อรายการนี้</button>
        <button className="ghost-button" onClick={() => onUpdateStatus(lot.id, 'needs_info')}><AlertTriangle size={18} /> ขอข้อมูลเพิ่ม</button>
        <button className="ghost-button danger" onClick={() => onUpdateStatus(lot.id, 'rejected')}><XCircle size={18} /> ปฏิเสธ</button>
        <button className="ghost-button" onClick={() => onUpdateStatus(lot.id, 'delivering')}><Truck size={18} /> แจ้งเริ่มจัดส่ง</button>
      </div>
    </Page>
  )
}

function FactoryScan({ lots, onSelect }: { lots: FactoryLot[]; onSelect: (id: string) => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [scanMessage, setScanMessage] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const matchingLots = normalizedQuery
    ? lots.filter((lot) => `${lot.traceabilityId} ${lot.farmName} ${lot.farmerName}`.toLowerCase().includes(normalizedQuery))
    : lots

  const openLot = (lot: FactoryLot) => {
    onSelect(lot.id)
    navigate('/factory/review')
  }

  const handleLookup = () => {
    if (!normalizedQuery) {
      setScanMessage('กรอก Trace ID หรือชื่อไร่ก่อนค้นหา')
      return
    }

    const exactLot = lots.find((lot) => lot.traceabilityId.toLowerCase() === normalizedQuery)
    if (exactLot) {
      openLot(exactLot)
      return
    }

    setScanMessage(matchingLots.length > 0 ? `พบ ${matchingLots.length} ล็อตที่ใกล้เคียง` : 'ไม่พบล็อตนี้ในตลาดรับซื้อ')
  }

  return (
    <Page title="สแกนล็อต">
      <section className="factory-scan-panel">
        <QrCode size={82} />
        <h2>สแกน QR หรือ Trace ID</h2>
        <p>สำหรับจุดชั่งน้ำหนักและจุดรับอ้อย กรอก Trace ID เพื่อเปิดรายการที่เกี่ยวข้องทันที</p>
        <div className="factory-scan-lookup">
          <label className="factory-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setScanMessage('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleLookup()
              }}
              placeholder="เช่น ZB-2026-001"
              aria-label="Trace ID หรือชื่อไร่"
            />
          </label>
          <button type="button" className="primary-button" onClick={handleLookup}>ค้นหาล็อต</button>
        </div>
        {scanMessage ? <p className="factory-lookup-message" aria-live="polite">{scanMessage}</p> : null}
      </section>
      {matchingLots.length > 0 ? (
        <div className="list-stack">
          {matchingLots.map((lot) => (
            <button key={lot.id} className="factory-scan-result" onClick={() => openLot(lot)}>
              <PackageCheck size={19} />
              <span>{lot.traceabilityId}</span>
              <strong>{lot.quantityTon} ตัน</strong>
            </button>
          ))}
        </div>
      ) : (
        <FactoryEmptyState title="ยังไม่พบล็อต" message="ตรวจ Trace ID แล้วลองค้นหาใหม่อีกครั้ง" />
      )}
    </Page>
  )
}

function FactoryOrders({ lots, onUpdateStatus }: { lots: FactoryLot[]; onUpdateStatus: (lotId: string, status: FactoryLotStatus) => void }) {
  const orders = lots.filter((lot) => ['purchase_requested', 'delivering', 'goods_received', 'payment_confirmed'].includes(lot.status))

  return (
    <Page title="รับสินค้า">
      <Card title="คำสั่งซื้อที่ต้องติดตาม" action={<Pill tone="amber">{orders.length} รายการ</Pill>}>
        {orders.length > 0 ? (
          <div className="list-stack compact">
            {orders.map((lot) => (
              <div key={lot.id} className="factory-order-card">
                <div>
                  <strong>{lot.traceabilityId}</strong>
                  <span>{lot.farmName} · {lot.quantityTon} ตัน · {lot.tokenAmount} token</span>
                </div>
                <StatusPill status={lot.status} />
                {lot.status === 'purchase_requested' && (
                  <button className="primary-button full" onClick={() => onUpdateStatus(lot.id, 'delivering')}>ยืนยันเริ่มจัดส่ง</button>
                )}
                {lot.status === 'delivering' && (
                  <button className="primary-button full" onClick={() => onUpdateStatus(lot.id, 'goods_received')}>ยืนยันได้รับสินค้า</button>
                )}
                {lot.status === 'goods_received' && (
                  <button className="primary-button full" onClick={() => onUpdateStatus(lot.id, 'payment_confirmed')}>จำลองเกษตรกรยืนยันรับเงิน</button>
                )}
                {lot.status === 'payment_confirmed' && (
                  <button className="primary-button full" onClick={() => onUpdateStatus(lot.id, 'completed')}>ปิดคำสั่งซื้อและรับ token</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <FactoryEmptyState title="ยังไม่มีคำสั่งซื้อค้าง" message="เมื่อกดขอซื้อในตลาด รายการจะมาแสดงที่นี่" />
        )}
      </Card>
    </Page>
  )
}

function FactoryWallet({ wallet, lots }: { wallet: FactoryWalletToken[]; lots: FactoryLot[] }) {
  const tokenBalance = wallet.reduce((sum, token) => sum + token.tokenAmount, 0)
  const pendingTokens = lots
    .filter((lot) => ['purchase_requested', 'delivering', 'goods_received', 'payment_confirmed'].includes(lot.status))
    .reduce((sum, lot) => sum + lot.tokenAmount, 0)

  return (
    <Page title="กระเป๋า token">
      <div className="stat-grid">
        <StatTile icon={<ShieldCheck size={19} />} label="Token balance" value={tokenBalance} helper="ได้รับแล้ว" />
        <StatTile icon={<PackageCheck size={19} />} label="Pending" value={pendingTokens} helper="รอปิดคำสั่งซื้อ" />
      </div>
      <Card title="Token ที่ได้รับ">
        {wallet.length > 0 ? (
          <div className="list-stack compact">
            {wallet.map((token) => (
              <div key={token.id} className="factory-wallet-row">
                <div>
                  <strong>{token.id}</strong>
                  <span>{token.traceabilityId} · {token.farmName} · {token.farmerName}</span>
                </div>
                <Pill tone="green">{token.tokenAmount} token</Pill>
              </div>
            ))}
          </div>
        ) : (
          <FactoryEmptyState title="ยังไม่มี token ในกระเป๋า" message="token จะถูกโอนเมื่อโรงงานรับสินค้าและเกษตรกรยืนยันรับเงินแล้ว" />
        )}
      </Card>
    </Page>
  )
}

function FactoryProfilePage({ lots, wallet, onLogout }: { lots: FactoryLot[]; wallet: FactoryWalletToken[]; onLogout?: () => void }) {
  const metrics = useFactoryMetrics(lots)
  const tokenBalance = wallet.reduce((sum, token) => sum + token.tokenAmount, 0)

  return (
    <Page title="โปรไฟล์โรงงาน">
      <Card title={factoryProfile.factoryName} action={<Pill tone="blue">{factoryProfile.buyingSeason}</Pill>}>
        <div className="info-rows">
          <div><span>เจ้าหน้าที่</span><strong>{factoryProfile.officerName}</strong></div>
          <div><span>จังหวัด</span><strong>{factoryProfile.province}</strong></div>
          <div><span>กำลังรับซื้อ</span><strong>{factoryProfile.dailyCapacityTon.toLocaleString()} ตัน/วัน</strong></div>
          <div><span>ล็อตในระบบ</span><strong>{lots.length} ล็อต</strong></div>
          <div><span>รอพิจารณา</span><strong>{metrics.pendingCount} ล็อต</strong></div>
          <div><span>Token wallet</span><strong>{tokenBalance.toLocaleString()} token</strong></div>
        </div>
      </Card>
      <button type="button" className="ghost-button full factory-farmer-link" onClick={onLogout}>ออกจากระบบ</button>
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

function FactoryEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="factory-empty-state">
      <Search size={24} />
      <strong>{title}</strong>
      <span>{message}</span>
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
    const marketTon = lots.filter((lot) => isMarketVisible(lot.status)).reduce((sum, lot) => sum + lot.quantityTon, 0)
    const approvedCount = lots.filter((lot) => ['purchase_requested', 'delivering', 'goods_received', 'payment_confirmed', 'completed'].includes(lot.status)).length
    const activeOrderCount = lots.filter((lot) => ['purchase_requested', 'delivering', 'goods_received', 'payment_confirmed'].includes(lot.status)).length
    const pendingCount = lots.filter((lot) => lot.status === 'pending_review' || lot.status === 'verified').length
    const highRiskCount = lots.filter((lot) => lot.risk === 'high').length
    const carbonTon = Math.round(lots.reduce((sum, lot) => sum + lot.carbonSavedKg, 0) / 100) / 10
    const avgCcs = lots.length === 0 ? '0.0' : (lots.reduce((sum, lot) => sum + lot.ccs, 0) / lots.length).toFixed(1)
    return { totalTon, marketTon, approvedCount, activeOrderCount, pendingCount, highRiskCount, carbonTon, avgCcs }
  }, [lots])
}

function statusTone(status: FactoryLotStatus): 'green' | 'amber' | 'red' | 'blue' | 'neutral' {
  if (['available', 'completed'].includes(status)) return 'green'
  if (['pending_review', 'verified', 'purchase_requested', 'delivering'].includes(status)) return 'amber'
  if (status === 'needs_info') return 'blue'
  if (status === 'rejected') return 'red'
  return 'neutral'
}

function statusLabel(status: FactoryLotStatus) {
  const labels: Record<FactoryLotStatus, string> = {
    available: 'พร้อมขาย',
    pending_review: 'รอตรวจ',
    verified: 'ผ่านระบบ',
    needs_info: 'ขอข้อมูล',
    purchase_requested: 'ขอซื้อแล้ว',
    delivering: 'กำลังจัดส่ง',
    goods_received: 'ได้รับสินค้า',
    payment_confirmed: 'ยืนยันเงินแล้ว',
    completed: 'สำเร็จ',
    rejected: 'ปฏิเสธ',
  }
  return labels[status]
}

function statusMessage(status: FactoryLotStatus) {
  const messages: Record<FactoryLotStatus, string> = {
    available: 'เปิดรายการกลับสู่ตลาดแล้ว',
    pending_review: 'ย้ายล็อตกลับไปรอตรวจแล้ว',
    verified: 'บันทึกว่าผ่านระบบตรวจแล้ว',
    needs_info: 'ส่งคำขอข้อมูลเพิ่มให้เกษตรกรแล้ว',
    purchase_requested: 'ส่งคำขอซื้อแล้ว ระบบเลือกรายการถัดไปให้ตรวจต่อ',
    delivering: 'บันทึกว่ากำลังจัดส่งแล้ว',
    goods_received: 'โรงงานยืนยันได้รับสินค้าแล้ว',
    payment_confirmed: 'เกษตรกรยืนยันรับเงินแล้ว',
    completed: 'ปิดคำสั่งซื้อและโอน token เข้ากระเป๋าแล้ว',
    rejected: 'ปฏิเสธล็อตนี้แล้ว',
  }
  return messages[status]
}
