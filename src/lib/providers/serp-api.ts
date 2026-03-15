import { ProviderLead, ProviderSearchQuery } from "./types"
import { scrapeEmailFromUrl } from "../email-scraper"
import { isOfficialWebsiteHost } from "../leads/website-detection"

// Estrae city e codice provincia da un indirizzo italiano formattato
// Es: "Via Roma 1, 80100 Napoli NA, Italia" → { city: "Napoli", province: "NA" }
function parseItalianAddress(address?: string): { city?: string; province?: string } {
  if (!address) return {}
  // Pattern: CAP (5 cifre) + città + opzionale codice provincia 2 lettere
  const m = address.match(/\b(\d{5})\s+([\wÀ-ú''\s-]+?)\s*([A-Z]{2})?\s*(?:,|$)/)
  if (!m) return {}
  return {
    city: m[2]?.trim() || undefined,
    province: m[3] || undefined,
  }
}

// Estrae il sito web dal risultato google_maps (campo top-level "website")
function extractWebsite(place: Record<string, unknown>): string | undefined {
  const w = place["website"]
  return typeof w === "string" && w ? w : undefined
}

export async function serpApiSearch(query: ProviderSearchQuery): Promise<ProviderLead[]> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY
  if (!SERPAPI_KEY) {
    throw new Error("Manca la configurazione SERPAPI_KEY nel file .env")
  }

  // Per ricerche regionali (region scan = N città × categorie) usiamo 3 categorie core
  // per ridurre le chiamate API totali (es. Toscana: 10 città × 3 cat × 2 pag = 60 calls).
  // Per singola città/provincia usiamo 5 categorie per massimizzare i risultati.
  const defaultCategories = query.region
    ? ["ristorante", "pizzeria", "bar"]
    : ["ristorante", "pizzeria", "pub", "trattoria", "bar"]

  const categoriesToSearch = query.category ? [query.category] : defaultCategories

  // google_maps supporta paginazione: start=0 (1-20), start=20 (21-40)
  // Limitiamo a 2 pagine per default per non esaurire i crediti SerpAPI.
  // Il volume viene da numero di città × categorie nel region scan, non da pagine extra.
  const pagesToFetch = 2
  const MAX_PER_PAGE = 20

  const executeSearch = async (categoryTerm: string): Promise<Record<string, unknown>[]> => {
    // Costruisci la query geografica
    const locationParts: string[] = []
    if (query.city) locationParts.push(query.city)
    else if (query.province) locationParts.push(query.province)
    else if (query.region) locationParts.push(query.region)
    if (!locationParts.length) locationParts.push("Italia")

    const textQuery = `${categoryTerm} ${locationParts.join(" ")}`
    console.log(`[SerpApi] Searching google_maps: "${textQuery}" (${pagesToFetch} pages)`)

    const allResults: Record<string, unknown>[] = []

    for (let page = 0; page < pagesToFetch; page++) {
      const url = new URL("https://serpapi.com/search.json")
      url.searchParams.append("engine", "google_maps")
      url.searchParams.append("type", "search")
      url.searchParams.append("q", textQuery)
      url.searchParams.append("gl", "it")
      url.searchParams.append("hl", "it")
      url.searchParams.append("start", String(page * MAX_PER_PAGE))
      url.searchParams.append("api_key", SERPAPI_KEY)

      try {
        const response = await fetch(url.toString())
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[SerpApi] Error for "${categoryTerm}" page ${page}:`, errorText)
          break
        }

        const data = await response.json()
        const results: Record<string, unknown>[] = data.local_results || []
        console.log(`[SerpApi] Page ${page} for "${categoryTerm}": ${results.length} results`)

        if (results.length === 0) break // Non ci sono altri risultati

        allResults.push(...results)
      } catch (e) {
        console.error(`[SerpApi] Fetch error for "${categoryTerm}" page ${page}:`, e)
        break
      }
    }

    return allResults
  }

  // Ricerche parallele per categoria
  const resultsArrays = await Promise.all(categoriesToSearch.map((cat) => executeSearch(cat)))
  const allPlaces = resultsArrays.flat()

  // Deduplicazione per place_id / data_id / titolo
  const uniquePlacesMap = new Map<string, Record<string, unknown>>()
  for (const place of allPlaces) {
    const id = (place["place_id"] as string) || (place["data_id"] as string) || (place["title"] as string)
    if (id && !uniquePlacesMap.has(id)) {
      uniquePlacesMap.set(id, place)
    }
  }

  const places = Array.from(uniquePlacesMap.values())
  console.log(`[SerpApi] Total unique places: ${places.length}`)

  // Filtro e mappatura
  const mappedPlaces: ProviderLead[] = places
    .filter((place) => {
      if (query.reviewsMin && ((place["reviews"] as number) || 0) < query.reviewsMin) return false
      if (query.ratingMin && ((place["rating"] as number) || 0) < query.ratingMin) return false

      const websiteUrl = extractWebsite(place)
      // Filtra solo se ha un sito UFFICIALE (non business.site, social, directory)
      if (query.onlyNoWebsite && websiteUrl) {
        try {
          const { hostname } = new URL(websiteUrl)
          if (isOfficialWebsiteHost(hostname)) return false
        } catch {
          // URL malformato → non è un sito ufficiale
        }
      }

      // Filtra attività chiuse
      const openState = ((place["open_state"] as string) || "").toLowerCase()
      if (openState.includes("temporarily closed") || openState.includes("permanently closed")) return false
      if (openState.includes("chiuso definitivamente") || openState.includes("temporaneamente chiuso")) return false

      return true
    })
    .map((place) => {
      const websiteUrl = extractWebsite(place)
      const id = (place["place_id"] as string) || (place["data_id"] as string) || (place["title"] as string)
      const address = place["address"] as string | undefined

      // Tenta di estrarre city/province dall'indirizzo se non forniti
      const parsed = parseItalianAddress(address)
      const city = query.city || parsed.city
      const province = query.province || parsed.province

      return {
        externalId: id,
        businessName: place["title"] as string,
        category: (place["type"] as string) || query.category,
        address,
        city,
        province,
        region: query.region,
        rating: place["rating"] as number | undefined,
        reviewsCount: place["reviews"] as number | undefined,
        websiteUrl,
        sourceUrl: place["place_id"]
          ? `https://www.google.com/maps/place/?q=place_id:${place["place_id"]}`
          : undefined,
        phone: place["phone"] as string | undefined,
        latitude: (place["gps_coordinates"] as { latitude?: number } | undefined)?.latitude,
        longitude: (place["gps_coordinates"] as { longitude?: number } | undefined)?.longitude,
        raw: place,
      }
    })

  // Scraping email per lead con sito web
  // Per lead senza sito, il button "Trova Email" nella UI chiama /api/leads/scrape-emails
  const resultsWithEmails = await Promise.all(
    mappedPlaces.map(async (lead) => {
      if (!lead.websiteUrl) return lead
      try {
        const scrapedEmail = await scrapeEmailFromUrl(lead.websiteUrl, lead.businessName)
        if (scrapedEmail) return { ...lead, email: scrapedEmail }
      } catch (e) {
        console.error(`[SerpApi] Scraping error for ${lead.websiteUrl}:`, e)
      }
      return lead
    })
  )

  return resultsWithEmails
}
