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
    profile: { id: string }
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
      return fetch(`http://127.0.0.1:${address.port}${path}`, init)
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
  const response = await api.request('/api/v1/health')

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
  assert.equal((await api.repository.getAppData()).workflow.status, 'planting_recorded')
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
  assert.equal((await api.repository.getAppData()).workflow.status, 'planting_recorded')
})

test('rejected workflow exposes the correction step as current', async () => {
  const api = await startApi()
  const response = await api.request('/api/v1/workflow/mock-status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'rejected' }),
  })
  const body = await readJson<WorkflowResponse>(response)
  const workflow = await api.repository.getAppData()

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
  assert.equal((await api.repository.getAppData()).plots.length, 3)
})

test('planting mutation creates a record and advances workflow', async () => {
  const api = await startApi()
  await api.repository.setWorkflow('boundary_confirmed')

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
  assert.equal((await api.repository.getAppData()).plantingRecords.length, 2)
  assert.equal((await api.repository.getAppData()).workflow.status, 'planting_recorded')
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
