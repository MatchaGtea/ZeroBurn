import 'dotenv/config'
import { createApp } from './app'

const port = Number(process.env.PORT ?? 4184)
const repositoryMode = process.env.REPOSITORY_MODE ?? 'memory'

async function main() {
  if (repositoryMode !== 'memory' && repositoryMode !== 'postgres') {
    throw new Error(`Unsupported REPOSITORY_MODE: ${repositoryMode}`)
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
