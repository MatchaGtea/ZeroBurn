import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
})

const farmerData = {
  ownerName: 'สมชาย ใจดี',
  phone: '08X-XXX-XXXX',
  farmName: 'Somchai Farm',
  province: 'นครสวรรค์',
  district: 'ตาคลี',
  address: 'หมู่ 4 ตาคลี นครสวรรค์',
  consent: true,
  workflowStatus: 'planting_recorded' as const,
}

const plots = [
  {
    id: 'plot-a',
    name: 'แปลง A',
    cropType: 'อ้อย',
    cropVariety: 'Khon Kaen 3',
    areaRai: 12,
    province: 'นครสวรรค์',
    district: 'ตาคลี',
    gps: '15.2762, 100.1344',
    status: 'verified' as const,
    riskLevel: 'low',
  },
  {
    id: 'plot-b',
    name: 'แปลง B',
    cropType: 'อ้อย',
    cropVariety: 'LK92-11',
    areaRai: 8,
    province: 'นครสวรรค์',
    district: 'ตาคลี',
    gps: '15.2827, 100.1210',
    status: 'pending' as const,
    riskLevel: 'medium',
  },
  {
    id: 'plot-c',
    name: 'แปลง C',
    cropType: 'อ้อย',
    cropVariety: 'K88-92',
    areaRai: 15,
    province: 'นครสวรรค์',
    district: 'ตาคลี',
    gps: '15.2709, 100.1518',
    status: 'flagged' as const,
    riskLevel: 'high',
  },
]

async function main() {
  const farmer = await prisma.farmerProfile.upsert({
    where: { id: 'farmer-somchai' },
    update: farmerData,
    create: {
      id: 'farmer-somchai',
      ...farmerData,
    },
  })

  for (const plot of plots) {
    const { id, ...plotData } = plot

    await prisma.plot.upsert({
      where: { id },
      update: {
        farmerId: farmer.id,
        ...plotData,
      },
      create: {
        id,
        farmerId: farmer.id,
        ...plotData,
      },
    })
  }

  const plantingRecord = await prisma.plantingRecord.upsert({
    where: { id: 'PLR-001' },
    update: {
      plotId: 'plot-a',
      season: '2025/26',
      plantingDate: new Date('2025-06-12T00:00:00.000Z'),
      cropType: 'อ้อย',
      cropVariety: 'Khon Kaen 3',
      notes: 'ปลูกตามร่องเดิม',
      status: 'complete',
    },
    create: {
      id: 'PLR-001',
      plotId: 'plot-a',
      season: '2025/26',
      plantingDate: new Date('2025-06-12T00:00:00.000Z'),
      cropType: 'อ้อย',
      cropVariety: 'Khon Kaen 3',
      notes: 'ปลูกตามร่องเดิม',
      status: 'complete',
    },
  })

  const harvestRecord = await prisma.harvestRecord.upsert({
    where: { id: 'HAR-001' },
    update: {
      plotId: plantingRecord.plotId,
      season: '2025/26',
      harvestDate: new Date('2026-03-15T00:00:00.000Z'),
      quantity: 35,
      unit: 'ton',
      traceabilityId: 'ZB-2026-001',
      notes: 'ไม่มีการเผา',
      status: 'linked',
    },
    create: {
      id: 'HAR-001',
      plotId: plantingRecord.plotId,
      season: '2025/26',
      harvestDate: new Date('2026-03-15T00:00:00.000Z'),
      quantity: 35,
      unit: 'ton',
      traceabilityId: 'ZB-2026-001',
      notes: 'ไม่มีการเผา',
      status: 'linked',
    },
  })

  const verification = await prisma.verification.upsert({
    where: { id: 'VER-001' },
    update: {
      plotId: harvestRecord.plotId,
      harvestRecordId: harvestRecord.id,
      status: 'approved',
      riskLevel: 'low',
      issueSummary: 'ไม่พบสัญญาณเผา',
      resultNotes: 'ผ่าน Zero-Burn',
      detectionSource: 'mock_adapter',
      checkedAt: new Date('2026-03-18T00:00:00.000Z'),
    },
    create: {
      id: 'VER-001',
      plotId: harvestRecord.plotId,
      harvestRecordId: harvestRecord.id,
      status: 'approved',
      riskLevel: 'low',
      issueSummary: 'ไม่พบสัญญาณเผา',
      resultNotes: 'ผ่าน Zero-Burn',
      detectionSource: 'mock_adapter',
      checkedAt: new Date('2026-03-18T00:00:00.000Z'),
    },
  })

  const tokenLot = await prisma.carbonTokenLot.upsert({
    where: { id: 'ZBT-2026-001' },
    update: {
      plotId: harvestRecord.plotId,
      harvestRecordId: harvestRecord.id,
      verificationId: verification.id,
      tokenAmount: 180,
      carbonSavedKg: 1200,
      status: 'available',
      traceabilityId: 'ZB-2026-001',
    },
    create: {
      id: 'ZBT-2026-001',
      plotId: harvestRecord.plotId,
      harvestRecordId: harvestRecord.id,
      verificationId: verification.id,
      tokenAmount: 180,
      carbonSavedKg: 1200,
      status: 'available',
      traceabilityId: 'ZB-2026-001',
    },
  })

  await prisma.marketplaceListing.upsert({
    where: { id: 'MKT-001' },
    update: {
      plotId: harvestRecord.plotId,
      harvestRecordId: harvestRecord.id,
      tokenLotId: tokenLot.id,
      productName: 'อ้อยสดคุณภาพ',
      quantity: 35,
      unit: 'ton',
      price: 2400,
      buyerVisibility: 'public',
      status: 'pending_approval',
    },
    create: {
      id: 'MKT-001',
      plotId: harvestRecord.plotId,
      harvestRecordId: harvestRecord.id,
      tokenLotId: tokenLot.id,
      productName: 'อ้อยสดคุณภาพ',
      quantity: 35,
      unit: 'ton',
      price: 2400,
      buyerVisibility: 'public',
      status: 'pending_approval',
    },
  })

  await prisma.workflowEvent.upsert({
    where: { id: 'WFE-SOMCHAI-PLANTING-RECORDED' },
    update: {
      farmerId: farmer.id,
      status: 'planting_recorded',
      label: 'เริ่มต้นข้อมูลตัวอย่าง Somchai Farm',
      metadata: { source: 'seed' },
    },
    create: {
      id: 'WFE-SOMCHAI-PLANTING-RECORDED',
      farmerId: farmer.id,
      status: 'planting_recorded',
      label: 'เริ่มต้นข้อมูลตัวอย่าง Somchai Farm',
      metadata: { source: 'seed' },
    },
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
