import Link from "next/link"
import { Users, TrendingUp, Globe2, Star, CheckCircle2, Search, RotateCcw, Trash2, ExternalLink } from "lucide-react"

import { leadListFiltersSchema } from "@/lib/leads/lead-filters"
import { deleteLeadAction, updateLeadStatusAction } from "@/app/(app)/leads/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusSelect } from "@/components/leads/status-select"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Lead } from "@/types/index"

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70 ? "score-high" : score >= 40 ? "score-medium" : "score-low"
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${cls}`}>
      {score}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    new:       { label: "Nuovo",      cls: "status-new" },
    reviewed:  { label: "Verificato", cls: "status-reviewed" },
    contacted: { label: "Contattato", cls: "status-contacted" },
    qualified: { label: "Qualificato",cls: "status-qualified" },
    discarded: { label: "Scartato",   cls: "status-discarded" },
  }
  const s = map[status] ?? { label: status, cls: "" }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const parsed = leadListFiltersSchema.safeParse({
    q:            typeof raw.q === "string" ? raw.q : undefined,
    region:       typeof raw.region === "string" ? raw.region : undefined,
    province:     typeof raw.province === "string" ? raw.province : undefined,
    city:         typeof raw.city === "string" ? raw.city : undefined,
    category:     typeof raw.category === "string" ? raw.category : undefined,
    status:       typeof raw.status === "string" ? raw.status : undefined,
    priority:     typeof raw.priority === "string" ? raw.priority : undefined,
    ratingMin:    typeof raw.ratingMin === "string" ? raw.ratingMin : undefined,
    reviewsMin:   typeof raw.reviewsMin === "string" ? raw.reviewsMin : undefined,
    onlyNoWebsite: raw.onlyNoWebsite === "1" ? "1" : undefined,
    excludeChains: raw.excludeChains === "1" ? "1" : undefined,
    sort:         typeof raw.sort === "string" ? raw.sort : undefined,
  })
  const f = parsed.success ? parsed.data : {}

  const orderBy =
    f.sort === "updated" ? "updatedAt" :
    f.sort === "score"   ? "leadScore" :
    "createdAt"

  // ── Stats (totali DB, non filtrati) ──
  const [
    { count: totalCount },
    { count: newCount },
    { count: highCount },
    { count: noWebCount },
    { count: qualifiedCount },
  ] = await Promise.all([
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }).eq("priorityLevel", "high"),
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }).eq("hasOfficialWebsite", false),
    supabaseAdmin.from("Lead").select("id", { count: "exact", head: true }).eq("status", "qualified"),
  ])

  // ── Lead list (filtrati) ──
  let leadsQuery = supabaseAdmin
    .from("Lead")
    .select("id,businessName,city,province,region,category,rating,reviewsCount,hasOfficialWebsite,officialWebsiteUrl,phone,email,leadScore,priorityLevel,status,provider,updatedAt,instagramUrl,facebookUrl")
    .order(orderBy, { ascending: false })
    .limit(200)

  if (f.q) {
    const q = `%${f.q}%`
    leadsQuery = leadsQuery.or(`businessName.ilike.${q},email.ilike.${q},phone.ilike.${q},officialWebsiteUrl.ilike.${q}`)
  }
  if (f.region)   leadsQuery = leadsQuery.ilike("region", f.region)
  if (f.province) leadsQuery = leadsQuery.ilike("province", f.province)
  if (f.city)     leadsQuery = leadsQuery.ilike("city", f.city)
  if (f.category) leadsQuery = leadsQuery.ilike("category", f.category)
  if (f.status)   leadsQuery = leadsQuery.eq("status", f.status)
  if (f.priority) leadsQuery = leadsQuery.eq("priorityLevel", f.priority)
  if (typeof f.ratingMin === "number")  leadsQuery = leadsQuery.gte("rating", f.ratingMin)
  if (typeof f.reviewsMin === "number") leadsQuery = leadsQuery.gte("reviewsCount", f.reviewsMin)
  if (f.onlyNoWebsite) leadsQuery = leadsQuery.eq("hasOfficialWebsite", false)
  if (f.excludeChains) leadsQuery = leadsQuery.eq("chainDetected", false)

  const { data: leads, error: leadsError } = await leadsQuery
  if (leadsError) throw new Error(leadsError.message)

  const hasFilters = Object.values(f).some(Boolean)

  const STATS = [
    { label: "Lead totali",   value: totalCount ?? 0,    icon: Users,        accent: "stat-blue",    href: "/leads" },
    { label: "Nuovi",         value: newCount ?? 0,      icon: TrendingUp,   accent: "stat-violet",  href: "/leads?status=new" },
    { label: "Alta priorità", value: highCount ?? 0,     icon: Star,         accent: "stat-amber",   href: "/leads?priority=high" },
    { label: "Senza sito",    value: noWebCount ?? 0,    icon: Globe2,       accent: "stat-rose",    href: "/leads?onlyNoWebsite=1" },
    { label: "Qualificati",   value: qualifiedCount ?? 0,icon: CheckCircle2, accent: "stat-emerald", href: "/leads?status=qualified" },
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Lead Hub</p>
          <h1 className="text-2xl font-bold text-foreground">Elenco Lead</h1>
        </div>
        <Button asChild size="sm">
          <Link href="/leads/search"><Search className="h-3.5 w-3.5 mr-1.5" />Nuova Ricerca</Link>
        </Button>
      </div>

      {/* ── Bento Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STATS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`bento-card p-4 flex flex-col gap-2 group cursor-pointer ${s.accent}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{s.value.toLocaleString("it-IT")}</div>
          </Link>
        ))}
      </div>

      {/* ── Filtri ── */}
      <div className="bento-card p-4 md:p-5">
        <form className="space-y-4" method="get">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="q" className="text-xs">Cerca</Label>
              <Input id="q" name="q" defaultValue={f.q ?? ""} placeholder="Nome, email, telefono…" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="region" className="text-xs">Regione</Label>
              <Input id="region" name="region" defaultValue={f.region ?? ""} placeholder="Campania" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="province" className="text-xs">Provincia</Label>
              <Input id="province" name="province" defaultValue={f.province ?? ""} placeholder="NA" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs">Città</Label>
              <Input id="city" name="city" defaultValue={f.city ?? ""} placeholder="Napoli" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs">Categoria</Label>
              <Input id="category" name="category" defaultValue={f.category ?? ""} placeholder="pizzeria" className="h-8 text-sm" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Stato</Label>
              <select id="status" name="status" defaultValue={f.status ?? ""} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:ring-1 focus:ring-ring">
                <option value="">Tutti</option>
                <option value="new">Nuovo</option>
                <option value="reviewed">Verificato</option>
                <option value="contacted">Contattato</option>
                <option value="qualified">Qualificato</option>
                <option value="discarded">Scartato</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="priority" className="text-xs">Priorità</Label>
              <select id="priority" name="priority" defaultValue={f.priority ?? ""} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:ring-1 focus:ring-ring">
                <option value="">Tutte</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Bassa</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sort" className="text-xs">Ordina per</Label>
              <select id="sort" name="sort" defaultValue={f.sort ?? ""} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:ring-1 focus:ring-ring">
                <option value="">Più recenti</option>
                <option value="score">Score</option>
                <option value="updated">Aggiornamento</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ratingMin" className="text-xs">Rating min</Label>
              <Input id="ratingMin" name="ratingMin" defaultValue={typeof f.ratingMin === "number" ? String(f.ratingMin) : ""} placeholder="4.0" className="h-8 text-sm" />
            </div>

            <div className="flex items-end gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" name="onlyNoWebsite" value="1" defaultChecked={f.onlyNoWebsite === "1"} className="rounded border-border" />
                Solo senza sito
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" name="excludeChains" value="1" defaultChecked={f.excludeChains === "1"} className="rounded border-border" />
                Escludi catene
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {leads?.length ?? 0} lead trovati
              {hasFilters && <span className="ml-1 text-primary">· Filtri attivi</span>}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm"><Search className="h-3.5 w-3.5 mr-1" />Applica</Button>
              <Button asChild type="button" variant="outline" size="sm">
                <Link href="/leads"><RotateCcw className="h-3.5 w-3.5 mr-1" />Reset</Link>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Tabella Lead ── */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-16 text-xs font-semibold">Score</TableHead>
                <TableHead className="text-xs font-semibold">Attività</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Località</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Categoria</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Contatti</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Rating</TableHead>
                <TableHead className="text-xs font-semibold">Stato</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Aggiornato</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leads as unknown as Lead[]).map((l) => (
                <TableRow
                  key={l.id}
                  className={`hover:bg-muted/40 transition-colors group ${l.priorityLevel === "high" ? "row-high-priority" : ""}`}
                >
                  <TableCell className="py-3">
                    <ScoreBadge score={l.leadScore} />
                  </TableCell>

                  <TableCell className="py-3">
                    <Link href={`/leads/${l.id}`} className="font-semibold text-sm hover:text-primary transition-colors leading-tight">
                      {l.businessName}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{l.provider}</span>
                      {!l.hasOfficialWebsite && (
                        <span className="text-[10px] rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 px-1.5 py-0 font-medium border border-rose-200 dark:border-rose-500/20">
                          senza sito
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-3 hidden sm:table-cell">
                    <div className="text-sm text-foreground">{l.city || "—"}</div>
                    {(l.province || l.region) && (
                      <div className="text-xs text-muted-foreground">{[l.province, l.region].filter(Boolean).join(", ")}</div>
                    )}
                  </TableCell>

                  <TableCell className="py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground capitalize">{l.category ?? "—"}</span>
                  </TableCell>

                  <TableCell className="py-3 hidden md:table-cell">
                    <div className="space-y-0.5">
                      {l.phone && <div className="text-xs text-muted-foreground font-mono">{l.phone}</div>}
                      {l.email && <div className="text-xs text-primary truncate max-w-[160px]">{l.email}</div>}
                      {!l.phone && !l.email && <span className="text-xs text-muted-foreground/50">—</span>}
                    </div>
                  </TableCell>

                  <TableCell className="py-3 hidden lg:table-cell">
                    {l.rating ? (
                      <div className="text-xs">
                        <span className="font-medium text-amber-600 dark:text-amber-400">★ {l.rating}</span>
                        <span className="text-muted-foreground ml-1">({l.reviewsCount})</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground/50">—</span>}
                  </TableCell>

                  <TableCell className="py-3">
                    <StatusSelect action={updateLeadStatusAction.bind(null, l.id)} defaultValue={l.status as any} />
                  </TableCell>

                  <TableCell className="py-3 hidden lg:table-cell text-xs text-muted-foreground">
                    {new Date(l.updatedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/leads/${l.id}`} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <form action={deleteLeadAction.bind(null, l.id)}>
                        <button type="submit" className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {(leads ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8 opacity-30" />
                      <p className="text-sm font-medium">Nessun lead trovato</p>
                      <p className="text-xs opacity-70">Prova a modificare i filtri o{" "}
                        <Link href="/leads/search" className="text-primary hover:underline">cerca nuovi lead</Link>
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  )
}
