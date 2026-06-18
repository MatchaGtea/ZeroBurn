import type { LandDeedAdapter, LandDeedSubmission } from './types'
import type { LandDeedJob, LandDeedResult } from '../domain'

export class MockLandDeedAdapter implements LandDeedAdapter {
  async submit(input: LandDeedSubmission): Promise<LandDeedJob> {
    return {
      requestId: `mock-job-${input.landDocumentId}`,
      status: 'queued',
    }
  }

  async getResult(requestId: string): Promise<LandDeedResult> {
    return {
      requestId,
      status: 'succeeded',
      document: {
        titleDeedNumber: '12345',
        surveyPage: '6789',
        parcelNumber: '12',
        subdistrict: 'ตัวอย่าง',
        district: 'เมืองนครสวรรค์',
        province: 'นครสวรรค์',
        area: {
          rai: 10,
          ngan: 2,
          squareWa: 20,
        },
      },
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [100.123, 15.678],
            [100.124, 15.678],
            [100.124, 15.679],
            [100.123, 15.679],
            [100.123, 15.678],
          ],
        ],
      },
      confidence: {
        overall: 0.94,
        fields: {
          titleDeedNumber: 0.98,
          boundary: 0.91,
        },
      },
      warnings: [],
    }
  }
}
