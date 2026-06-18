import { createClient } from '@supabase/supabase-js'
import type { StorageAdapter } from './types'

export class SupabaseStorageAdapter implements StorageAdapter {
  private supabase: any

  constructor() {
    const url = process.env.SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    this.supabase = createClient(url, serviceRoleKey)
  }

  async createSignedUploadUrl(bucket: string, key: string): Promise<{ signedUploadUrl: string; expiresAt: string }> {
    const ttl = Number(process.env.UPLOAD_URL_TTL_SECONDS) || 600
    const { data, error } = await this.supabase.storage.from(bucket).createSignedUploadUrl(key)
    if (error || !data) {
      throw new Error(`Failed to create signed upload URL: ${error?.message || 'Unknown error'}`)
    }
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
    return {
      signedUploadUrl: data.signedUrl,
      expiresAt,
    }
  }

  async createSignedDownloadUrl(bucket: string, key: string): Promise<{ signedDownloadUrl: string; expiresAt: string }> {
    const ttl = Number(process.env.DOWNLOAD_URL_TTL_SECONDS) || 300
    const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(key, ttl)
    if (error || !data) {
      throw new Error(`Failed to create signed download URL: ${error?.message || 'Unknown error'}`)
    }
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
    return {
      signedDownloadUrl: data.signedUrl,
      expiresAt,
    }
  }

  async verifyObject(bucket: string, key: string, sizeBytes?: number, contentType?: string): Promise<boolean> {
    const parts = key.split('/')
    const fileName = parts.pop()!
    const folderPath = parts.join('/')

    const { data, error } = await this.supabase.storage.from(bucket).list(folderPath, {
      search: fileName,
      limit: 1,
    })

    if (error || !data || data.length === 0) {
      return false
    }

    const fileInfo = data[0]
    if (fileInfo.name !== fileName) {
      return false
    }

    if (sizeBytes !== undefined && fileInfo.metadata?.size !== undefined) {
      if (fileInfo.metadata.size !== sizeBytes) {
        return false
      }
    }

    if (contentType !== undefined && fileInfo.metadata?.mimetype !== undefined) {
      if (fileInfo.metadata.mimetype !== contentType) {
        return false
      }
    }

    return true
  }
}
