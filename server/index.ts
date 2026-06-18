import 'dotenv/config'
import { createApp } from './app'

const port = Number(process.env.PORT ?? 4184)
const repositoryMode = process.env.REPOSITORY_MODE ?? 'memory'

async function main() {
  if (repositoryMode !== 'memory' && repositoryMode !== 'postgres') {
    throw new Error(`Unsupported REPOSITORY_MODE: ${repositoryMode}`)
  }

  const authMode = process.env.AUTH_MODE ?? 'mock'
  if (authMode !== 'mock' && authMode !== 'supabase') {
    throw new Error(`Unsupported AUTH_MODE: ${authMode}`)
  }
  if (authMode === 'supabase') {
    if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is required when AUTH_MODE=supabase')
    if (!process.env.SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY is required when AUTH_MODE=supabase')
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required when AUTH_MODE=supabase')
  }

  const storageMode = process.env.STORAGE_MODE ?? 'mock'
  if (storageMode !== 'mock' && storageMode !== 'supabase') {
    throw new Error(`Unsupported STORAGE_MODE: ${storageMode}`)
  }
  if (storageMode === 'supabase') {
    if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is required when STORAGE_MODE=supabase')
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required when STORAGE_MODE=supabase')
  }

  const landDeedAdapterMode = process.env.LAND_DEED_ADAPTER_MODE ?? 'mock'
  if (landDeedAdapterMode !== 'mock' && landDeedAdapterMode !== 'http') {
    throw new Error(`Unsupported LAND_DEED_ADAPTER_MODE: ${landDeedAdapterMode}`)
  }
  if (landDeedAdapterMode === 'http') {
    if (!process.env.LAND_DEED_API_URL) throw new Error('LAND_DEED_API_URL is required when LAND_DEED_ADAPTER_MODE=http')
    if (!process.env.LAND_DEED_API_KEY) throw new Error('LAND_DEED_API_KEY is required when LAND_DEED_ADAPTER_MODE=http')
  }

  let disconnect = async () => {}
  let repository

  if (repositoryMode === 'postgres') {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is required when REPOSITORY_MODE=postgres')
    }

    const [{ createPrismaClient }, { PrismaRepository }] = await Promise.all([
      import('./prismaClient'),
      import('./prismaRepository'),
    ])
    const prisma = createPrismaClient(connectionString)
    repository = new PrismaRepository(prisma)
    disconnect = () => prisma.$disconnect()
  }

  const app = createApp({
    repository,
    repositoryMode,
  })
  const server = app.listen(port, () => {
    console.log(`ZeroBurn Farmer API running at http://localhost:${port}/api/v1 (${repositoryMode})`)
  })

  let shuttingDown = false
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`Received ${signal}, shutting down`)
    server.close(async (error) => {
      try {
        await disconnect()
      } finally {
        if (error) {
          console.error(error)
          process.exitCode = 1
        }
      }
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
