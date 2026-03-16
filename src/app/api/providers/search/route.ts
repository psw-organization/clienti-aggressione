import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveSearchFlowDecision, runUnifiedProviderSearch } from "@/lib/providers/search-flow"
import { providerIdSchema, providerSearchSchema, providerSelectionSchema } from "@/lib/providers/types"
import { supabaseAdmin } from "@/lib/supabase/admin"

const bodySchema = providerSearchSchema.omit({ providerId: true }).extend({
  providerId: providerSelectionSchema.default("auto"),
  ratingMin: z.coerce.number().min(0).max(5).optional(),
  reviewsMin: z.coerce.number().int().min(0).optional(),
  onlyNoWebsite: z.coerce.boolean().optional(),
  excludeChains: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  categories: z.array(z.string().trim().min(1)).optional(),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 })
  }

  const requestedProvider = parsed.data.providerId
  const query = {
    ...parsed.data,
    providerId: "mock" as const,
    limit: parsed.data.limit ?? 30,
  }
  const providerIds = providerIdSchema.options
  const { data: providerConfigs, error: providerCfgError } = await supabaseAdmin
    .from("ProviderConfig")
    .select("providerId,enabled")
    .in("providerId", providerIds)

  if (providerCfgError) {
    return NextResponse.json({ error: "Errore lettura configurazione provider" }, { status: 500 })
  }

  const cfgMap = new Map<string, boolean>()
  for (const cfg of (providerConfigs as { providerId: string; enabled: boolean }[] | null) || []) {
    cfgMap.set(cfg.providerId, cfg.enabled)
  }
  const enabledProviders = new Set(providerIds.filter((id) => cfgMap.get(id) !== false))

  if (enabledProviders.size === 0) {
    return NextResponse.json({ error: "Nessun provider abilitato" }, { status: 400 })
  }

  if (requestedProvider !== "auto" && !enabledProviders.has(requestedProvider)) {
    return NextResponse.json({ error: "Provider disabilitato" }, { status: 400 })
  }

  const decision = resolveSearchFlowDecision(requestedProvider, query, enabledProviders)

  const { data: job, error: jobError } = await supabaseAdmin
    .from("SearchJob")
    .insert({
      providerId: decision.primaryProvider,
      status: "running",
      params: JSON.stringify({ ...query, requestedProvider }),
      rawResultsCount: 0,
      validResults: 0,
    })
    .select("id")
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: "Impossibile creare il job di ricerca" }, { status: 500 })
  }
  const jobId = (job as { id: string }).id

  try {
    const result = await runUnifiedProviderSearch({
      requestedProvider,
      query,
      enabledProviders,
    })

    await supabaseAdmin
      .from("SearchJob")
      .update({
        status: "completed",
        rawResultsCount: result.counts.primary + result.counts.fallback,
        validResults: result.counts.final,
        finishedAt: new Date().toISOString(),
      })
      .eq("id", jobId)

    return NextResponse.json({
      jobId,
      items: result.items,
      requestedProvider,
      resolvedProvider: result.decision.primaryProvider,
      fallbackProvider: result.decision.fallbackProvider,
      usedFallback: result.usedFallback,
      reasons: result.decision.reasons,
      counts: result.counts,
    })
  } catch (err) {
    await supabaseAdmin
      .from("SearchJob")
      .update({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Errore provider",
        finishedAt: new Date().toISOString(),
      })
      .eq("id", jobId)
    return NextResponse.json({ error: "Errore durante la ricerca" }, { status: 500 })
  }
}
