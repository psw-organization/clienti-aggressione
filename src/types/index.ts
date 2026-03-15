export type Lead = {
  id: string
  businessName: string
  city: string | null
  province: string | null
  region: string | null
  address: string | null // Added
  category: string | null
  rating: number | null
  reviewsCount: number | null
  hasOfficialWebsite: boolean
  officialWebsiteUrl: string | null // Added
  websiteUrl?: string | null // Alias for compatibility if needed, but officialWebsiteUrl is the DB field
  phone: string | null // Added
  email: string | null // Added
  leadScore: number
  priorityLevel: "low" | "medium" | "high"
  status: "new" | "reviewed" | "contacted" | "qualified" | "discarded"
  provider: string
  updatedAt: string | Date 
}
