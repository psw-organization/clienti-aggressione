"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Upload, Download, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ProviderLead, ProviderSearchResponse } from "@/lib/providers/types"

export type ProviderOption = {
  providerId: string
  name: string
  enabled: boolean
}

export function ProviderSearch({ providers }: { providers: ProviderOption[] }) {
  const router = useRouter()
  const enabledProviders = providers.filter((p) => p.enabled)
  const [providerId, setProviderId] = useState(enabledProviders[0]?.providerId ?? "mock")

  const [region, setRegion] = useState("")
  const [province, setProvince] = useState("")
  const [city, setCity] = useState("")
  const [category, setCategory] = useState("")
  const [ratingMin, setRatingMin] = useState("")
  const [reviewsMin, setReviewsMin] = useState("")
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(true)
  const [excludeChains, setExcludeChains] = useState(true)

  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [items, setItems] = useState<ProviderLead[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const selectedItems = useMemo(() => items.filter((i) => selected[i.externalId]), [items, selected])

  async function runSearch() {
    setError(null)
    setLoading(true)
    setItems([])
    setSelected({})
    try {
      const res = await fetch("/api/providers/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId,
          region: region || undefined,
          province: province || undefined,
          city: city || undefined,
          category: category || undefined,
          ratingMin: ratingMin ? Number(ratingMin) : undefined,
          reviewsMin: reviewsMin ? Number(reviewsMin) : undefined,
          onlyNoWebsite,
          excludeChains,
          limit: 30,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any
        throw new Error(j?.error || "Errore ricerca")
      }
      const j = (await res.json()) as ProviderSearchResponse
      setJobId(j.jobId)
      setItems(j.items)
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
        body: JSON.stringify({ providerId, jobId: jobId ?? undefined, items: selectedItems }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any
        throw new Error(j?.error || "Errore import")
      }
      router.refresh()
      setItems([])
      setSelected({})
      setJobId(null)
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
        websiteUrl: i.websiteUrl
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
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
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
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="pizzeria" />
          </div>
          <div className="space-y-2">
            <Label>Rating min</Label>
            <Input value={ratingMin} onChange={(e) => setRatingMin(e.target.value)} placeholder="4.3" />
          </div>
          <div className="space-y-2">
            <Label>Recensioni min</Label>
            <Input value={reviewsMin} onChange={(e) => setReviewsMin(e.target.value)} placeholder="100" />
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
