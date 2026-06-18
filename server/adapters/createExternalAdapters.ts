import type { StorageAdapter, LandDeedAdapter } from './types'
import { MockStorageAdapter } from './mockStorageAdapter'
import { SupabaseStorageAdapter } from './supabaseStorageAdapter'
import { MockLandDeedAdapter } from './mockLandDeedAdapter'
import { HttpLandDeedAdapter } from './httpLandDeedAdapter'

export function createStorageAdapter(mode: 'mock' | 'supabase'): StorageAdapter {
  if (mode === 'supabase') {
    return new SupabaseStorageAdapter()
  }
  return new MockStorageAdapter()
}

export function createLandDeedAdapter(mode: 'mock' | 'http'): LandDeedAdapter {
  if (mode === 'http') {
    return new HttpLandDeedAdapter()
  }
  return new MockLandDeedAdapter()
}
export * from './types'
