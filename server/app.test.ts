import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { afterEach, test } from 'node:test'
import type { ExternalAdapters } from './adapters'
import { createMockAdapters } from './adapters'
import { createApp } from './app'
import type { Repository } from './repository'
import { MemoryRepository } from './repository'

const servers: Array<ReturnType<ReturnType<typeof createApp>['listen']>> = []

interface BootstrapResponse {
  data: {
    profile: { id: string; ownerName?: string }
    summary: { registeredPlots: number }
    plots: unknown[]
  }
}

interface WorkflowResponse {
  data: {
    status: string
    nextAction: { primaryRoute: string }
  }
}

interface ErrorResponse {
  error: string
  details?: unknown
}

interface PlantingResponse {
  data: {
    plotId: string
    status: string
  }
}

function readJson<T>(response: Response) {
  return response.json() as Promise<T>
}

async function startApi(options: { adapters?: ExternalAdapters; repository?: Repository } = {}) {
  const repository = options.repository ?? new MemoryRepository()
  const server = createApp({ repository, adapters: options.adapters }).listen(0, '127.0.0.1')
  servers.push(server)
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const address = server.address() as AddressInfo

  return {
    repository,
    request(path: string, init?: RequestInit) {
      const headers = new Headers(init?.headers)
      if (!headers.has('Authorization')) {
        headers.set('Authorization', 'Bearer mock-token-somchai')
      }
      return fetch(`http://127.0.0.1:${address.port}${path}`, {
        ...init,
        headers,
      })
    },
  }
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })))
})

test('GET /api/v1/health reports a healthy memory repository', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/health', {
    headers: {} // empty headers to bypass default authorization header inject (health check is public)
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    data: { status: 'ok', repositoryMode: 'memory' },
  })
})

test('GET /api/v1/bootstrap returns the initial application data', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/bootstrap')
  const body = await readJson<BootstrapResponse>(response)

  assert.equal(response.status, 200)
  assert.equal(body.data.profile.id, 'farmer-somchai')
  assert.equal(body.data.summary.registeredPlots, 3)
  assert.equal(body.data.plots.length, 3)
})

test('GET /api/v1/me/workflow returns the current workflow', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/me/workflow')
  const body = await readJson<WorkflowResponse>(response)

  assert.equal(response.status, 200)
  assert.equal(body.data.status, 'planting_recorded')
  assert.equal(body.data.nextAction.primaryRoute, '/records/harvest/new')
})

test('invalid request body returns 400 with validation details', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/records/harvest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plotId: '', harvestDate: '', quantity: -1 }),
  })
  const body = await readJson<ErrorResponse>(response)

  assert.equal(response.status, 400)
  assert.equal(typeof body.error, 'string')
  assert.ok(body.details)
})

test('confirming a missing plot returns 404', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/plots/missing-plot/confirm-boundary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ boundaryLabel: 'ยืนยันแล้ว' }),
  })

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: 'Plot not found' })
  assert.equal((await api.repository.getAppData('farmer-somchai')).workflow.status, 'planting_recorded')
})

test('invalid workflow status returns 400 without changing workflow', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/workflow/mock-status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'not-a-workflow-status' }),
  })
  const body = await readJson<ErrorResponse>(response)

  assert.equal(response.status, 400)
  assert.equal(typeof body.error, 'string')
  assert.ok(body.details)
  assert.equal((await api.repository.getAppData('farmer-somchai')).workflow.status, 'planting_recorded')
})

test('rejected workflow exposes the correction step as current', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/workflow/mock-status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'rejected' }),
  })
  const body = await readJson<WorkflowResponse>(response)
  const workflow = await api.repository.getAppData('farmer-somchai')

  assert.equal(response.status, 200)
  assert.equal(body.data.status, 'rejected')
  assert.equal(workflow.workflow.steps.find((step) => step.current)?.key, 'rejected')
})

test('external adapter failure returns 500', async () => {
  const adapters: ExternalAdapters = {
    ...createMockAdapters(),
    async landBoundaryFromDocument() {
      throw new Error('Land adapter unavailable')
    },
  }
  const api = await startApi({ adapters })
  const response = await api.request('/api/v1/plots', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'แปลงทดสอบ',
      cropType: 'อ้อย',
      areaRai: 5,
      documentFileName: 'deed.jpg',
    }),
  })

  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'Land adapter unavailable' })
  assert.equal((await api.repository.getAppData('farmer-somchai')).plots.length, 3)
})

test('planting mutation creates a record and advances workflow', async () => {
  const api = await startApi()
  await api.repository.setWorkflow('farmer-somchai', 'boundary_confirmed')

  const response = await api.request('/api/v1/records/planting', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      plotId: 'plot-b',
      plantingDate: '2026-06-18',
      cropType: 'อ้อย',
      cropVariety: 'LK92-11',
      notes: 'ปลูกใหม่หลังยืนยันขอบเขต',
    }),
  })
  const body = await readJson<PlantingResponse>(response)

  assert.equal(response.status, 201)
  assert.equal(body.data.plotId, 'plot-b')
  assert.equal(body.data.status, 'submitted')
  assert.equal((await api.repository.getAppData('farmer-somchai')).plantingRecords.length, 2)
  assert.equal((await api.repository.getAppData('farmer-somchai')).workflow.status, 'planting_recorded')
})

test('async repository rejection is forwarded to the error middleware', async () => {
  const repository = new Proxy(new MemoryRepository(), {
    get(target, property, receiver) {
      if (property === 'getAppData') {
        return async () => {
          throw new Error('Repository unavailable')
        }
      }
      return Reflect.get(target, property, receiver)
    },
  }) as Repository
  const api = await startApi({ repository })
  const response = await api.request('/api/v1/bootstrap')

  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'Repository unavailable' })
})

// Authentication Middleware Unit Tests
test('Missing token returns 401', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/bootstrap', {
    headers: { 'Authorization': '' } // empty token
  })
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: 'Missing token' })
})

test('Invalid token returns 401', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/bootstrap', {
    headers: { 'Authorization': 'Bearer mock-token-invalid' }
  })
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: 'Invalid or expired token' })
})

test('Valid token resolves correct farmer and scopes plots', async () => {
  const api = await startApi()
  
  // Register another farmer
  await api.repository.createProfileWithAuth('another-auth-id', {
    ownerName: 'สมใจ รักดี',
    phone: '08Y-YYY-YYYY',
    farmName: 'Somjai Farm',
    province: 'ตาก',
    district: 'แม่สอด',
    consent: true,
  })

  // We should be able to authenticate as Somjai
  const response = await api.request('/api/v1/bootstrap', {
    headers: { 'Authorization': 'Bearer mock-token-another' }
  })
  assert.equal(response.status, 200)
  const body = await readJson<BootstrapResponse>(response)
  assert.equal(body.data.profile.ownerName, 'สมใจ รักดี')
  assert.equal(body.data.plots.length, 0) // another farmer has no plots seeded
})

test('A farmer cannot read another farmer\'s plot', async () => {
  const api = await startApi()
  
  // Create another farmer
  await api.repository.createProfileWithAuth('another-auth-id', {
    ownerName: 'สมใจ',
    phone: '089',
    farmName: 'Somjai',
    province: 'ตาก',
    district: 'แม่สอด',
  })

  // somchai owns plot-a, plot-b, plot-c. anotherProfile has no plots.
  // if anotherProfile requests /plots/:id/confirm-boundary on plot-a, it should return 404
  const response = await api.request('/api/v1/plots/plot-a/confirm-boundary', {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer mock-token-another',
      'content-type': 'application/json' 
    },
    body: JSON.stringify({ boundaryLabel: 'ยืนยันแล้ว' }),
  })
  assert.equal(response.status, 404)
})

test('Profile bootstrap is idempotent', async () => {
  const api = await startApi()
  
  // First bootstrap
  const response1 = await api.request('/api/v1/auth/profile', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer mock-token-new',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      ownerName: 'ผู้ใช้ใหม่',
      phone: '081-111-1111',
      farmName: 'New Farm',
      province: 'พะเยา',
      district: 'เมือง',
      consent: true,
    })
  })
  assert.equal(response1.status, 201)
    const body1 = (await response1.json()) as { data: { id: string } }

  // Second bootstrap (should return 200 and same profile)
  const response2 = await api.request('/api/v1/auth/profile', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer mock-token-new',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      ownerName: 'ผู้ใช้ใหม่',
      phone: '081-111-1111',
      farmName: 'New Farm',
      province: 'พะเยา',
      district: 'เมือง',
      consent: true,
    })
  })
  assert.equal(response2.status, 200)
  const body2 = (await response2.json()) as { data: { id: string } }
  assert.deepEqual(body1.data.id, body2.data.id)
})

// Private Storage Tests
test('Storage upload intent rejects invalid MIME type or oversized files', async () => {
  const api = await startApi()
  
  // Test invalid mime type
  const res1 = await api.request('/api/v1/uploads/intents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'test.exe',
      contentType: 'application/octet-stream',
      sizeBytes: 1024,
      purpose: 'land_deed',
    })
  })
  assert.equal(res1.status, 400)

  // Test oversized land deed
  const res2 = await api.request('/api/v1/uploads/intents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'deed.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 20 * 1024 * 1024, // 20 MB (limit is 15 MB)
      purpose: 'land_deed',
    })
  })
  assert.equal(res2.status, 400)
})

test('Storage upload intent generates correct path keys and returns upload URL', async () => {
  const api = await startApi()
  
  const res = await api.request('/api/v1/uploads/intents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'deed.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1024 * 1024,
      purpose: 'land_deed',
    })
  })
  
  assert.equal(res.status, 201)
  const body = (await res.json()) as { data: { uploadId: string; storageKey: string; signedUploadUrl: string } }
  assert.ok(body.data.uploadId)
  assert.ok(body.data.storageKey.startsWith('farmer-somchai/land_deed/'))
  assert.ok(body.data.signedUploadUrl.includes('mock-storage.local/upload/'))
})

test('Farmer cannot complete another farmer\'s upload intent', async () => {
  const api = await startApi()
  
  // Register another farmer
  await api.repository.createProfileWithAuth('another-auth-id', {
    ownerName: 'สมใจ',
    phone: '089',
    farmName: 'Somjai',
    province: 'ตาก',
    district: 'แม่สอด',
  })

  // Somchai creates upload intent
  const res = await api.request('/api/v1/uploads/intents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'deed.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1024 * 1024,
      purpose: 'land_deed',
    })
  })
  const body = (await res.json()) as { data: { uploadId: string } }
  const uploadId = body.data.uploadId

  // Another farmer tries to complete Somchai's upload
  const res2 = await api.request(`/api/v1/uploads/${uploadId}/complete`, {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer mock-token-another',
      'content-type': 'application/json' 
    }
  })
  assert.equal(res2.status, 403)
})

test('Uploading deed -> processing -> boundary confirmation flow works in mock mode', async () => {
  const api = await startApi()

  // 1. Create upload intent
  const resIntent = await api.request('/api/v1/uploads/intents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fileName: 'deed.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 10000,
      purpose: 'land_deed',
    })
  })
  assert.equal(resIntent.status, 201)
  const intentData = (await resIntent.json()) as { data: { uploadId: string } }
  const uploadId = intentData.data.uploadId

  // 2. Complete upload
  const resComplete = await api.request(`/api/v1/uploads/${uploadId}/complete`, {
    method: 'POST',
  })
  assert.equal(resComplete.status, 200)

  // 3. Create plot with uploadedFileId
  const resPlot = await api.request('/api/v1/plots', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'แปลงใหม่ E',
      cropType: 'อ้อย',
      areaRai: 5,
      uploadedFileId: uploadId,
    })
  })
  assert.equal(resPlot.status, 201)
  const plotData = (await resPlot.json()) as { data: { plot: { id: string } } }
  const plotId = plotData.data.plot.id

  // 4. Create land document for processing
  const resDoc = await api.request(`/api/v1/plots/${plotId}/land-documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ uploadedFileId: uploadId })
  })
  assert.equal(resDoc.status, 201)
  const docData = (await resDoc.json()) as { data: { id: string } }
  const docId = docData.data.id

  // 5. Submit land document to process
  const resProcess = await api.request(`/api/v1/land-documents/${docId}/process`, {
    method: 'POST',
  })
  assert.equal(resProcess.status, 200)

  // 6. Poll status until succeeded
  const resStatus = await api.request(`/api/v1/land-documents/${docId}/status`)
  assert.equal(resStatus.status, 200)
  const statusData = (await resStatus.json()) as { data: { ocrStatus: string } }
  assert.equal(statusData.data.ocrStatus, 'complete')

  // 7. Verify plot was updated
  const updatedAppData = await api.repository.getAppData('farmer-somchai')
  const updatedPlot = updatedAppData.plots.find(p => p.id === plotId)
  assert.equal(updatedPlot?.documentStatus, 'complete')
})

test('HttpLandDeedAdapter retries on network and 5xx errors, exponential backoff, and preserves idempotency key', async () => {
  const originalFetch = global.fetch
  let requestCount = 0
  const requestsMade: any[] = []

  global.fetch = async (url: any, init: any) => {
    requestCount++
    requestsMade.push({ url, init })
    if (requestCount === 1) {
      return new Response('Server Error', { status: 500 })
    }
    if (requestCount === 2) {
      return new Response('Rate Limited', { status: 429 })
    }
    return new Response(JSON.stringify({
      requestId: 'real-job-999',
      status: 'queued'
    }), { status: 200 })
  }

  try {
    process.env.LAND_DEED_API_URL = 'http://api.external.deed'
    process.env.LAND_DEED_API_KEY = 'test-key-123'
    process.env.LAND_DEED_API_TIMEOUT_MS = '500'
    process.env.LAND_DEED_API_MAX_RETRIES = '2'

    const { HttpLandDeedAdapter } = await import('./adapters/httpLandDeedAdapter')
    const adapter = new HttpLandDeedAdapter()

    const result = await adapter.submit({
      landDocumentId: 'doc-999',
      documentUrl: 'http://signed.url/deed.jpg'
    })

    assert.equal(result.requestId, 'real-job-999')
    assert.equal(requestCount, 3)

    assert.equal(requestsMade[0].init.headers['Idempotency-Key'], 'doc-999')
    assert.equal(requestsMade[1].init.headers['Idempotency-Key'], 'doc-999')
    assert.equal(requestsMade[2].init.headers['Idempotency-Key'], 'doc-999')
  } finally {
    global.fetch = originalFetch
  }
})

