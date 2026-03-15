import Link from "next/link"

import { leadListFiltersSchema } from "@/lib/leads/lead-filters"
import { createLeadAction, deleteLeadAction, updateLeadStatusAction } from "@/app/(app)/leads/actions"
import { Badge } from "@/components/ui/badge"
import { Users, PlusCircle, AlertTriangle, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProviderSearch } from "@/components/leads/provider-search"

import { providers as availableProviders } from "@/lib/providers/registry"
import { supabaseAdmin } from "@/lib/supabase/admin"

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  type LeadRow = {
    id: string
    businessName: string
    city: string | null
    province: string | null
    region: string | null
    category: string | null
    rating: number | null
    reviewsCount: number | null
    hasOfficialWebsite: boolean
    leadScore: number
    priorityLevel: "low" | "medium" | "high"
    status: "new" | "reviewed" | "contacted" | "qualified" | "discarded"
    provider: string
    updatedAt: Date
  }
  const raw = await searchParams
  const parsed = leadListFiltersSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    region: typeof raw.region === "string" ? raw.region : undefined,
    province: typeof raw.province === "string" ? raw.province : undefined,
    city: typeof raw.city === "string" ? raw.city : undefined,
    category: typeof raw.category === "string" ? raw.category : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
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
      "id,businessName,city,province,region,category,rating,reviewsCount,hasOfficialWebsite,leadScore,priorityLevel,status,provider,updatedAt"
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
  if (typeof f.ratingMin === "number") leadsQuery = leadsQuery.gte("rating", f.ratingMin)
  if (typeof f.reviewsMin === "number") leadsQuery = leadsQuery.gte("reviewsCount", f.reviewsMin)
  if (f.onlyNoWebsite) leadsQuery = leadsQuery.eq("hasOfficialWebsite", false)
  if (f.excludeChains) leadsQuery = leadsQuery.eq("chainDetected", false)

  const { data: leads, error: leadsError } = await leadsQuery
  if (leadsError) {
    throw new Error(leadsError.message)
  }

  const [kpiTotalRes, kpiNewRes, kpiHighRes, kpiNoSiteRes] = await Promise.all([
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }).eq("priorityLevel", "high"),
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }).eq("hasOfficialWebsite", false),
  ])

  const kpiTotal = kpiTotalRes.count ?? 0
  const kpiNew = kpiNewRes.count ?? 0
  const kpiHigh = kpiHighRes.count ?? 0
  const kpiNoSite = kpiNoSiteRes.count ?? 0

  const { data: providerConfigs, error: providerConfigsError } = await supabaseAdmin
    .from("ProviderConfig")
    .select("providerId,enabled")

  if (providerConfigsError) {
    throw new Error(providerConfigsError.message)
  }

  const providerOptions = Object.values(availableProviders).map((p) => {
    const cfg = (providerConfigs as { providerId: string; enabled: boolean }[] | null)?.find(
      (c: { providerId: string; enabled: boolean }) => c.providerId === p.id
    )
    return {
      providerId: p.id,
      name: p.name,
      enabled: cfg ? cfg.enabled : true,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Dashboard</div>
          <h1 className="text-xl font-semibold">Lead</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/settings">Settings</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{kpiTotal}</CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuovi</CardTitle>
            <PlusCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{kpiNew}</CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta priorità</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{kpiHigh}</CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Senza sito</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{kpiNoSite}</CardContent>
        </Card>
      </div>

      <ProviderSearch providers={providerOptions} />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-6" method="get">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="q">Ricerca</Label>
              <Input id="q" name="q" defaultValue={f.q ?? ""} placeholder="Nome, email, telefono…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Regione</Label>
              <Input id="region" name="region" defaultValue={f.region ?? ""} placeholder="Campania" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input id="province" name="province" defaultValue={f.province ?? ""} placeholder="NA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Città</Label>
              <Input id="city" name="city" defaultValue={f.city ?? ""} placeholder="Napoli" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" name="category" defaultValue={f.category ?? ""} placeholder="pizzeria" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ratingMin">Rating min</Label>
              <Input id="ratingMin" name="ratingMin" defaultValue={typeof f.ratingMin === "number" ? String(f.ratingMin) : ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewsMin">Recensioni min</Label>
              <Input id="reviewsMin" name="reviewsMin" defaultValue={typeof f.reviewsMin === "number" ? String(f.reviewsMin) : ""} />
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="onlyNoWebsite" value="1" defaultChecked={f.onlyNoWebsite === "1"} />
                Solo senza sito
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="excludeChains" value="1" defaultChecked={f.excludeChains === "1"} />
                Escludi catene
              </label>
            </div>
            <div className="flex items-end justify-end gap-2 md:col-span-6">
              <Button type="submit" variant="secondary">
                Applica
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/leads">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1 glass-card">
          <CardHeader>
            <CardTitle>Nuovo lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLeadAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nome attività</Label>
                <Input id="businessName" name="businessName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cityNew">Città</Label>
                <Input id="cityNew" name="city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNew">Telefono</Label>
                <Input id="phoneNew" name="phone" />
              </div>
              <Button type="submit" className="w-full">
                Crea
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 glass-card">
          <CardHeader>
            <CardTitle>Lista lead</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Score</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Località</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Sito</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Aggiornamento</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((leads ?? []) as unknown as LeadRow[]).map((l) => (
                  <TableRow key={l.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={l.leadScore >= 70 ? "success" : "default"}>{l.leadScore}</Badge>
                        <span className="text-xs text-muted-foreground">{l.priorityLevel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/leads/${l.id}`}>
                        {l.businessName}
                      </Link>
                      <div className="text-xs text-muted-foreground">{l.provider}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[l.city, l.province, l.region].filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.category ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.rating ? `${l.rating} (${l.reviewsCount})` : "—"}
                    </TableCell>
                    <TableCell>
                      {l.hasOfficialWebsite ? <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Sì</Badge> : <Badge variant="danger">No</Badge>}
                    </TableCell>
                    <TableCell>
                      <form action={updateLeadStatusAction.bind(null, l.id)}>
                        <select
                          name="status"
                          defaultValue={l.status}
                          className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-ring"
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                        >
                          <option value="new">Nuovo</option>
                          <option value="reviewed">Verificato</option>
                          <option value="contacted">Contattato</option>
                          <option value="qualified">Qualificato</option>
                          <option value="discarded">Scartato</option>
                        </select>
                      </form>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(l.updatedAt).toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell>
                      <form action={deleteLeadAction.bind(null, l.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Elimina
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
                {(leads ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      Nessun lead trovato.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
