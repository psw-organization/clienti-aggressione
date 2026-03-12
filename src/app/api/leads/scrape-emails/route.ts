import { NextResponse } from "next/server"
import { z } from "zod"
import { scrapeEmailFromUrl } from "@/lib/email-scraper"

const bodySchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    businessName: z.string(),
    websiteUrl: z.string().nullable().optional()
  }))
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const { items } = parsed.data
    const results = []

    // Processa in parallelo con un limite di concorrenza per non sovraccaricare
    // (In Vercel/NextJS serverless meglio non esagerare con i thread)
    const promises = items.map(async (item) => {
      // Se non ha sito, passa null come url ma passa il nome per la ricerca social
      const urlToScrape = item.websiteUrl || null

      try {
        const email = await scrapeEmailFromUrl(urlToScrape, item.businessName)
        if (email) {
          return {
            id: item.id,
            businessName: item.businessName,
            email
          }
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