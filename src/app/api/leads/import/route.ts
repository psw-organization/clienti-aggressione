import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { providerIdSchema } from "@/lib/providers/types"
import type { ProviderLead } from "@/lib/providers/types"
import { slugify, withSuffix } from "@/lib/slug"
import {
  normalizeAddress,
  normalizeDomain,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/leads/normalize"
import { classifyWebsite } from "@/lib/leads/website-detection"
import { buildDedupeKey, findPotentialDuplicate } from "@/lib/leads/dedupe"
import type { ScoringConfig } from "@/lib/leads/scoring"
import { scoreLead } from "@/lib/leads/scoring"

const providerLeadSchema = z.object({
  externalId: z.string().min(1),
  businessName: z.string().min(1),
  category: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  reviewsCount: z.number().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  instagramUrl: z.string().optional().nullable(),
  facebookUrl: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  chainDetected: z.boolean().optional().nullable(),
  isVerifiedActive: z.boolean().optional().nullable(),
  raw: z.record(z.unknown()).optional().nullable(),
})

const bodySchema = z.object({
  jobId: z.string().uuid().optional(),
  providerId: providerIdSchema.default("mock"),
  items: z.array(providerLeadSchema).min(1).max(200),
})

async function uniqueSlug(base: string) {
  let slug = base
  for (let i = 0; i < 4; i += 1) {
    const exists = await prisma.lead.findUnique({ where: { slug }, select: { id: true } })
    if (!exists) return slug
    slug = withSuffix(base)
  }
  return withSuffix(base)
}

function reviewsRange(reviewsCount: number | null | undefined) {
  if (!reviewsCount || reviewsCount <= 0) return "none" as const
  if (reviewsCount < 50) return "low" as const
  if (reviewsCount < 200) return "medium" as const
  return "high" as const
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  console.log("Import Payload:", JSON.stringify(json, null, 2)) // Debug log

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    console.error("Import Validation Error:", parsed.error)
    return NextResponse.json({ error: "Payload non valido", details: parsed.error }, { status: 400 })
  }

  const providerId = parsed.data.providerId
  const items = parsed.data.items as ProviderLead[]

  const [domains, scoringRow] = await Promise.all([
    prisma.blacklistDomain.findMany({ select: { domain: true } }),
    prisma.scoringConfig.findUnique({ where: { key: "default" }, select: { config: true } }),
  ])

  const blacklistDomains = domains.map((d: { domain: string }) => d.domain)
  const scoringCfgRaw = scoringRow?.config as unknown as string | undefined
  const scoringCfg = scoringCfgRaw ? JSON.parse(scoringCfgRaw) : undefined
  
  if (!scoringCfg) {
    return NextResponse.json({ error: "ScoringConfig mancante" }, { status: 500 })
  }

  let imported = 0
  let merged = 0

  for (const item of items) {
    const base = slugify(item.businessName)
    const slug = await uniqueSlug(base)

    const website = classifyWebsite(item.websiteUrl ?? null, blacklistDomains)
    const hasOfficialWebsite = website.presence === "official"

    const normalizedName = normalizeName(item.businessName)
    const normalizedAddress = normalizeAddress(item.address)
    const normalizedPhone = normalizePhone(item.phone)
    const normalizedEmail = normalizeEmail(item.email)
    const normalizedDomain = hasOfficialWebsite ? normalizeDomain(item.websiteUrl) : undefined

    const key = buildDedupeKey({
      businessName: item.businessName,
      city: item.city,
      address: item.address,
      phone: item.phone,
      email: item.email,
    })

    const existing = await findPotentialDuplicate(prisma as any, key)

    const scored = scoreLead(scoringCfg, {
      hasOfficialWebsite,
      rating: item.rating ?? null,
      reviewsCount: item.reviewsCount ?? null,
      instagramUrl: item.instagramUrl ?? null,
      facebookUrl: item.facebookUrl ?? null,
      category: item.category ?? null,
    })

    const data = {
      businessName: item.businessName.trim(),
      slug,
      category: item.category?.trim() || null,
      address: item.address?.trim() || null,
      city: item.city?.trim() || null,
      province: item.province?.trim() || null,
      region: item.region?.trim() || null,
      country: (item.country?.trim() || "IT") as string,
      latitude: typeof item.latitude === "number" ? item.latitude : null,
      longitude: typeof item.longitude === "number" ? item.longitude : null,
      phone: item.phone?.trim() || null,
      email: item.email?.trim().toLowerCase() || null,
      rating: typeof item.rating === "number" ? item.rating : null,
      reviewsCount: typeof item.reviewsCount === "number" ? Math.floor(item.reviewsCount) : null,
      reviewsRange: reviewsRange(item.reviewsCount),
      websitePresence: website.presence,
      hasOfficialWebsite,
      officialWebsiteUrl: hasOfficialWebsite ? (item.websiteUrl?.trim() || null) : null,
      instagramUrl: item.instagramUrl?.trim() || null,
      facebookUrl: item.facebookUrl?.trim() || null,
      sourceUrl: item.sourceUrl?.trim() || null,
      provider: providerId,
      providerRaw: JSON.stringify({ ...item.raw, externalId: item.externalId, jobId: parsed.data.jobId ?? null }),
      isVerifiedActive: item.isVerifiedActive ?? true,
      chainDetected: item.chainDetected ?? false,
      leadScore: scored.score,
      scoreReasons: JSON.stringify(scored.reasons),
      priorityLevel: scored.priorityLevel,
      normalizedName,
      normalizedAddress,
      normalizedPhone,
      normalizedEmail,
      normalizedDomain,
    }

    if (existing?.id) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          businessName: data.businessName,
          category: existing.category ?? data.category,
          address: existing.address ?? data.address,
          city: existing.city ?? data.city,
          province: existing.province ?? data.province,
          region: existing.region ?? data.region,
          country: existing.country ?? data.country,
          latitude: existing.latitude ?? (data.latitude as any),
          longitude: existing.longitude ?? (data.longitude as any),
          phone: existing.phone ?? data.phone,
          email: existing.email ?? data.email,
          rating: existing.rating ?? data.rating,
          reviewsCount: existing.reviewsCount ?? data.reviewsCount,
          reviewsRange: existing.reviewsRange ?? data.reviewsRange,
          websitePresence: data.websitePresence,
          hasOfficialWebsite: data.hasOfficialWebsite,
          officialWebsiteUrl: data.officialWebsiteUrl,
          instagramUrl: existing.instagramUrl ?? data.instagramUrl,
          facebookUrl: existing.facebookUrl ?? data.facebookUrl,
          sourceUrl: existing.sourceUrl ?? data.sourceUrl,
          providerRaw: data.providerRaw,
          chainDetected: existing.chainDetected || data.chainDetected,
          isVerifiedActive: existing.isVerifiedActive && data.isVerifiedActive,
          leadScore: data.leadScore,
          scoreReasons: data.scoreReasons,
          priorityLevel: data.priorityLevel,
          normalizedName: existing.normalizedName ?? data.normalizedName,
          normalizedAddress: existing.normalizedAddress ?? data.normalizedAddress,
          normalizedPhone: existing.normalizedPhone ?? data.normalizedPhone,
          normalizedEmail: existing.normalizedEmail ?? data.normalizedEmail,
          normalizedDomain: existing.normalizedDomain ?? data.normalizedDomain,
        },
      })

      // LeadSource creation removed as schema expects sourceUrl/type, not providerId/payload.
      // Provider raw data is already tracked in Lead.providerRaw.
      merged += 1
      continue
    }

    const created = await prisma.lead.create({ data: data as any, select: { id: true } })
    // LeadSource creation similarly removed here.
    imported += 1
  }

  return NextResponse.json({ imported, merged })
}
