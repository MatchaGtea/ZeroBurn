import { useEffect, useState } from 'react'
import type React from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  Card,
  DataTable,
  FormModal,
  Header,
  MapPanel,
  MobileNav,
  PlotCard,
  Sidebar,
  StatusBadge,
  SummaryCard,
  Timeline,
  icons,
} from './components/ui'
import { allMockData } from './data/mockData'
import type { Plot } from './data/types'
import type { AppData } from './lib/api'
import { loadAppData } from './lib/api'

const { CheckCircle2, ClipboardCheck, Coins, Download, Map, Plus, ShieldCheck, ShoppingBag, Sprout, Wheat } = icons

type AppState = AppData & { loaded: boolean }
type RecordTab = 'planting' | 'harvest'

const initialData: AppState = { ...allMockData, loaded: false }

function App() {
  const [data, setData] = useState<AppState>(initialData)
  const [quickActionOpen, setQuickActionOpen] = useState(false)

  useEffect(() => {
    let active = true
    loadAppData().then((loadedData) => {
      if (active) setData({ ...loadedData, loaded: true })
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header onQuickAction={() => setQuickActionOpen(true)} />
        <main className="page-surface">
          <Routes>
            <Route path="/" element={<Dashboard data={data} />} />
            <Route path="/plots" element={<PlotsPage data={data} />} />
            <Route path="/records" element={<RecordsPage data={data} />} />
            <Route path="/status" element={<ZeroBurnStatusPage data={data} />} />
            <Route path="/token-marketplace" element={<TokenMarketplacePage data={data} />} />
            <Route path="/profile" element={<ProfilePage data={data} />} />
            <Route path="/plots/:plotId" element={<Navigate to="/plots" replace />} />
            <Route path="/planting" element={<Navigate to="/records" replace />} />
            <Route path="/harvest" element={<Navigate to="/records" replace />} />
            <Route path="/verification" element={<Navigate to="/status" replace />} />
            <Route path="/certificates" element={<Navigate to="/status" replace />} />
            <Route path="/wallet" element={<Navigate to="/token-marketplace" replace />} />
            <Route path="/marketplace" element={<Navigate to="/token-marketplace" replace />} />
          </Routes>
        </main>
      </div>
      <MobileNav />
      <FormModal title="Next Action" open={quickActionOpen} onClose={() => setQuickActionOpen(false)}>
        <QuickActionForm onClose={() => setQuickActionOpen(false)} />
      </FormModal>
    </div>
  )
}

function PageTitle({ title, kicker, action }: { title: string; kicker: string; action?: React.ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <p>{kicker}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  )
}

function Dashboard({ data }: { data: AppState }) {
  const navigate = useNavigate()
  const selectedPlot = data.plots.find((plot) => plot.id === 'plot-b') ?? data.plots[0]

  return (
    <>
      <section className="next-action-banner">
        <div>
          <strong>Next Action</strong>
          <h1>Record harvest data</h1>
          <p>{selectedPlot?.name ?? 'Plot B'} is ready for harvest review.</p>
          <div className="next-action-check"><CheckCircle2 size={18} /> This helps keep your Zero-Burn status on track.</div>
          <div className="action-row">
            <button className="button primary" onClick={() => navigate('/records')}><Wheat size={17} /> Record harvest</button>
            <button className="button secondary" onClick={() => navigate('/plots')}>View plot</button>
          </div>
        </div>
      </section>

      <div className="summary-grid simplified">
        <SummaryCard icon={Map} label="Registered Plots" value={data.summary.registeredPlots} note="35 rai total" />
        <SummaryCard icon={ClipboardCheck} label="Pending Review" value={data.summary.pendingReview} note="Plot B needs harvest data" tone="amber" />
        <SummaryCard icon={Coins} label="Token Balance" value={`${data.summary.tokenBalance} ZBT`} note="120 available" tone="blue" />
      </div>

      <div className="compact-status-row">
        <div><Wheat size={18} /><span>Total harvest</span><strong>{data.summary.totalHarvest}</strong></div>
        <div><ShoppingBag size={18} /><span>Marketplace status</span><strong>Active · 2 listings</strong></div>
      </div>

      <Card title="Farm map preview" action={<button className="button secondary small" onClick={() => navigate('/plots')}>View all plots</button>}>
        <MapPanel plots={data.plots} selectedId="plot-b" />
      </Card>
    </>
  )
}

function PlotsPage({ data }: { data: AppState }) {
  const [selectedPlot, setSelectedPlot] = useState(data.plots[1]?.id ?? data.plots[0]?.id)
  const [modalOpen, setModalOpen] = useState(false)
  const selected = data.plots.find((plot) => plot.id === selectedPlot) ?? data.plots[0]

  return (
    <>
      <PageTitle title="My Plots" kicker="Farm area management" action={<button className="button primary" onClick={() => setModalOpen(true)}><Plus size={17} /> Add Plot</button>} />
      <div className="farmer-page-grid">
        <Card title="Map panel">
          <MapPanel plots={data.plots} selectedId={selectedPlot} onSelect={setSelectedPlot} detailed />
        </Card>
        <Card title="Plot list" action={<span>{data.plots.length} plots</span>}>
          <div className="stack">
            {data.plots.map((plot) => <PlotCard key={plot.id} plot={plot} selected={plot.id === selectedPlot} onSelect={() => setSelectedPlot(plot.id)} />)}
          </div>
          <PlotDetailCard plot={selected} />
        </Card>
      </div>
      <FormModal title="Add Plot" open={modalOpen} onClose={() => setModalOpen(false)}><PlotForm /></FormModal>
    </>
  )
}

function PlotDetailCard({ plot }: { plot?: Plot }) {
  if (!plot) return null
  return (
    <div className="focused-detail">
      <div className="panel-head"><h2>{plot.name} detail</h2><StatusBadge status={plot.status} /></div>
      <div className="detail-list">
        <div><span>Crop</span><strong>{plot.cropType}</strong></div>
        <div><span>Area</span><strong>{plot.areaRai} rai</strong></div>
        <div><span>Harvest</span><strong>{plot.harvestQuantity}</strong></div>
        <div><span>Traceability ID</span><strong>{plot.status === 'verified' ? 'TRC-NSW-001' : plot.status === 'pending' ? 'Pending' : 'Review hold'}</strong></div>
      </div>
      <button className="button primary">View Plot Detail</button>
    </div>
  )
}

function RecordsPage({ data }: { data: AppState }) {
  const [tab, setTab] = useState<RecordTab>('planting')
  const isPlanting = tab === 'planting'
  const columns = isPlanting ? ['Plot', 'Planting date', 'Variety', 'Evidence', 'Status'] : ['Traceability ID', 'Plot', 'Harvest date', 'Quantity', 'Status']
  const rows = isPlanting
    ? data.plantingRecords.map((record) => [plotName(data, record.plotId), record.plantingDate, record.cropVariety, record.notes, <StatusBadge status={record.status} />])
    : [
        ...data.harvestRecords.map((record) => [record.id.replace('HAR', 'ZB-2026'), plotName(data, record.plotId), record.harvestDate, `${record.quantity} ${record.unit}`, <StatusBadge status={record.status} />]),
        ['New harvest', 'Plot B', 'Ready now', 'Not recorded', <StatusBadge status="next action" />],
      ]

  return (
    <>
      <PageTitle
        title="Records"
        kicker="Planting and harvest history"
        action={<div className="record-tabs"><button className={isPlanting ? 'active' : ''} onClick={() => setTab('planting')}><Sprout size={16} /> Planting</button><button className={!isPlanting ? 'active' : ''} onClick={() => setTab('harvest')}><Wheat size={16} /> Harvest</button></div>}
      />
      <Card title={`${isPlanting ? 'Planting' : 'Harvest'} records`} action={<button className="button primary"><Plus size={17} /> Add {isPlanting ? 'planting' : 'harvest'} record</button>}>
        <DataTable columns={columns} rows={rows} />
      </Card>
    </>
  )
}

function ZeroBurnStatusPage({ data }: { data: AppState }) {
  const [selectedPlot, setSelectedPlot] = useState(data.plots[0]?.id)
  const selected = data.plots.find((plot) => plot.id === selectedPlot) ?? data.plots[0]

  return (
    <>
      <PageTitle title="Zero-Burn Status" kicker="Verification and certificate" action={<button className="button primary"><Download size={17} /> Download certificate</button>} />
      <div className="status-page-grid">
        <Card title="Verification status of each plot">
          <div className="stack">
            {data.plots.map((plot) => <PlotCard key={plot.id} plot={plot} selected={plot.id === selectedPlot} onSelect={() => setSelectedPlot(plot.id)} />)}
          </div>
        </Card>
        <Card title="Inspection timeline" action={<StatusBadge status={selected?.status ?? 'pending'} />}>
          <Timeline items={['Plot boundary submitted', 'Satellite and drone check', selected?.status === 'verified' ? 'Zero-Burn result approved' : 'Farmer evidence review']} />
          <div className="evidence-result-card">
            <h3>Evidence / result card</h3>
            <p>{selected?.name}: {selected?.status === 'verified' ? 'No burn signal detected across harvest window.' : selected?.status === 'pending' ? 'Harvest data is required before final review.' : 'Inspection follow-up required near the southern boundary.'}</p>
            <div className="detail-list">
              <div><span>Traceability ID</span><strong>{selected?.status === 'verified' ? 'TRC-NSW-001' : selected?.status === 'pending' ? 'Pending' : 'Review hold'}</strong></div>
              <div><span>Certificate</span><strong>{selected?.certificateId}</strong></div>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

function TokenMarketplacePage({ data }: { data: AppState }) {
  return (
    <>
      <PageTitle title="Token & Marketplace" kicker="Tokens and selling" action={<button className="button primary"><ShoppingBag size={17} /> Sell Produce + Attach Token</button>} />
      <div className="token-market-grid">
        <section className="token-hero-card">
          <span>Token balance</span>
          <strong>{data.summary.tokenBalance} ZBT</strong>
          <p>120 available · 60 sold</p>
          <button className="button">Sell Produce + Attach Token</button>
        </section>
        <Card title="Harvest lots" action={<span>Ready to sell</span>}>
          <div className="stack">
            {data.harvestRecords.map((record) => <div className="item-card" key={record.id}><div className="icon-bubble green"><Wheat size={20} /></div><div><strong>{record.id.replace('HAR', 'ZB-2026')}</strong><span>{plotName(data, record.plotId)} · {record.quantity} {record.unit}</span><small>{record.tokenLotId}</small></div><StatusBadge status={record.status} /></div>)}
          </div>
        </Card>
      </div>
      <Card title="Product listings" action={<button className="button secondary small">Create listing</button>}>
        <div className="market-list">
          {data.marketplace.map((listing) => <div className="market-card" key={listing.id}><div><strong>{listing.productType} {listing.quantity}</strong><span>{listing.mode}</span></div><p>{listing.price} · {listing.buyerInterest} interested buyers</p><StatusBadge status={listing.status} /></div>)}
        </div>
      </Card>
    </>
  )
}

function ProfilePage({ data }: { data: AppState }) {
  return (
    <>
      <PageTitle title="Profile" kicker="Farmer account" action={<button className="button primary">Save changes</button>} />
      <div className="profile-grid">
        <Card>
          <div className="profile-card">
            <div className="avatar large">SF</div>
            <div><h2>{data.profile.name}</h2><p>{data.profile.province} · {data.profile.crop}</p></div>
          </div>
        </Card>
        <Card title="Farm details">
          <div className="detail-list">
            <div><span>Owner</span><strong>{data.profile.ownerInfo}</strong></div>
            <div><span>Phone</span><strong>{data.profile.phone}</strong></div>
            <div><span>Payment</span><strong>{data.profile.paymentInfo}</strong></div>
            <div><span>Account status</span><StatusBadge status={data.profile.accountStatus} /></div>
          </div>
        </Card>
      </div>
    </>
  )
}

function QuickActionForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="quick-action-list">
      {[
        ['Add Plot', '/plots'],
        ['Record planting date', '/records'],
        ['Record harvest data', '/records'],
        ['View verification result', '/status'],
        ['Sell Produce + Attach Token', '/token-marketplace'],
      ].map(([label, path]) => (
        <button key={label} className="item-card" onClick={() => { navigate(path); onClose() }}>
          <div className="icon-bubble green"><Plus size={18} /></div>
          <strong>{label}</strong>
        </button>
      ))}
    </div>
  )
}

function PlotForm() {
  return (
    <form className="form-grid">
      <label>Plot name<input defaultValue="Plot D" /></label>
      <label>Area size<input defaultValue="10 rai" /></label>
      <label>Crop type<input defaultValue="Sugarcane" /></label>
      <label>Boundary source<select defaultValue="draw"><option value="draw">Draw on map</option><option value="upload">Upload GPS file</option></select></label>
      <button className="button primary" type="button">Save plot</button>
    </form>
  )
}

function plotName(data: AppState, plotId: string) {
  return data.plots.find((plot) => plot.id === plotId)?.name ?? plotId
}

export default App
