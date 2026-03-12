import { z } from "zod"

export const providerIdSchema = z.enum(["mock", "google", "serpapi", "parsehub"])
export type ProviderId = z.infer<typeof providerIdSchema>

export const providerSearchSchema = z.object({
  providerId: providerIdSchema.default("mock"),
  region: z.string().trim().min(1).optional(),
  province: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  ratingMin: z.number().min(0).max(5).optional(),
  reviewsMin: z.number().int().min(0).optional(),
  onlyNoWebsite: z.boolean().optional(),
  excludeChains: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional().default(30),
})

export type ProviderSearchQuery = z.infer<typeof providerSearchSchema>

export type ProviderLead = {
  externalId: string
  businessName: string
  category?: string
  address?: string
  city?: string
  province?: string
  region?: string
  country?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  rating?: number
  reviewsCount?: number
  websiteUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  sourceUrl?: string
  chainDetected?: boolean
  isVerifiedActive?: boolean
  raw?: Record<string, unknown>
}

export type ProviderSearchResponse = {
  jobId: string
  items: ProviderLead[]
}
