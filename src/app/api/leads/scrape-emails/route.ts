import { NextResponse } from "next/server"
import { z } from "zod"
import { scrapeEmailFromUrl } from "@/lib/email-scraper"

const bodySchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      businessName: z.string(),
      websiteUrl: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
    })
  ),
})

const BATCH_SIZE = 3

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const { items } = parsed.data
    const results: Array<{ id: string; businessName: string; email: string }> = []

    // Processa in batch per non esaurire i crediti SerpAPI
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const email = await scrapeEmailFromUrl(
              item.websiteUrl ?? null,
              item.businessName,
              item.city ?? undefined
            )
            if (email) return { id: item.id, businessName: item.businessName, email }
          } catch (e) {
            console.error(`Scrape failed for ${item.businessName}:`, e)
          }
          return null
        })
      )
      results.push(...batchResults.filter((r): r is NonNullable<typeof r> => r !== null))
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Scrape API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
