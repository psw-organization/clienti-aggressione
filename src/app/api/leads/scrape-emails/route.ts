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

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const { items } = parsed.data

    const promises = items.map(async (item) => {
      const urlToScrape = item.websiteUrl || null
      const city = item.city || undefined

      try {
        const email = await scrapeEmailFromUrl(urlToScrape, item.businessName, city)
        if (email) {
          return { id: item.id, businessName: item.businessName, email }
        }
      } catch (e) {
        console.error(`Scrape failed for ${item.businessName}:`, e)
      }
      return null
    })

    const scrapedData = (await Promise.all(promises)).filter(Boolean)

    return NextResponse.json({ results: scrapedData })
  } catch (error) {
    console.error("Scrape API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
