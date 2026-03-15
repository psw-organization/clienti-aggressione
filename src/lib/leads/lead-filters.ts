import { z } from "zod"

export const leadListFiltersSchema = z.object({
  q: z.string().optional(),
  region: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["new", "reviewed", "contacted", "qualified", "discarded"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  ratingMin: z.coerce.number().min(0).max(5).optional(),
  reviewsMin: z.coerce.number().int().min(0).optional(),
  onlyNoWebsite: z.enum(["1"]).optional(),
  excludeChains: z.enum(["1"]).optional(),
  sort: z.enum(["score", "updated"]).optional(),
})

export type LeadListFilters = z.infer<typeof leadListFiltersSchema>
