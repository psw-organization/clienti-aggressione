// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs") as typeof import("bcryptjs")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client")

const prisma = new PrismaClient()

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing env var: ${name}`)
  }
  return value
}

async function main() {
  const adminEmail = requiredEnv("ADMIN_EMAIL").toLowerCase()
  const adminPassword = requiredEnv("ADMIN_PASSWORD")

  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "admin" },
    create: { email: adminEmail, passwordHash, role: "admin" },
  })

  await prisma.providerConfig.upsert({
    where: { providerId: "mock" },
    update: { enabled: true, config: JSON.stringify({}) },
    create: { providerId: "mock", enabled: true, config: JSON.stringify({}) },
  })

  await prisma.providerConfig.upsert({
    where: { providerId: "google" },
    update: { enabled: true, config: JSON.stringify({}) },
    create: { providerId: "google", enabled: true, config: JSON.stringify({}) },
  })

  const defaultScoring = {
    points: {
      noOfficialWebsite: 40,
      ratingGte: { threshold: 4.3, points: 20 },
      reviewsGte: { threshold: 100, points: 20 },
      hasSocialNoWebsite: 10,
      sellableCategory: 10,
    },
    sellableCategories: ["pizzeria", "ristorante", "pub", "trattoria", "bistrot"],
    priority: {
      highGte: 70,
      mediumGte: 40,
    },
  }

  await prisma.scoringConfig.upsert({
    where: { key: "default" },
    update: { config: JSON.stringify(defaultScoring) },
    create: { key: "default", config: JSON.stringify(defaultScoring) },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    await prisma.$disconnect()
    throw err
  })
