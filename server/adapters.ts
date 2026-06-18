import type { VerificationStatus } from './domain'

export interface ExternalAdapters {
  landBoundaryFromDocument(fileName: string): Promise<{ boundaryLabel: string; confidence: number; externalRequestId: string }>
  checkBurnEvidence(plotId: string): Promise<{ status: VerificationStatus; carbonSavedKg: number; notes: string; externalRequestId: string }>
  createMarketplaceListing(listingId: string): Promise<{ externalListingId: string; status: 'pending_approval' }>
}

export function createMockAdapters(): ExternalAdapters {
  return {
    async landBoundaryFromDocument(fileName) {
      return {
        boundaryLabel: `ขอบเขตจำลองจาก ${fileName || 'เอกสารพื้นที่'}`,
        confidence: 0.89,
        externalRequestId: `mock-boundary-${Date.now()}`,
      }
    },
    async checkBurnEvidence(plotId) {
      return {
        status: plotId === 'plot-c' ? 'needs_more_evidence' : 'approved',
        carbonSavedKg: plotId === 'plot-c' ? 0 : 1200,
        notes: plotId === 'plot-c' ? 'พบจุดเสี่ยง ต้องส่งหลักฐานเพิ่ม' : 'ไม่พบสัญญาณการเผาในช่วงตรวจ',
        externalRequestId: `mock-burn-${Date.now()}`,
      }
    },
    async createMarketplaceListing(listingId) {
      return {
        externalListingId: `mock-market-${listingId}`,
        status: 'pending_approval',
      }
    },
  }
}
