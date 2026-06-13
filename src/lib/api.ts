import { allMockData } from '../data/mockData'
import type {
  Certificate,
  FarmerProfile,
  HarvestRecord,
  MarketplaceListing,
  PlantingRecord,
  Plot,
  Summary,
  TokenLot,
  VerificationRecord,
} from '../data/types'

const API_BASE = 'http://localhost:4184/api'

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`)
    if (!response.ok) throw new Error(response.statusText)
    return (await response.json()) as T
  } catch {
    return fallback
  }
}

export function loadAppData() {
  return Promise.all([
    fetchJson<Summary>('/summary', allMockData.summary),
    fetchJson<Plot[]>('/plots', allMockData.plots),
    fetchJson<PlantingRecord[]>('/planting-records', allMockData.plantingRecords),
    fetchJson<HarvestRecord[]>('/harvest-records', allMockData.harvestRecords),
    fetchJson<VerificationRecord[]>('/verifications', allMockData.verifications),
    fetchJson<TokenLot[]>('/tokens', allMockData.tokens),
    fetchJson<MarketplaceListing[]>('/marketplace', allMockData.marketplace),
    fetchJson<Certificate[]>('/certificates', allMockData.certificates),
    fetchJson<FarmerProfile>('/profile', allMockData.profile),
  ]).then(([summary, plots, plantingRecords, harvestRecords, verifications, tokens, marketplace, certificates, profile]) => ({
    summary,
    plots,
    plantingRecords,
    harvestRecords,
    verifications,
    tokens,
    marketplace,
    certificates,
    profile,
    activity: allMockData.activity,
  }))
}

export type AppData = Awaited<ReturnType<typeof loadAppData>>
