import type React from 'react'
import { NavLink } from 'react-router-dom'
import type { Certificate, MarketplaceListing, Plot, PlotStatus, RecordStatus, TokenLot, VerificationStatus } from '../data/types'

type IconProps = { size?: number; className?: string }
type IconComponent = (props: IconProps) => React.ReactElement

function makeIcon(paths: React.ReactNode): IconComponent {
  return ({ size = 20, className }: IconProps) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  )
}

const Bell = makeIcon(<><path d="M6 9a6 6 0 0 1 12 0c0 7 3 6 3 8H3c0-2 3-1 3-8Z" /><path d="M10 21h4" /></>)
const CalendarDays = makeIcon(<><path d="M7 3v4M17 3v4M4 9h16M5 5h14v16H5z" /></>)
const CheckCircle2 = makeIcon(<><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>)
const ChevronDown = makeIcon(<path d="m6 9 6 6 6-6" />)
const CircleDollarSign = makeIcon(<><circle cx="12" cy="12" r="9" /><path d="M12 6v12M15 9.5c-.5-1-1.6-1.5-3-1.5-2 0-3 .9-3 2s1 1.8 3 2 3 .9 3 2-1 2-3 2c-1.5 0-2.6-.5-3.2-1.5" /></>)
const ClipboardCheck = makeIcon(<><path d="M9 4h6l1 2h3v15H5V6h3z" /><path d="m8 13 3 3 5-6" /></>)
const Coins = makeIcon(<><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v8c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>)
const Download = makeIcon(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>)
const Edit3 = makeIcon(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13 7 4 4" /></>)
const FileCheck2 = makeIcon(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="m8 15 2 2 5-6" /></>)
const Filter = makeIcon(<><path d="M4 5h16" /><path d="M7 12h10" /><path d="M10 19h4" /></>)
const Flame = makeIcon(<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-6 5-6 9-2-1-3-3-3-3-1 5 2 13 7 13Z" />)
const Home = makeIcon(<><path d="M3 11 12 4l9 7" /><path d="M6 10v10h12V10" /></>)
const Layers3 = makeIcon(<><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>)
const Leaf = makeIcon(<><path d="M20 4C10 4 5 9 5 19c10 0 15-5 15-15Z" /><path d="M5 19c4-5 8-8 15-15" /></>)
const Map = makeIcon(<><path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3z" /><path d="M9 3v15M15 6v15" /></>)
const MapPin = makeIcon(<><path d="M12 22s7-5 7-12a7 7 0 0 0-14 0c0 7 7 12 7 12Z" /><circle cx="12" cy="10" r="2" /></>)
const Menu = makeIcon(<><path d="M4 7h16M4 12h16M4 17h16" /></>)
const Plus = makeIcon(<><path d="M12 5v14M5 12h14" /></>)
const QrCode = makeIcon(<><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2M18 14h2M14 18h6M18 16v4" /></>)
const Search = makeIcon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>)
const Settings = makeIcon(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>)
const ShieldCheck = makeIcon(<><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="m8 12 3 3 5-6" /></>)
const ShoppingBag = makeIcon(<><path d="M6 8h12l-1 13H7z" /><path d="M9 8a3 3 0 0 1 6 0" /></>)
const Sprout = makeIcon(<><path d="M12 21V10" /><path d="M12 10C7 10 5 7 5 4c4 0 7 2 7 6Z" /><path d="M12 12c5 0 7-3 7-6-4 0-7 2-7 6Z" /></>)
const Tractor = makeIcon(<><circle cx="7" cy="17" r="3" /><circle cx="17" cy="17" r="2" /><path d="M4 17V9h7l3 5h5" /><path d="M6 9V6h4" /></>)
const UploadCloud = makeIcon(<><path d="M16 16h2a4 4 0 0 0 0-8 6 6 0 0 0-11-2A5 5 0 0 0 6 16h2" /><path d="M12 19V9M8 13l4-4 4 4" /></>)
const User = makeIcon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c2-5 14-5 16 0" /></>)
const WalletCards = makeIcon(<><path d="M4 7h16v12H4z" /><path d="M16 12h4v4h-4z" /><path d="M6 7V5h11v2" /></>)
const Wheat = makeIcon(<><path d="M12 22V4" /><path d="M8 6c0 2 2 3 4 3M16 6c0 2-2 3-4 3M8 11c0 2 2 3 4 3M16 11c0 2-2 3-4 3M8 16c0 2 2 3 4 3M16 16c0 2-2 3-4 3" /></>)
const X = makeIcon(<path d="M6 6l12 12M18 6 6 18" />)

export const icons = {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Coins,
  Download,
  Edit3,
  FileCheck2,
  Filter,
  Flame,
  Home,
  Layers3,
  Leaf,
  Map,
  MapPin,
  Menu,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Tractor,
  UploadCloud,
  User,
  WalletCards,
  Wheat,
  X,
}

export const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/plots', label: 'My Plots', icon: Map },
  { to: '/records', label: 'Records', icon: ClipboardCheck },
  { to: '/status', label: 'Zero-Burn Status', icon: ShieldCheck },
  { to: '/token-marketplace', label: 'Token & Marketplace', icon: ShoppingBag },
  { to: '/profile', label: 'Profile', icon: User },
]

export const mobileNavItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/plots', label: 'Plots', icon: Map },
  { to: '/records', label: 'Records', icon: ClipboardCheck },
  { to: '/status', label: 'Status', icon: ShieldCheck },
  { to: '/token-marketplace', label: 'Sell', icon: ShoppingBag },
  { to: '/profile', label: 'Profile', icon: User },
]

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><Leaf size={30} /></div>
      <div>
        <strong>Zero-Burn Farmer</strong>
        <span>Simple farm traceability</span>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="farmer-card">
        <div className="avatar">SF</div>
        <div>
          <strong>Somchai Farm</strong>
          <span>Farm ID: ZBF-24781</span>
        </div>
        <dl>
          <div><dt>Province</dt><dd>Nakhon Sawan</dd></div>
          <div><dt>Total plots</dt><dd>3</dd></div>
          <div><dt>Total area</dt><dd>35 rai</dd></div>
        </dl>
      </div>
    </aside>
  )
}

export function Header({ onQuickAction }: { onQuickAction: () => void }) {
  return (
    <header className="topbar">
      <div className="searchbox">
        <Search size={18} />
        <input aria-label="Search plots and records" placeholder="Search plots, records..." />
      </div>
      <button className="season-button"><CalendarDays size={18} /> Season 2025/26 <ChevronDown size={16} /></button>
      <button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="dot">3</span></button>
      <div className="user-chip"><div className="avatar small">SF</div><span>Somchai Farm</span><ChevronDown size={15} /></div>
      <button className="button primary" onClick={onQuickAction}><Plus size={17} /> Next Action</button>
    </header>
  )
}

export function MobileNav() {
  return (
    <nav className="mobile-nav">
      {mobileNavItems.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <item.icon size={21} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function StatusBadge({ status }: { status: PlotStatus | RecordStatus | VerificationStatus | string }) {
  const normalized = status.toLowerCase().replace(/\s+/g, '-')
  return <span className={`status status-${normalized}`}>{status.replace(/-/g, ' ')}</span>
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && <div className="panel-head">{title && <h2>{title}</h2>}{action}</div>}
      {children}
    </section>
  )
}

export function SummaryCard({ icon: Icon, label, value, note, tone = 'green' }: { icon: React.ElementType; label: string; value: string | number; note: string; tone?: 'green' | 'blue' | 'amber' | 'red' }) {
  return (
    <div className="summary-card">
      <div className={`icon-bubble ${tone}`}><Icon size={22} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  )
}

export function FilterBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`filter-bar ${compact ? 'compact' : ''}`}>
      <label><Search size={16} /><input placeholder="Search records" /></label>
      <select aria-label="Crop type"><option>All crops</option><option>Sugarcane</option></select>
      <select aria-label="Status"><option>All statuses</option><option>Verified</option><option>Pending</option><option>Flagged</option></select>
      <select aria-label="Season"><option>2025/26</option><option>2024/25</option></select>
      <button className="button secondary"><Filter size={16} /> Filter</button>
    </div>
  )
}

export function PlotCard({ plot, selected, onSelect }: { plot: Plot; selected?: boolean; onSelect?: () => void }) {
  return (
    <button className={`plot-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="crop-thumb"><Wheat size={20} /></div>
      <div>
        <strong>{plot.name}</strong>
        <span>{plot.cropType} • {plot.areaRai} rai</span>
        <small>{plot.plantingDate} → {plot.actualHarvestDate}</small>
      </div>
      <StatusBadge status={plot.status} />
    </button>
  )
}

export function MapPanel({ plots, selectedId, onSelect, detailed = false }: { plots: Plot[]; selectedId?: string; onSelect?: (id: string) => void; detailed?: boolean }) {
  return (
    <div className={`map-panel ${detailed ? 'tall' : ''}`}>
      <div className="map-toolbar">
        <button className="button secondary"><MapPin size={16} /> Draw Boundary</button>
        <button className="button secondary"><UploadCloud size={16} /> Upload Drone Data</button>
        <button className="button secondary"><Layers3 size={16} /> Layers</button>
      </div>
      <svg viewBox="0 0 860 520" role="img" aria-label="Farm map with registered plot boundaries">
        <defs>
          <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#d5ead0" />
            <stop offset="0.45" stopColor="#b8d9a8" />
            <stop offset="1" stopColor="#eef5df" />
          </linearGradient>
          <pattern id="rows" width="58" height="58" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
            <rect width="58" height="58" fill="url(#field)" />
            <path d="M0 14H58M0 32H58M0 50H58" stroke="#8fb67d" strokeOpacity=".25" strokeWidth="3" />
          </pattern>
        </defs>
        <rect width="860" height="520" rx="28" fill="url(#rows)" />
        <path d="M0 338 C170 278 220 380 384 320 S652 220 860 294" stroke="#ffffff" strokeWidth="18" strokeOpacity=".82" fill="none" />
        <path d="M0 126 C166 94 328 178 492 132 S700 54 860 94" stroke="#ffffff" strokeWidth="14" strokeOpacity=".68" fill="none" />
        <path d="M70 0 V520M180 0 V520M310 0 V520M446 0 V520M610 0 V520M760 0 V520" stroke="#466b50" strokeOpacity=".08" />
        {plots.map((plot) => {
          const isSelected = plot.id === selectedId
          return (
            <g key={plot.id} onClick={() => onSelect?.(plot.id)} className="map-plot" tabIndex={0}>
              <polygon points={plot.polygon} className={`plot-shape ${plot.status} ${isSelected ? 'selected' : ''}`} />
              <text x={plot.polygon.split(' ')[0].split(',')[0]} y={Number(plot.polygon.split(' ')[0].split(',')[1]) + 28} className="plot-label">
                {plot.name}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="map-controls"><button>+</button><button>-</button><button>⌖</button></div>
      <div className="legend">
        <span><i className="legend-dot verified" /> Verified</span>
        <span><i className="legend-dot pending" /> Pending</span>
        <span><i className="legend-dot flagged" /> Flagged</span>
        <span><i className="legend-dot rejected" /> Rejected</span>
      </div>
    </div>
  )
}

export function Timeline({ items }: { items: string[] }) {
  return <div className="timeline">{items.map((item, index) => <div key={item} className="timeline-item"><span>{index + 1}</span><p>{item}</p><small>{index + 1} days ago</small></div>)}</div>
}

export function DataTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export function TokenCard({ token }: { token: TokenLot }) {
  return <div className="item-card"><div className="icon-bubble green"><Coins size={20} /></div><div><strong>{token.id}</strong><span>{token.tokenAmount} ZBT • {token.harvestQuantity}</span><small>{token.linkedProductLot}</small></div><StatusBadge status={token.status} /></div>
}

export function MarketplaceCard({ listing, onAttach }: { listing: MarketplaceListing; onAttach?: () => void }) {
  return (
    <div className="market-card">
      <div><strong>{listing.productType} {listing.quantity}</strong><span>{listing.mode}</span></div>
      <p>{listing.price} • {listing.buyerInterest} interested buyers</p>
      <div className="card-actions">
        <StatusBadge status={listing.status} />
        <button className="button secondary small" onClick={onAttach}>{listing.tokenAttached ? 'Token attached' : 'Attach token'}</button>
      </div>
    </div>
  )
}

export function QRPlaceholder() {
  return <div className="qr-grid" aria-label="QR code placeholder">{Array.from({ length: 49 }).map((_, index) => <i key={index} className={index % 3 === 0 || index % 7 === 0 ? 'on' : ''} />)}</div>
}

export function CertificateCard({ certificate, onView }: { certificate: Certificate; onView?: () => void }) {
  return (
    <div className="certificate-card">
      <div><FileCheck2 size={24} /><strong>{certificate.id}</strong><StatusBadge status={certificate.status} /></div>
      <p>{certificate.productLot} • {certificate.traceabilityId}</p>
      <QRPlaceholder />
      <button className="button secondary" onClick={onView}><QrCode size={16} /> View Certificate</button>
    </div>
  )
}

export function FormModal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <div className="panel-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={18} /></button></div>
        {children}
      </div>
    </div>
  )
}
