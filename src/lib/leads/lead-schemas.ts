import { z } from "zod"

export const leadStatusSchema = z.enum([
  "new",
  "reviewed",
  "contacted",
  "qualified",
  "discarded",
])

export const leadUpsertSchema = z.object({
  businessName: z.string().min(2),
  category: z.string().trim().min(1).optional().or(z.literal("")),
  address: z.string().trim().min(1).optional().or(z.literal("")),
  city: z.string().trim().min(1).optional().or(z.literal("")),
  province: z.string().trim().min(1).optional().or(z.literal("")),
  region: z.string().trim().min(1).optional().or(z.literal("")),
  phone: z.string().trim().min(5).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewsCount: z.coerce.number().int().min(0).optional(),
  internalNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  status: leadStatusSchema.optional(),
})

export type LeadUpsertInput = z.infer<typeof leadUpsertSchema>
