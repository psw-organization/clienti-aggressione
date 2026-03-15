import { NextResponse } from "next/server"
import { z } from "zod"

import { providers } from "@/lib/providers/registry"
import { providerIdSchema, providerSearchSchema } from "@/lib/providers/types"
import { supabaseAdmin } from "@/lib/supabase/admin"

const bodySchema = providerSearchSchema.extend({
  providerId: providerIdSchema.default("mock"),
  ratingMin: z.coerce.number().min(0).max(5).optional(),
  reviewsMin: z.coerce.number().int().min(0).optional(),
  onlyNoWebsite: z.coerce.boolean().optional(),
  excludeChains: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 })
  }

  const providerId = parsed.data.providerId
  const provider = providers[providerId]
  if (!provider) {
    return NextResponse.json({ error: "Provider non supportato" }, { status: 400 })
  }

  const { data: cfg } = await supabaseAdmin
    .from("ProviderConfig")
    .select("enabled")
    .eq("providerId", providerId)
    .maybeSingle()
  if ((cfg as { enabled?: boolean } | null)?.enabled === false) {
    return NextResponse.json({ error: "Provider disabilitato" }, { status: 400 })
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from("SearchJob")
    .insert({
      providerId,
      status: "running",
      params: JSON.stringify({ ...parsed.data, limit: parsed.data.limit ?? 30 }),
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
    const query = { ...parsed.data, limit: parsed.data.limit ?? 30 }
    const items = await provider.search(query)
    await supabaseAdmin
      .from("SearchJob")
      .update({
        status: "completed",
        rawResultsCount: items.length,
        validResults: items.length,
        finishedAt: new Date().toISOString(),
      })
      .eq("id", jobId)

    return NextResponse.json({ jobId, items })
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
