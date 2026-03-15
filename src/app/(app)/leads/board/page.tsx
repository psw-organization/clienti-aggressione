import Link from "next/link"

import { leadListFiltersSchema } from "@/lib/leads/lead-filters"
import { LeadBoard } from "@/components/leads/lead-board"
import { Button } from "@/components/ui/button"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Lead } from "@/types/index"

export default async function LeadsBoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const parsed = leadListFiltersSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    region: typeof raw.region === "string" ? raw.region : undefined,
    province: typeof raw.province === "string" ? raw.province : undefined,
    city: typeof raw.city === "string" ? raw.city : undefined,
    category: typeof raw.category === "string" ? raw.category : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    priority: typeof raw.priority === "string" ? raw.priority : undefined,
    ratingMin: typeof raw.ratingMin === "string" ? raw.ratingMin : undefined,
    reviewsMin: typeof raw.reviewsMin === "string" ? raw.reviewsMin : undefined,
    onlyNoWebsite: raw.onlyNoWebsite === "1" ? "1" : undefined,
    excludeChains: raw.excludeChains === "1" ? "1" : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
  })

  const f = parsed.success ? parsed.data : {}

  const orderBy =
    f.sort === "updated"
      ? "updatedAt"
      : f.sort === "score"
        ? "leadScore"
        : "createdAt"

  let leadsQuery = supabaseAdmin
    .from("Lead")
    .select(
      "id,businessName,city,province,region,address,category,rating,reviewsCount,hasOfficialWebsite,officialWebsiteUrl,phone,email,leadScore,priorityLevel,status,provider,updatedAt"
    )
    .order(orderBy, { ascending: false })
    .limit(200)

  if (f.q) {
    const q = `%${f.q}%`
    leadsQuery = leadsQuery.or(
      `businessName.ilike.${q},email.ilike.${q},phone.ilike.${q},officialWebsiteUrl.ilike.${q}`
    )
  }
  if (f.region) leadsQuery = leadsQuery.ilike("region", f.region)
  if (f.province) leadsQuery = leadsQuery.ilike("province", f.province)
  if (f.city) leadsQuery = leadsQuery.ilike("city", f.city)
  if (f.category) leadsQuery = leadsQuery.ilike("category", f.category)
  if (f.status) leadsQuery = leadsQuery.eq("status", f.status)
  if (f.priority) leadsQuery = leadsQuery.eq("priorityLevel", f.priority)
  if (typeof f.ratingMin === "number") leadsQuery = leadsQuery.gte("rating", f.ratingMin)
  if (typeof f.reviewsMin === "number") leadsQuery = leadsQuery.gte("reviewsCount", f.reviewsMin)
  if (f.onlyNoWebsite) leadsQuery = leadsQuery.eq("hasOfficialWebsite", false)
  if (f.excludeChains) leadsQuery = leadsQuery.eq("chainDetected", false)

  const { data: leads, error: leadsError } = await leadsQuery
  if (leadsError) {
    throw new Error(leadsError.message)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Lead</p>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Board</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/leads">Elenco lead</Link>
        </Button>
      </div>

      <LeadBoard leads={leads as unknown as Lead[]} />
    </div>
  )
}
