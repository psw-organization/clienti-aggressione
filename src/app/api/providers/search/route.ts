import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/db"
import { providers } from "@/lib/providers/registry"
import { providerIdSchema, providerSearchSchema } from "@/lib/providers/types"

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

  const cfg = await prisma.providerConfig.findUnique({ where: { providerId } })
  if (cfg && !cfg.enabled) {
    return NextResponse.json({ error: "Provider disabilitato" }, { status: 400 })
  }

  const job = await prisma.searchJob.create({
    data: {
      providerId,
      status: "running",
      params: JSON.stringify({ ...parsed.data, limit: parsed.data.limit ?? 30 }),
      rawResultsCount: 0,
      validResults: 0,
    },
    select: { id: true },
  })

  try {
    const query = { ...parsed.data, limit: parsed.data.limit ?? 30 }
    const items = await provider.search(query)
    await prisma.searchJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        rawResultsCount: items.length,
        validResults: items.length,
        finishedAt: new Date(),
      },
    })

    return NextResponse.json({ jobId: job.id, items })
  } catch (err) {
    await prisma.searchJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Errore provider",
        finishedAt: new Date(),
      },
    })
    return NextResponse.json({ error: "Errore durante la ricerca" }, { status: 500 })
  }
}
