import { useEffect, useState } from 'react'
import type React from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  CertificateCard,
  DataTable,
  FilterBar,
  FormModal,
  Header,
  MapPanel,
  MarketplaceCard,
  MobileNav,
  PlotCard,
  QRPlaceholder,
  Sidebar,
  StatusBadge,
  SummaryCard,
  Timeline,
  TokenCard,
  icons,
} from './components/ui'
import { allMockData } from './data/mockData'
import type { AppData } from './lib/api'
import { loadAppData } from './lib/api'

const {
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Coins,
  Download,
  Edit3,
  Flame,
  Map,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Tractor,
  WalletCards,
  Wheat,
} = icons

type AppState = AppData & { loaded: boolean }

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
            <Route path="/plots/:plotId" element={<PlotDetailPage data={data} />} />
            <Route path="/planting" element={<PlantingPage data={data} />} />
            <Route path="/harvest" element={<HarvestPage data={data} />} />
            <Route path="/verification" element={<VerificationPage data={data} />} />
            <Route path="/wallet" element={<WalletPage data={data} />} />
            <Route path="/marketplace" element={<MarketplacePage data={data} />} />
            <Route path="/certificates" element={<CertificatesPage data={data} />} />
            <Route path="/profile" element={<ProfilePage data={data} />} />
          </Routes>
        </main>
      </div>
      <MobileNav />
      <FormModal title="Quick Action" open={quickActionOpen} onClose={() => setQuickActionOpen(false)}>
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

function MetricGrid({ data }: { data: AppState }) {
  return (
    <div className="summary-grid">
      <SummaryCard icon={Map} label="Registered Plots" value={data.summary.registeredPlots} note="35 rai total" />
      <SummaryCard icon={ShieldCheck} label="Verified Plots" value={data.summary.verifiedPlots} note="Zero-Burn passed" />
      <SummaryCard icon={ClipboardCheck} label="Pending Review" value={data.summary.pendingReview} note="Needs proof" tone="amber" />
      <SummaryCard icon={Flame} label="Flagged Plots" value={data.summary.flaggedPlots} note="Review needed" tone="red" />
      <SummaryCard icon={Wheat} label="Total Harvest" value={data.summary.totalHarvest} note="This season" tone="blue" />
      <SummaryCard icon={Coins} label="Token Balance" value={`${data.summary.tokenBalance} ZBT`} note="120 available" />
      <SummaryCard icon={CircleDollarSign} label="Revenue from Produce" value={data.summary.revenueProduce} note="Mock sales" tone="blue" />
      <SummaryCard icon={WalletCards} label="Revenue from Tokens" value={data.summary.revenueTokens} note="60 sold" />
    </div>
  )
}

function Dashboard({ data }: { data: AppState }) {
  const [selectedPlot, setSelectedPlot] = useState(data.plots[0]?.id)
  const selected = data.plots.find((plot) => plot.id === selectedPlot) ?? data.plots[0]

  return (
    <>
      <PageTitle
        title="Dashboard Overview"
        kicker="Current season 2025/26"
        action={<div className="action-row"><button className="button primary"><Plus size={17} /> Add New Plot</button><button className="button secondary">Record Harvest</button></div>}
      />
      <MetricGrid data={data} />
      <div className="dashboard-grid">
        <section className="left-rail">
          <Card title="Plot Status List" action={<Link to="/plots">View all</Link>}>
            <div className="stack">
              {data.plots.map((plot) => <PlotCard key={plot.id} plot={plot} selected={plot.id === selectedPlot} onSelect={() => setSelectedPlot(plot.id)} />)}
            </div>
          </Card>
        </section>
        <section className="center-rail">
          <Card title="Main Farm Map Preview" action={<Link to="/plots">Open farm map</Link>}>
            <MapPanel plots={data.plots} selectedId={selectedPlot} onSelect={setSelectedPlot} />
          </Card>
          <div className="split-grid">
            <Card title="Recent Activity" action={<span>Live mock feed</span>}><Timeline items={data.activity} /></Card>
            <Card title="Marketplace Quick Actions">
              <div className="quick-grid">
                <button><ShoppingBag /> Sell Produce</button>
                <button><Coins /> Attach Token to Product</button>
                <button><Sprout /> Record Planting</button>
                <button><Wheat /> Record Harvest</button>
              </div>
            </Card>
          </div>
        </section>
        <aside className="right-rail">
          <VerificationWidget />
          <TokenWidget data={data} />
          <Card title="Selected Plot Detail">
            <div className="detail-list">
              <div><span>Plot</span><strong>{selected?.name}</strong></div>
              <div><span>Status</span><StatusBadge status={selected?.status ?? 'pending'} /></div>
              <div><span>Harvest</span><strong>{selected?.harvestQuantity}</strong></div>
              <div><span>Token lot</span><strong>{selected?.tokenLotId}</strong></div>
            </div>
          </Card>
        </aside>
      </div>
    </>
  )
}

function VerificationWidget() {
  return (
    <Card title="Verification Progress">
      <div className="donut-card">
        <div className="donut"><strong>33%</strong><span>Verified</span></div>
        <div className="legend vertical">
          <span><i className="legend-dot verified" /> Verified 1 plot</span>
          <span><i className="legend-dot pending" /> Pending 1 plot</span>
          <span><i className="legend-dot flagged" /> Flagged 1 plot</span>
        </div>
      </div>
    </Card>
  )
}

function TokenWidget({ data }: { data: AppState }) {
  return (
    <Card className="green-panel">
      <div className="token-balance">
        <div><span>Token Balance</span><strong>{data.summary.tokenBalance} ZBT</strong><small>120 available • 60 sold</small></div>
        <div className="icon-bubble green"><LeafIcon /></div>
      </div>
      <div className="action-row"><Link className="button primary" to="/wallet">View Wallet</Link><Link className="button secondary" to="/certificates">Certificates</Link></div>
    </Card>
  )
}

function PlotsPage({ data }: { data: AppState }) {
  const [selectedPlot, setSelectedPlot] = useState(data.plots[0]?.id)
  const [modalOpen, setModalOpen] = useState(false)
  const selected = data.plots.find((plot) => plot.id === selectedPlot) ?? data.plots[0]

  return (
    <>
      <PageTitle title="My Plots / Farm Map" kicker="Manage registered farm boundaries" action={<button className="button primary" onClick={() => setModalOpen(true)}><Plus size={17} /> Add Plot</button>} />
      <FilterBar />
      <div className="map-page-grid">
        <Card title="Plots (3)" className="plot-sidebar">
          <div className="stack">{data.plots.map((plot) => <PlotCard key={plot.id} plot={plot} selected={plot.id === selectedPlot} onSelect={() => setSelectedPlot(plot.id)} />)}</div>
        </Card>
        <Card title="Farm Boundary Map" action={<div className="action-row"><button className="button secondary">Draw Boundary</button><button className="button secondary">Upload Drone Data</button></div>}>
          <MapPanel plots={data.plots} selectedId={selectedPlot} onSelect={setSelectedPlot} detailed />
        </Card>
        <Card title={selected?.name ?? 'Plot Detail'} className="detail-panel" action={<StatusBadge status={selected?.status ?? 'pending'} />}>
          <PlotDetailMini plot={selected} />
          <div className="certificate-mini"><QRPlaceholder /><div><strong>Certificate Preview</strong><span>{selected?.certificateId}</span></div></div>
          <div className="action-row"><button className="button secondary"><Edit3 size={16} /> Edit Plot</button><Link className="button primary" to={`/plots/${selected?.id}`}>View Details</Link></div>
        </Card>
      </div>
      <FormModal title="Add / Edit Plot" open={modalOpen} onClose={() => setModalOpen(false)}><PlotForm /></FormModal>
    </>
  )
}

function PlotDetailMini({ plot }: { plot?: AppState['plots'][number] }) {
  if (!plot) return null
  return (
    <div className="detail-list">
      <div><span>Crop</span><strong>{plot.cropType}</strong></div>
      <div><span>Area size</span><strong>{plot.areaRai} rai</strong></div>
      <div><span>GPS</span><strong>{plot.gps}</strong></div>
      <div><span>Planting</span><strong>{plot.plantingDate}</strong></div>
      <div><span>Harvest</span><strong>{plot.actualHarvestDate}</strong></div>
      <div><span>Token lot</span><strong>{plot.tokenLotId}</strong></div>
      <div><span>Product lot</span><strong>{plot.productLotId}</strong></div>
    </div>
  )
}

function PlotDetailPage({ data }: { data: AppState }) {
  const { plotId } = useParams()
  const plot = data.plots.find((item) => item.id === plotId) ?? data.plots[0]
  return (
    <>
      <PageTitle title={plot.name} kicker="Plot detail and traceability" action={<div className="action-row"><StatusBadge status={plot.status} /><button className="button primary">Sell Produce</button></div>} />
      <div className="detail-layout">
        <Card title="Farm Boundary Preview"><MapPanel plots={[plot]} selectedId={plot.id} detailed /></Card>
        <Card title="Basic Plot Information"><PlotDetailMini plot={plot} /></Card>
        <Card title="Timeline"><Timeline items={['Plot registered', 'Boundary submitted', 'Planting recorded', 'Harvest recorded', 'Verification submitted', 'Token issued', 'Product listed']} /></Card>
        <Card title="Verification & Links">
          <div className="info-cards">
            <div><ShieldCheck /><strong>{plot.status === 'verified' ? 'Verified Zero-Burn' : plot.status}</strong><span>Risk level: {plot.riskLevel}</span></div>
            <div><Coins /><strong>{plot.tokenLotId}</strong><span>Linked token lot</span></div>
            <div><ShoppingBag /><strong>{plot.productLotId}</strong><span>Linked product lot</span></div>
            <div><QrCode /><strong>{plot.certificateId}</strong><span>Certificate preview</span></div>
          </div>
        </Card>
      </div>
    </>
  )
}

function PlantingPage({ data }: { data: AppState }) {
  const [modalOpen, setModalOpen] = useState(false)
  const rows = data.plantingRecords.map((record) => [
    record.id,
    data.plots.find((plot) => plot.id === record.plotId)?.name,
    record.cropType,
    record.plantingDate,
    record.plantingMethod,
    <StatusBadge status={record.status} />,
    <button className="button secondary small" onClick={() => setModalOpen(true)}>Edit</button>,
  ])
  return <RecordsPage title="Planting Records" kicker="Record planting information for each plot" button="Add Planting Record" onAdd={() => setModalOpen(true)} rows={rows} columns={['Record', 'Plot', 'Crop', 'Planting date', 'Method', 'Status', 'Action']} modalTitle="Add / Edit Planting Record" modalOpen={modalOpen} setModalOpen={setModalOpen} form={<PlantingForm />} />
}

function HarvestPage({ data }: { data: AppState }) {
  const [modalOpen, setModalOpen] = useState(false)
  const rows = data.harvestRecords.map((record) => [
    record.id,
    data.plots.find((plot) => plot.id === record.plotId)?.name,
    record.productType,
    `${record.quantity} ${record.unit}`,
    record.buyer,
    <StatusBadge status={record.status} />,
    <button className="button secondary small" onClick={() => setModalOpen(true)}>Link/List</button>,
  ])
  return (
    <>
      <div className="summary-grid compact">
        <SummaryCard icon={Wheat} label="Total harvested quantity" value="35 tons" note="This season" />
        <SummaryCard icon={CheckCircle2} label="Verified harvest" value="20 tons" note="Linked to token" />
        <SummaryCard icon={ClipboardCheck} label="Pending harvest" value="15 tons" note="Reviewing proof" tone="amber" />
        <SummaryCard icon={ShoppingBag} label="Listed products" value="2" note="Marketplace" tone="blue" />
      </div>
      <RecordsPage title="Harvest Records" kicker="Record quantity and supporting proof" button="Add Harvest Record" onAdd={() => setModalOpen(true)} rows={rows} columns={['Record', 'Plot', 'Product', 'Quantity', 'Buyer', 'Status', 'Action']} modalTitle="Add / Edit Harvest Record" modalOpen={modalOpen} setModalOpen={setModalOpen} form={<HarvestForm />} />
    </>
  )
}

function RecordsPage({ title, kicker, button, onAdd, columns, rows, modalTitle, modalOpen, setModalOpen, form }: { title: string; kicker: string; button: string; onAdd: () => void; columns: string[]; rows: React.ReactNode[][]; modalTitle: string; modalOpen: boolean; setModalOpen: (open: boolean) => void; form: React.ReactNode }) {
  return (
    <>
      <PageTitle title={title} kicker={kicker} action={<button className="button primary" onClick={onAdd}><Plus size={17} /> {button}</button>} />
      <FilterBar />
      <Card title={title}><DataTable columns={columns} rows={rows} /></Card>
      <FormModal title={modalTitle} open={modalOpen} onClose={() => setModalOpen(false)}>{form}</FormModal>
    </>
  )
}

function VerificationPage({ data }: { data: AppState }) {
  const [selectedId, setSelectedId] = useState(data.verifications[0]?.id)
  const selected = data.verifications.find((item) => item.id === selectedId) ?? data.verifications[0]
  const rows = data.verifications.map((record) => [
    data.plots.find((plot) => plot.id === record.plotId)?.name,
    record.season,
    record.cropType,
    record.lastInspectionDate,
    record.detectionSource,
    record.riskLevel,
    <StatusBadge status={record.status} />,
    <button className="button secondary small" onClick={() => setSelectedId(record.id)}>View</button>,
  ])
  return (
    <>
      <PageTitle title="Zero-Burn Verification" kicker="Monitor verification status and evidence" action={<button className="button secondary"><Download size={16} /> Download Report</button>} />
      <div className="summary-grid compact"><SummaryCard icon={ShieldCheck} label="Verified" value="1" note="Passed" /><SummaryCard icon={ClipboardCheck} label="Monitoring" value="1" note="Under review" tone="amber" /><SummaryCard icon={Flame} label="Flagged" value="1" note="Appeal available" tone="red" /></div>
      <div className="two-column">
        <Card title="Verification Status Dashboard"><DataTable columns={['Plot', 'Season', 'Crop', 'Inspection', 'Source', 'Risk', 'Status', 'Action']} rows={rows} /></Card>
        <Card title="Evidence Panel">
          <MapPanel plots={data.plots.filter((plot) => plot.id === selected?.plotId)} selectedId={selected?.plotId} />
          <div className="detail-list">
            <div><span>Inspection date</span><strong>{selected?.lastInspectionDate}</strong></div>
            <div><span>Data source</span><strong>{selected?.detectionSource}</strong></div>
            <div><span>Notes</span><strong>{selected?.notes}</strong></div>
          </div>
          <button className="button warning">Submit Appeal / Request Review</button>
        </Card>
      </div>
      <Card title="Historical Timeline"><Timeline items={['Satellite check queued', 'Boundary matched to plot', 'Drone evidence uploaded', 'Verifier review completed']} /></Card>
    </>
  )
}

function WalletPage({ data }: { data: AppState }) {
  const rows = data.tokens.map((token) => [token.id, data.plots.find((plot) => plot.id === token.plotId)?.name, token.season, token.harvestQuantity, `${token.tokenAmount} ZBT`, <StatusBadge status={token.status} />, token.linkedProductLot, token.blockchainRecordId])
  return (
    <>
      <PageTitle title="Token Wallet" kicker="Zero-Burn credits and traceability rewards" action={<button className="button primary">Sell Token with Produce</button>} />
      <div className="wallet-hero">
        <Card className="green-panel"><div className="wallet-total"><span>Total balance</span><strong>180 ZBT</strong><p>120 available • 60 sold • 0 pending</p></div></Card>
        {data.tokens.map((token) => <TokenCard key={token.id} token={token} />)}
      </div>
      <Card title="Token Lots"><DataTable columns={['Token Lot ID', 'Plot', 'Season', 'Harvest', 'Amount', 'Status', 'Linked product', 'Traceability ID']} rows={rows} /></Card>
      <Card title="Transaction History"><Timeline items={['Token issued for Plot A', '50 ZBT linked to product lot', '60 ZBT sold with 2024/25 produce', 'Traceability certificate downloaded']} /></Card>
    </>
  )
}

function MarketplacePage({ data }: { data: AppState }) {
  const [mode, setMode] = useState<'Produce Only' | 'Produce + Zero-Burn Token'>('Produce + Zero-Burn Token')
  const [attached, setAttached] = useState<Record<string, boolean>>({})
  const listings = data.marketplace.map((listing) => ({ ...listing, tokenAttached: attached[listing.id] ?? listing.tokenAttached }))
  return (
    <>
      <PageTitle title="Marketplace" kicker="Sell produce with optional Zero-Burn token value" action={<button className="button primary"><Plus size={17} /> Create Listing</button>} />
      <div className="segmented"><button className={mode === 'Produce Only' ? 'active' : ''} onClick={() => setMode('Produce Only')}>Sell Produce Only</button><button className={mode === 'Produce + Zero-Burn Token' ? 'active' : ''} onClick={() => setMode('Produce + Zero-Burn Token')}>Sell Produce + Zero-Burn Token</button></div>
      <div className="two-column marketplace-layout">
        <Card title="Product Listings">
          <div className="market-list">{listings.map((listing) => <MarketplaceCard key={listing.id} listing={listing} onAttach={() => setAttached((current) => ({ ...current, [listing.id]: true }))} />)}</div>
        </Card>
        <Card title="Buyer Requests and Quick Actions">
          <div className="info-cards">
            <div><ShoppingBag /><strong>Nakhon Biofuel Factory</strong><span>Interested in 20 tons + 50 ZBT</span></div>
            <div><Tractor /><strong>Transport partner</strong><span>Available pickup this week</span></div>
            <div><CircleDollarSign /><strong>Market price</strong><span>฿8,800 / ton sugarcane</span></div>
          </div>
        </Card>
      </div>
      <Card title="Sales History"><Timeline items={['MKT-001 created', 'Buyer viewed certificate', 'Offer received for Plot A lot']} /></Card>
    </>
  )
}

function CertificatesPage({ data }: { data: AppState }) {
  const [selectedId, setSelectedId] = useState(data.certificates[0]?.id)
  const selected = data.certificates.find((certificate) => certificate.id === selectedId) ?? data.certificates[0]
  return (
    <>
      <PageTitle title="Certificates / Traceability" kicker="Download proof and share QR codes" action={<button className="button primary"><Download size={16} /> Download PDF</button>} />
      <div className="cert-grid">
        <div className="certificate-list">{data.certificates.map((certificate) => <CertificateCard key={certificate.id} certificate={certificate} onView={() => setSelectedId(certificate.id)} />)}</div>
        <Card title="Certificate Preview">
          <div className="certificate-preview">
            <QRPlaceholder />
            <div className="detail-list">
              <div><span>Certificate ID</span><strong>{selected?.id}</strong></div>
              <div><span>Farmer</span><strong>{selected?.farmerName}</strong></div>
              <div><span>Product lot</span><strong>{selected?.productLot}</strong></div>
              <div><span>Token lot</span><strong>{selected?.tokenLot}</strong></div>
              <div><span>Traceability ID</span><strong>{selected?.traceabilityId}</strong></div>
            </div>
            <div className="action-row"><button className="button secondary">Copy Link</button><button className="button primary">Share QR</button></div>
          </div>
        </Card>
      </div>
    </>
  )
}

function ProfilePage({ data }: { data: AppState }) {
  const [notifications, setNotifications] = useState(true)
  return (
    <>
      <PageTitle title="Farmer Profile" kicker="Identity, wallet, payment, and notification settings" action={<button className="button primary"><Edit3 size={16} /> Edit Profile</button>} />
      <div className="profile-grid">
        <Card title="Farmer Profile Card" className="green-panel">
          <div className="profile-card"><div className="avatar large">SF</div><strong>{data.profile.name}</strong><span>{data.profile.province} • {data.profile.crop}</span><StatusBadge status={data.profile.kycStatus} /></div>
        </Card>
        <Card title="Contact Information"><div className="detail-list"><div><span>Name</span><strong>{data.profile.name}</strong></div><div><span>Phone</span><strong>{data.profile.phone}</strong></div><div><span>Address</span><strong>{data.profile.address}</strong></div><div><span>Province</span><strong>{data.profile.province}</strong></div></div></Card>
        <Card title="Payment and Wallet"><div className="detail-list"><div><span>Payment</span><strong>{data.profile.paymentInfo}</strong></div><div><span>Wallet</span><strong>{data.profile.walletAddress}</strong></div><div><span>Account</span><strong>{data.profile.accountStatus}</strong></div></div></Card>
        <Card title="Notification Settings"><label className="toggle"><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /><span /> Verification and marketplace alerts</label></Card>
      </div>
    </>
  )
}

function QuickActionForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const actions = [
    ['Add New Plot', '/plots'],
    ['Record Planting', '/planting'],
    ['Record Harvest', '/harvest'],
    ['Sell Produce', '/marketplace'],
    ['Attach Token to Product', '/wallet'],
  ]
  return <div className="quick-action-list">{actions.map(([label, to]) => <button key={label} onClick={() => { navigate(to); onClose() }}>{label}</button>)}</div>
}

function PlotForm() {
  return <FormFields fields={['Plot name', 'Crop type', 'Area size', 'GPS coordinates', 'Province / district']} submit="Save Plot" />
}

function PlantingForm() {
  return <FormFields fields={['Select plot', 'Select season', 'Crop type', 'Crop variety', 'Planting date', 'Planting method', 'Fertilizer input', 'Notes', 'Upload images']} submit="Submit for Review" />
}

function HarvestForm() {
  return <FormFields fields={['Select plot', 'Harvest date', 'Product type', 'Quantity', 'Quality grade', 'Buyer / factory', 'Upload weighbridge slip', 'Notes']} submit="Link to Token" />
}

function FormFields({ fields, submit }: { fields: string[]; submit: string }) {
  return (
    <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
      {fields.map((field) => <label key={field}>{field}<input placeholder={field} /></label>)}
      <button className="button primary" type="submit">{submit}</button>
    </form>
  )
}

function LeafIcon() {
  return <Sprout size={24} />
}

export default App
