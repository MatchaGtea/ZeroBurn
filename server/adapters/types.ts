import type { VerificationStatus, LandDeedResult, LandDeedJob } from '../domain'

export interface ExternalAdapters {
  landBoundaryFromDocument(fileName: string): Promise<{ boundaryLabel: string; confidence: number; externalRequestId: string }>
  checkBurnEvidence(plotId: string): Promise<{ status: VerificationStatus; carbonSavedKg: number; notes: string; externalRequestId: string }>
  createMarketplaceListing(listingId: string): Promise<{ externalListingId: string; status: 'pending_approval' }>
}

export interface StorageAdapter {
  createSignedUploadUrl(bucket: string, key: string): Promise<{ signedUploadUrl: string; expiresAt: string }>
  createSignedDownloadUrl(bucket: string, key: string): Promise<{ signedDownloadUrl: string; expiresAt: string }>
  verifyObject(bucket: string, key: string, sizeBytes?: number, contentType?: string): Promise<boolean>
}

export interface LandDeedSubmission {
  landDocumentId: string
  documentUrl: string
}

export interface LandDeedAdapter {
  submit(input: LandDeedSubmission): Promise<LandDeedJob>
  getResult(requestId: string): Promise<LandDeedResult>
}
