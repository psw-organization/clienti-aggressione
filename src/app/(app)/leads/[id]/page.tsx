import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft, Building2, MapPin, Globe, Mail, Phone, Instagram, Facebook,
  BarChart3, FileJson, StickyNote, History, Star, ExternalLink, Copy
} from "lucide-react"

import { updateLeadAction, updateLeadNotesAction, updateLeadStatusAction } from "@/app/(app)/leads/actions"
import { NotesForm } from "@/components/leads/notes-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusSelect } from "@/components/leads/status-select"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { cn } from "@/lib/utils"

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" :
    score >= 40 ? "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" :
                  "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
  const bg =
    score >= 70 ? "bg-emerald-50 dark:bg-emerald-500/10" :
    score >= 40 ? "bg-amber-50 dark:bg-amber-500/10" :
                  "bg-rose-50 dark:bg-rose-500/10"

  return (
    <div className={cn("flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 shadow-inner", color, bg)}>
      <span className="text-3xl font-black tabular-nums leading-none">{score}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mt-0.5">score</span>
    </div>
  )
}

function ContactRow({ icon: Icon, label, value, href }: { icon: any; label: string; value: string | null | undefined; href?: string }) {
  if (!value) return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0 opacity-40">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm italic text-muted-foreground">Non disponibile</p>
      </div>
    </div>
  )

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0 group">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-sm font-medium text-foreground truncate">{value}</p>
        )}
      </div>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>
      )}
    </div>
  )
}

export default async function LeadDetailPage({ params }: any) {
  const { id } = params

  const { data: leadData, error: leadError } = await supabaseAdmin
    .from("Lead")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (leadError || !leadData) notFound()
  const lead = leadData

  const { data: sources } = await supabaseAdmin
    .from("LeadSource")
    .select("*")
    .eq("leadId", id)
    .order("createdAt", { ascending: false })
    .limit(20)

  const scoreReasons = lead.scoreReasons ? JSON.parse(lead.scoreReasons as string) : []
  const providerRaw  = lead.providerRaw ? JSON.parse(lead.providerRaw as string) : {}

  const priorityColor =
    lead.priorityLevel === "high"   ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25" :
    lead.priorityLevel === "medium" ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25" :
                                       "text-muted-foreground bg-muted border-border"

  return (
    <div className="space-y-5 pb-12 max-w-5xl mx-auto">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/leads" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Lead</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[240px]">{lead.businessName}</span>
      </div>

      {/* ── Hero Card ── */}
      <div className="bento-card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground leading-tight">{lead.businessName}</h1>
              <span className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums",
                lead.leadScore >= 70 ? "score-high" : lead.leadScore >= 40 ? "score-medium" : "score-low"
              )}>
                ★ {lead.leadScore}
              </span>
              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide", priorityColor)}>
                {lead.priorityLevel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {(lead.city || lead.province) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {[lead.city, lead.province, lead.region].filter(Boolean).join(", ")}
                </span>
              )}
              {lead.category && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="capitalize">{lead.category}</span>
                </span>
              )}
              {lead.rating && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Star className="h-3.5 w-3.5 shrink-0 fill-current" />
                  {lead.rating} ({lead.reviewsCount} rec.)
                </span>
              )}
            </div>

            {/* Contatti rapidi */}
            <div className="flex flex-wrap gap-2 pt-1">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors">
                  <Phone className="h-3 w-3" />{lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors">
                  <Mail className="h-3 w-3" />{lead.email}
                </a>
              )}
              {lead.officialWebsiteUrl && (
                <a href={lead.officialWebsiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 text-xs font-medium hover:opacity-80 transition-opacity">
                  <Globe className="h-3 w-3" />Sito web
                </a>
              )}
              {!lead.officialWebsiteUrl && (
                <span className="flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 px-2.5 py-1 text-xs font-medium">
                  <Globe className="h-3 w-3" />Nessun sito
                </span>
              )}
            </div>
          </div>

          {/* Status control */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <StatusSelect action={updateLeadStatusAction.bind(null, lead.id)} defaultValue={lead.status} />
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              via <span className="font-medium text-foreground">{lead.provider}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="h-9 bg-muted/60 border border-border rounded-lg p-1 w-full justify-start overflow-x-auto flex-wrap gap-0.5">
          <TabsTrigger value="overview"  className="h-7 gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"><Building2 className="h-3.5 w-3.5" />Panoramica</TabsTrigger>
          <TabsTrigger value="contacts"  className="h-7 gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"><Phone className="h-3.5 w-3.5" />Contatti</TabsTrigger>
          <TabsTrigger value="analysis"  className="h-7 gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"><BarChart3 className="h-3.5 w-3.5" />Analisi</TabsTrigger>
          <TabsTrigger id="notes-tab" value="notes" className="h-7 gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"><StickyNote className="h-3.5 w-3.5" />Note</TabsTrigger>
          <TabsTrigger value="raw"       className="h-7 gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"><FileJson className="h-3.5 w-3.5" />Dati raw</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">

            {/* Main form */}
            <div className="bento-card p-5 md:col-span-2">
              <h2 className="text-sm font-semibold text-foreground mb-4">Informazioni Attività</h2>
              <form action={updateLeadAction.bind(null, lead.id)} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="businessName" className="text-xs">Nome attività</Label>
                    <Input id="businessName" name="businessName" defaultValue={lead.businessName} required className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="category" className="text-xs">Categoria</Label>
                    <Input id="category" name="category" defaultValue={lead.category ?? ""} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rating / Recensioni</Label>
                    <div className="flex gap-2">
                      <Input id="rating" name="rating" defaultValue={lead.rating ?? ""} placeholder="4.5" className="h-9 w-20" />
                      <Input id="reviewsCount" name="reviewsCount" defaultValue={lead.reviewsCount ?? ""} placeholder="Recensioni" className="h-9" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Indirizzo</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input id="address" name="address" defaultValue={lead.address ?? ""} placeholder="Via / Piazza" className="h-9 sm:col-span-2" />
                    <Input id="city" name="city" defaultValue={lead.city ?? ""} placeholder="Città" className="h-9" />
                    <Input id="province" name="province" defaultValue={lead.province ?? ""} placeholder="Provincia" className="h-9" />
                    <Input id="region" name="region" defaultValue={lead.region ?? ""} placeholder="Regione" className="h-9" />
                    <Input id="country" name="country" defaultValue={lead.country ?? ""} placeholder="Paese" className="h-9" />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button type="submit" size="sm">Salva Modifiche</Button>
                </div>
              </form>
            </div>

            {/* Sidebar info */}
            <div className="space-y-4">
              <div className="bento-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Stato Lead</h3>
                <div className="space-y-2.5">
                  {[
                    { label: "Priorità",   value: lead.priorityLevel?.toUpperCase() },
                    { label: "Provider",   value: lead.provider },
                    { label: "Aggiornato", value: new Date(lead.updatedAt).toLocaleDateString("it-IT") },
                    { label: "Creato",     value: new Date(lead.createdAt).toLocaleDateString("it-IT") },
                    { label: "Lat/Lng",    value: lead.latitude && lead.longitude ? `${lead.latitude?.toFixed(4)}, ${lead.longitude?.toFixed(4)}` : null },
                  ].filter(r => r.value).map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <span className="text-xs font-medium text-foreground text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {lead.internalNotes && (
                <div className="bento-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5" />Note
                  </h3>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed line-clamp-6">{lead.internalNotes}</p>
                  <a href="#notes-tab" className="text-[10px] text-primary hover:underline mt-2 inline-block">
                    Modifica →
                  </a>
                </div>
              )}

              <div className="bento-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />Tracciabilità
                </h3>
                <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-0.5">
                  {(sources ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nessuna sorgente.</p>
                  )}
                  {sources?.map((s: any) => (
                    <div key={s.id} className="flex gap-2.5 text-xs border-l-2 border-primary/30 pl-2.5 py-1">
                      <div>
                        <div className="font-semibold text-foreground">{s.type}</div>
                        {s.sourceUrl && <div className="text-muted-foreground truncate max-w-[180px]" title={s.sourceUrl}>{s.sourceUrl}</div>}
                        <div className="text-muted-foreground/60 mt-0.5">{new Date(s.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── CONTATTI ── */}
        <TabsContent value="contacts" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bento-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-1">Contatti Diretti</h2>
              <p className="text-xs text-muted-foreground mb-4">Recapiti telefonici e email</p>
              <div>
                <ContactRow icon={Phone} label="Telefono" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
                <ContactRow icon={Mail}  label="Email"    value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
              </div>

              <form action={updateLeadAction.bind(null, lead.id)} className="space-y-3 mt-4 pt-4 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modifica contatti</h3>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">Telefono</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input id="phone" name="phone" defaultValue={lead.phone ?? ""} className="h-9 pl-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input id="email" name="email" defaultValue={lead.email ?? ""} className="h-9 pl-8 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">Salva</Button>
                </div>
              </form>
            </div>

            <div className="bento-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-1">Web & Social</h2>
              <p className="text-xs text-muted-foreground mb-4">Presenza digitale</p>
              <div>
                <ContactRow icon={Globe}     label="Sito Ufficiale" value={lead.officialWebsiteUrl} href={lead.officialWebsiteUrl ?? undefined} />
                <ContactRow icon={Instagram} label="Instagram"      value={lead.instagramUrl}       href={lead.instagramUrl ?? undefined} />
                <ContactRow icon={Facebook}  label="Facebook"       value={lead.facebookUrl}        href={lead.facebookUrl ?? undefined} />
              </div>

              <form action={updateLeadAction.bind(null, lead.id)} className="space-y-3 mt-4 pt-4 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modifica web</h3>
                <div className="space-y-1">
                  <Label htmlFor="officialWebsiteUrl" className="text-xs">Sito Ufficiale</Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input id="officialWebsiteUrl" name="officialWebsiteUrl" defaultValue={lead.officialWebsiteUrl ?? ""} className="h-9 pl-8 text-sm" placeholder="https://..." />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="instagramUrl" className="text-xs">Instagram</Label>
                  <div className="relative">
                    <Instagram className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input id="instagramUrl" name="instagramUrl" defaultValue={lead.instagramUrl ?? ""} className="h-9 pl-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="facebookUrl" className="text-xs">Facebook</Label>
                  <div className="relative">
                    <Facebook className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input id="facebookUrl" name="facebookUrl" defaultValue={lead.facebookUrl ?? ""} className="h-9 pl-8 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm">Salva</Button>
                </div>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* ── ANALISI ── */}
        <TabsContent value="analysis" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bento-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Punteggio Lead</h2>
              <div className="flex items-start gap-6">
                <ScoreRing score={lead.leadScore} />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Priorità</p>
                    <p className={cn("text-sm font-bold uppercase tracking-wide", lead.priorityLevel === "high" ? "text-rose-600 dark:text-rose-400" : lead.priorityLevel === "medium" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                      {lead.priorityLevel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="text-sm font-medium">{lead.hasOfficialWebsite ? "✅ Ha sito ufficiale" : "❌ Senza sito ufficiale"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Fattori scoring</p>
                {scoreReasons.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nessun fattore registrato.</p>
                ) : (
                  scoreReasons.map((reason: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {reason}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bento-card p-6 flex flex-col">
              <h2 className="text-sm font-semibold text-foreground mb-1">AI Insights</h2>
              <p className="text-xs text-muted-foreground mb-6">Analisi predittiva in arrivo</p>
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8">
                <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-foreground">Analisi Avanzata</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    L'AI analizzerà il profilo del lead e suggerirà il miglior approccio commerciale.
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>Genera Report AI</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── NOTE ── */}
        <TabsContent value="notes" className="mt-4">
          <div className="bento-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-1">Note Interne</h2>
            <p className="text-xs text-muted-foreground mb-4">Appunti privati — visibili solo al team</p>
            <NotesForm
              action={updateLeadNotesAction.bind(null, lead.id)}
              defaultValue={lead.internalNotes}
            />
          </div>
        </TabsContent>

        {/* ── RAW DATA ── */}
        <TabsContent value="raw" className="mt-4">
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Dati Provider</h2>
                <p className="text-xs text-muted-foreground">Dati grezzi ricevuti dalla sorgente ({lead.provider})</p>
              </div>
            </div>
            <pre className="rounded-xl bg-muted/50 border border-border p-4 overflow-x-auto text-xs font-mono text-muted-foreground max-h-[500px] overflow-y-auto">
              {JSON.stringify(providerRaw, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}
