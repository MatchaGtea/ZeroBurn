import type { StorageAdapter } from './types'

export class MockStorageAdapter implements StorageAdapter {
  async createSignedUploadUrl(bucket: string, key: string): Promise<{ signedUploadUrl: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + 600 * 1000).toISOString()
    return {
      signedUploadUrl: `http://mock-storage.local/upload/${bucket}/${key}?signature=mock_sig`,
      expiresAt,
    }
  }

  async createSignedDownloadUrl(bucket: string, key: string): Promise<{ signedDownloadUrl: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString()
    return {
      signedDownloadUrl: `http://mock-storage.local/download/${bucket}/${key}?signature=mock_sig`,
      expiresAt,
    }
  }

  async verifyObject(bucket: string, key: string, sizeBytes?: number, contentType?: string): Promise<boolean> {
    void bucket
    void key
    void sizeBytes
    void contentType
    return true
  }
}
