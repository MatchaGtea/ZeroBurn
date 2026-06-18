import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

export function createPrismaClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg(connectionString),
  })
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>
