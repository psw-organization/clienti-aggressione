import { normalizeAddress, normalizeEmail, normalizeName, normalizePhone } from "@/lib/leads/normalize"

export type DedupeKey = {
  normalizedName?: string
  normalizedCity?: string
  normalizedAddress?: string
  normalizedPhone?: string
  normalizedEmail?: string
}

export function buildDedupeKey(input: {
  businessName?: string | null
  city?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
}): DedupeKey {
  return {
    normalizedName: normalizeName(input.businessName),
    normalizedCity: normalizeName(input.city),
    normalizedAddress: normalizeAddress(input.address),
    normalizedPhone: normalizePhone(input.phone),
    normalizedEmail: normalizeEmail(input.email),
  }
}

type PrismaLike = {
  lead: {
    findFirst: (args: unknown) => Promise<any>
  }
}

export async function findPotentialDuplicate(prisma: PrismaLike, key: DedupeKey): Promise<any | null> {
  const or: { [k: string]: unknown }[] = []
  if (key.normalizedPhone) or.push({ normalizedPhone: key.normalizedPhone })
  if (key.normalizedEmail) or.push({ normalizedEmail: key.normalizedEmail })
  if (key.normalizedName && key.normalizedCity) {
    or.push({
      AND: [{ normalizedName: key.normalizedName }, { city: { equals: key.normalizedCity, mode: "insensitive" } }],
    })
  }

  if (or.length === 0) return null

  return prisma.lead.findFirst({ where: { OR: or as any[] }, orderBy: { updatedAt: "desc" } })
}
