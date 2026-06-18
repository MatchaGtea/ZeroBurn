import { z } from 'zod'
import type { LandDeedAdapter, LandDeedSubmission } from './types'
import type { LandDeedJob, LandDeedResult } from '../domain'

const providerResultSchema = z.object({
  requestId: z.string(),
  status: z.enum(['queued', 'processing', 'succeeded', 'failed']),
  document: z.object({
    titleDeedNumber: z.string(),
    surveyPage: z.string(),
    parcelNumber: z.string(),
    subdistrict: z.string(),
    district: z.string(),
    province: z.string(),
    area: z.object({
      rai: z.number(),
      ngan: z.number(),
      squareWa: z.number(),
    }),
  }).optional(),
  boundary: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }).optional(),
  confidence: z.object({
    overall: z.number(),
    fields: z.record(z.string(), z.number()),
  }).optional(),
  warnings: z.array(z.string()).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }).optional(),
})

export class HttpLandDeedAdapter implements LandDeedAdapter {
  private apiUrl: string
  private apiKey: string
  private timeoutMs: number
  private maxRetries: number

  constructor() {
    this.apiUrl = process.env.LAND_DEED_API_URL || ''
    this.apiKey = process.env.LAND_DEED_API_KEY || ''
    this.timeoutMs = Number(process.env.LAND_DEED_API_TIMEOUT_MS) || 15000
    this.maxRetries = Number(process.env.LAND_DEED_API_MAX_RETRIES) || 2

    if (!this.apiUrl || !this.apiKey) {
      console.warn('HttpLandDeedAdapter initialized without LAND_DEED_API_URL or LAND_DEED_API_KEY')
    }
  }

  private async fetchWithTimeoutAndRetry(url: string, init: RequestInit): Promise<Response> {
    let attempt = 0
    while (true) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        // Retry on rate limit or 5xx server issues
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          if (attempt < this.maxRetries) {
            attempt++
            const backoff = 1000 * Math.pow(2, attempt)
            await new Promise((resolve) => setTimeout(resolve, backoff))
            continue
          }
        }
        return response
      } catch (error: any) {
        clearTimeout(timeoutId)
        if (attempt < this.maxRetries) {
          attempt++
          const backoff = 1000 * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, backoff))
          continue
        }
        throw error
      }
    }
  }

  async submit(input: LandDeedSubmission): Promise<LandDeedJob> {
    const url = `${this.apiUrl}/v1/land-deed-jobs`
    const body = {
      clientReferenceId: input.landDocumentId,
      documentType: 'thai_land_title_deed',
      documentUrl: input.documentUrl,
      requestedOperations: ['ocr', 'boundary'],
      outputCrs: 'EPSG:4326',
    }

    const res = await this.fetchWithTimeoutAndRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'Idempotency-Key': input.landDocumentId,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`External provider submission failed (${res.status}): ${errText}`)
    }

    const data = await res.json() as { requestId: string; status: 'queued' | 'processing' }
    return {
      requestId: data.requestId,
      status: data.status,
    }
  }

  async getResult(requestId: string): Promise<LandDeedResult> {
    const url = `${this.apiUrl}/v1/land-deed-jobs/${requestId}`
    const res = await this.fetchWithTimeoutAndRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`External provider polling failed (${res.status}): ${errText}`)
    }

    const payload = await res.json()
    const parsed = providerResultSchema.safeParse(payload)
    if (!parsed.success) {
      return {
        requestId,
        status: 'failed',
        error: {
          code: 'INVALID_PROVIDER_RESPONSE',
          message: `Failed to validate external provider payload: ${parsed.error.message}`,
          retryable: false,
          providerRequestId: requestId,
        },
      }
    }

    const data = parsed.data
    if (data.status === 'failed') {
      return {
        requestId,
        status: 'failed',
        error: {
          code: data.error?.code || 'DOCUMENT_UNREADABLE',
          message: data.error?.message || 'External processing failed',
          retryable: data.error?.retryable ?? false,
          providerRequestId: requestId,
        },
      }
    }

    return {
      requestId: data.requestId,
      status: data.status === 'succeeded' ? 'succeeded' : 'failed',
      document: data.document,
      boundary: data.boundary,
      confidence: data.confidence,
      warnings: data.warnings,
    }
  }
}
