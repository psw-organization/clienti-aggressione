"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Upload, Download, Mail, ChevronDown, Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ProviderId, ProviderLead, ProviderSearchResponse, ProviderSelection } from "@/lib/providers/types"

// ── Dati categorie ────────────────────────────────────────────────────────────
const CATEGORY_GROUPS = [
  {
    label: "Ristorazione & Food",
    items: ["ristorante","pizzeria","bar","trattoria","pub","osteria","taverna","rosticceria","braceria","hamburgeria","paninoteca","kebab","sushi","gelateria","pasticceria","panetteria","caffetteria","enoteca","birreria"],
  },
  {
    label: "Hospitality & Turismo",
    items: ["hotel","bed and breakfast","agriturismo","agenzia viaggi","tour operator"],
  },
  {
    label: "Finanza & Assicurazioni",
    items: ["banca","agenzia assicurativa","consulente finanziario","intermediazione finanziaria","prestiti","promotore finanziario","cambio valute"],
  },
  {
    label: "Immobiliare & Costruzioni",
    items: ["agenzia immobiliare","agenzia affitti","costruttore edile","geometra","architetto","impresa di pulizie"],
  },
  {
    label: "Benessere & Salute",
    items: ["parrucchiere","barbiere","centro estetico","spa","palestra","fisioterapista","dentista","medico","farmacia","ottico","veterinario"],
  },
  {
    label: "Professioni & Consulenza",
    items: ["avvocato","commercialista","notaio","consulente del lavoro","agenzia marketing","agenzia comunicazione","web agency","agenzia di reclutamento"],
  },
  {
    label: "Commercio & Retail",
    items: ["negozio abbigliamento","gioielleria","fioraio","libreria","tabaccheria","ferramenta","elettronica","lavanderia","supermercato"],
  },
  {
    label: "Auto & Mobilità",
    items: ["concessionaria auto","officina meccanica","carrozzeria","autolavaggio","noleggio auto"],
  },
  {
    label: "Istruzione & Cultura",
    items: ["scuola guida","scuola di musica","centro linguistico","doposcuola","palestra danza"],
  },
] as const

const LABEL_MAP: Record<string, string> = {
  "ristorante": "Ristorante", "pizzeria": "Pizzeria", "bar": "Bar / Caffè", "trattoria": "Trattoria",
  "pub": "Pub", "osteria": "Osteria", "taverna": "Taverna", "rosticceria": "Rosticceria",
  "braceria": "Braceria / Griglieria", "hamburgeria": "Hamburgeria", "paninoteca": "Paninoteca",
  "kebab": "Kebab", "sushi": "Sushi", "gelateria": "Gelateria", "pasticceria": "Pasticceria",
  "panetteria": "Panetteria / Forno", "caffetteria": "Caffetteria", "enoteca": "Enoteca / Wine Bar",
  "birreria": "Birreria", "hotel": "Hotel", "bed and breakfast": "B&B", "agriturismo": "Agriturismo",
  "agenzia viaggi": "Agenzia Viaggi", "tour operator": "Tour Operator", "banca": "Banca",
  "agenzia assicurativa": "Agenzia Assicurativa", "consulente finanziario": "Consulente Finanziario",
  "intermediazione finanziaria": "Intermediazione Finanziaria", "prestiti": "Prestiti / Credito",
  "promotore finanziario": "Promotore Finanziario", "cambio valute": "Cambio Valute",
  "agenzia immobiliare": "Agenzia Immobiliare", "agenzia affitti": "Agenzia Affitti",
  "costruttore edile": "Costruttore Edile", "geometra": "Geometra", "architetto": "Architetto",
  "impresa di pulizie": "Impresa di Pulizie", "parrucchiere": "Parrucchiere", "barbiere": "Barbiere",
  "centro estetico": "Centro Estetico", "spa": "Spa / Benessere", "palestra": "Palestra / Fitness",
  "fisioterapista": "Fisioterapista", "dentista": "Dentista", "medico": "Medico / Studio",
  "farmacia": "Farmacia", "ottico": "Ottico", "veterinario": "Veterinario", "avvocato": "Avvocato",
  "commercialista": "Commercialista", "notaio": "Notaio", "consulente del lavoro": "Consulente Lavoro",
  "agenzia marketing": "Agenzia Marketing", "agenzia comunicazione": "Agenzia Comunicazione",
  "web agency": "Web Agency", "agenzia di reclutamento": "Agenzia Reclutamento",
  "negozio abbigliamento": "Abbigliamento", "gioielleria": "Gioielleria", "fioraio": "Fioraio",
  "libreria": "Libreria", "tabaccheria": "Tabaccheria", "ferramenta": "Ferramenta",
  "elettronica": "Elettronica", "lavanderia": "Lavanderia", "supermercato": "Supermercato",
  "concessionaria auto": "Concessionaria Auto", "officina meccanica": "Officina Meccanica",
  "carrozzeria": "Carrozzeria", "autolavaggio": "Autolavaggio", "noleggio auto": "Noleggio Auto",
  "scuola guida": "Scuola Guida", "scuola di musica": "Scuola di Musica",
  "centro linguistico": "Centro Linguistico", "doposcuola": "Doposcuola", "palestra danza": "Danza / Arte",
}

// ── MultiCategorySelect ───────────────────────────────────────────────────────
function MultiCategorySelect({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])
  }

  const filtered = search.trim()
    ? CATEGORY_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((v) =>
          (LABEL_MAP[v] ?? v).toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((g) => g.items.length > 0)
    : CATEGORY_GROUPS

  const label =
    selected.length === 0
      ? "Tutte le categorie"
      : selected.length === 1
      ? (LABEL_MAP[selected[0]] ?? selected[0])
      : `${selected.length} categorie`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent transition-colors"
      >
        <span className={selected.length === 0 ? "text-muted-foreground" : "text-foreground"}>
          {label}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] px-2 py-0.5 font-medium"
            >
              {LABEL_MAP[v] ?? v}
              <button type="button" onClick={() => toggle(v)} className="hover:opacity-70">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {selected.length > 1 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-muted-foreground hover:text-foreground px-1"
            >
              Cancella tutto
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca categoria…"
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filtered.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggle(val)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.includes(val) ? "bg-primary border-primary" : "border-input"}`}>
                      {selected.includes(val) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    {LABEL_MAP[val] ?? val}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Nessuna categoria trovata</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export type ProviderOption = {
  providerId: string
  name: string
  enabled: boolean
}

export function ProviderSearch({ providers }: { providers: ProviderOption[] }) {
  const router = useRouter()
  const enabledProviders = providers.filter((p) => p.enabled)
  const [providerId, setProviderId] = useState<ProviderSelection>("auto")

  const [region, setRegion] = useState("")
  const [province, setProvince] = useState("")
  const [city, setCity] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [ratingMin, setRatingMin] = useState("")
  const [reviewsMin, setReviewsMin] = useState("")
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(true)
  const [excludeChains, setExcludeChains] = useState(true)
  const [limit, setLimit] = useState("50")

  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [items, setItems] = useState<ProviderLead[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [resolvedProvider, setResolvedProvider] = useState<ProviderId | null>(null)
  const [fallbackProvider, setFallbackProvider] = useState<ProviderId | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [reasons, setReasons] = useState<string[]>([])
  const [counts, setCounts] = useState<{ primary: number; fallback: number; final: number } | null>(null)

  const selectedItems = useMemo(() => items.filter((i) => selected[i.externalId]), [items, selected])
  const providerChoices = useMemo(
    () => [{ providerId: "auto", name: "Auto (consigliato)", enabled: true }, ...enabledProviders],
    [enabledProviders]
  )

  async function runSearch() {
    setError(null)
    setLoading(true)
    setItems([])
    setSelected({})
    setResolvedProvider(null)
    setFallbackProvider(null)
    setUsedFallback(false)
    setReasons([])
    setCounts(null)
    try {
      const res = await fetch("/api/providers/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId,
          region: region || undefined,
          province: province || undefined,
          city: city || undefined,
          categories: categories.length > 0 ? categories : undefined,
          ratingMin: ratingMin ? Number(ratingMin) : undefined,
          reviewsMin: reviewsMin ? Number(reviewsMin) : undefined,
          onlyNoWebsite,
          excludeChains,
          limit: Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100),
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any
        throw new Error(j?.error || "Errore ricerca")
      }
      const j = (await res.json()) as ProviderSearchResponse
      setJobId(j.jobId)
      setItems(j.items)
      setResolvedProvider(j.resolvedProvider)
      setFallbackProvider(j.fallbackProvider ?? null)
      setUsedFallback(j.usedFallback)
      setReasons(j.reasons)
      setCounts(j.counts)
      const defaults: Record<string, boolean> = {}
      for (const it of j.items) defaults[it.externalId] = true
      setSelected(defaults)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore")
    } finally {
      setLoading(false)
    }
  }

  async function importSelected() {
    if (!selectedItems.length) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: resolvedProvider ?? (providerId === "auto" ? "mock" : providerId),
          jobId: jobId ?? undefined,
          items: selectedItems,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any
        throw new Error(j?.error || "Errore import")
      }
      router.refresh()
      setItems([])
      setSelected({})
      setJobId(null)
      setResolvedProvider(null)
      setFallbackProvider(null)
      setUsedFallback(false)
      setReasons([])
      setCounts(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore")
    } finally {
      setImporting(false)
    }
  }

  async function scrapeEmails() {
    if (!items.length) return
    setScraping(true)
    setError(null)
    
    try {
      const candidates = items.map(i => ({
        id: i.externalId,
        businessName: i.businessName,
        websiteUrl: i.websiteUrl,
        city: i.city,
      }))

      if (candidates.length === 0) {
        throw new Error("Nessun lead da analizzare")
      }

      const res = await fetch("/api/leads/scrape-emails", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: candidates })
      })

      if (!res.ok) throw new Error("Scraping failed")

      const { results } = await res.json()
      
      // Aggiorna la tabella con le email trovate
      const emailMap = new Map(results.map((r: any) => [r.id, r.email]))
      
      setItems(prev => prev.map(item => {
        if (emailMap.has(item.externalId)) {
          return { ...item, email: emailMap.get(item.externalId) as string }
        }
        return item
      }))

    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore Scraping")
    } finally {
      setScraping(false)
    }
  }

  function exportCsv() {
    if (!items.length) return

    const headers = [
      "Nome",
      "Indirizzo",
      "Città",
      "Provincia",
      "Regione",
      "Categoria",
      "Telefono",
      "Email",
      "Sito Web",
      "Instagram",
      "Facebook",
      "Rating",
      "Recensioni"
    ]

    const rows = items.map(item => [
      item.businessName || "",
      item.address || "",
      item.city || "",
      item.province || "",
      item.region || "",
      item.category || "",
      item.phone || "",
      item.email || "",
      item.websiteUrl || "",
      item.instagramUrl || "",
      item.facebookUrl || "",
      item.rating || "",
      item.reviewsCount || ""
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `leads_export_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ricerca lead (provider-based)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-6">
          <div className="space-y-2 md:col-span-2">
            <Label>Provider</Label>
            <Select value={providerId} onValueChange={(value) => setProviderId(value as ProviderSelection)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {providerChoices.map((p) => (
                  <SelectItem key={p.providerId} value={p.providerId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Regione</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Campania" />
          </div>
          <div className="space-y-2">
            <Label>Provincia</Label>
            <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="NA" />
          </div>
          <div className="space-y-2">
            <Label>Città</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Napoli" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Categorie</Label>
            <MultiCategorySelect selected={categories} onChange={setCategories} />
          </div>
          <div className="space-y-2">
            <Label>Rating min</Label>
            <Input value={ratingMin} onChange={(e) => setRatingMin(e.target.value)} placeholder="4.3" />
          </div>
          <div className="space-y-2">
            <Label>Recensioni min</Label>
            <Input value={reviewsMin} onChange={(e) => setReviewsMin(e.target.value)} placeholder="100" />
          </div>
          <div className="space-y-2">
            <Label>Limite risultati</Label>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="50" type="number" min={1} max={100} />
          </div>
          <div className="flex items-end gap-3 md:col-span-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={onlyNoWebsite} onChange={(e) => setOnlyNoWebsite(e.target.checked)} />
              Solo senza sito
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={excludeChains} onChange={(e) => setExcludeChains(e.target.checked)} />
              Escludi catene
            </label>
          </div>
          <div className="flex items-end justify-end gap-2 md:col-span-3">
            <Button type="button" variant="secondary" onClick={runSearch} disabled={loading}>
              <Search className="h-4 w-4" />
              {loading ? "Ricerca…" : "Cerca"}
            </Button>
            <Button type="button" variant="outline" onClick={scrapeEmails} disabled={scraping || !items.length}>
              <Mail className="h-4 w-4" />
              {scraping ? "Analisi..." : "Trova Email"}
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={!items.length}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button type="button" onClick={importSelected} disabled={importing || !selectedItems.length}>
              <Upload className="h-4 w-4" />
              {importing ? "Import…" : `Importa (${selectedItems.length})`}
            </Button>
          </div>
        </div>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {resolvedProvider ? (
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
            <div className="font-medium">
              Provider usato: {resolvedProvider}
              {usedFallback && fallbackProvider ? ` + fallback ${fallbackProvider}` : ""}
            </div>
            {counts ? (
              <div className="text-muted-foreground">
                Risultati: primaria {counts.primary} · fallback {counts.fallback} · finali {counts.final}
              </div>
            ) : null}
            {reasons.length ? <div className="text-muted-foreground">{reasons.join(" • ")}</div> : null}
          </div>
        ) : null}

        {items.length ? (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Località</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Contatti</TableHead>
                  <TableHead>Sito</TableHead>
                  <TableHead>Social</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.externalId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[it.externalId])}
                        onChange={(e) => setSelected((s) => ({ ...s, [it.externalId]: e.target.checked }))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{it.businessName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[it.city, it.province, it.region].filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{it.category ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {it.phone ? <div className="text-xs">{it.phone}</div> : null}
                      {it.email ? <div className="text-xs font-semibold text-primary truncate max-w-[150px]">{it.email}</div> : null}
                      {!it.phone && !it.email && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {it.websiteUrl ? <Badge variant="outline">Sì</Badge> : <Badge variant="danger">No</Badge>}
                    </TableCell>
                    <TableCell>
                      {it.instagramUrl || it.facebookUrl ? <Badge>Social</Badge> : <Badge variant="outline">No</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Nessun risultato.</div>
        )}
      </CardContent>
    </Card>
  )
}
