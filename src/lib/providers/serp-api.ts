import { z } from "zod"
import { ProviderLead, ProviderSearchQuery } from "./types"
import { scrapeEmailFromUrl } from "../email-scraper"

// Top-level env reading removed to avoid Next.js caching issues.

// Helper function to extract website url and normalize it
function extractWebsite(links?: { website?: string }) {
  if (!links || !links.website) return undefined
  return links.website
}

export async function serpApiSearch(query: ProviderSearchQuery): Promise<ProviderLead[]> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY
  if (!SERPAPI_KEY) {
    throw new Error("Manca la configurazione SERPAPI_KEY nel file .env")
  }

  const categoriesToSearch = query.category 
    ? [query.category] 
    : ["ristorante", "pizzeria", "pub", "trattoria", "bar"]

  const executeSearch = async (categoryTerm: string) => {
    const textParts = []
    textParts.push(categoryTerm)
    if (query.city) textParts.push(query.city)
    if (query.province) textParts.push(query.province)
    if (query.region) textParts.push(query.region)
    
    const textQuery = textParts.join(" ")
    console.log(`[SerpApi] Searching for: ${textQuery}`)

    const url = new URL("https://serpapi.com/search.json")
    url.searchParams.append("engine", "google_local")
    url.searchParams.append("q", textQuery)
    url.searchParams.append("gl", "it") // Country
    url.searchParams.append("hl", "it") // Language
    if (query.city) {
        url.searchParams.append("location", query.city + ", Italy")
    }
    url.searchParams.append("api_key", SERPAPI_KEY)
    url.searchParams.append("num", Math.min(query.limit || 20, 20).toString())

    try {
      const response = await fetch(url.toString())
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`SerpApi Error for '${categoryTerm}':`, errorText)
        return []
      }

      const data = await response.json()
      console.log(`[SerpApi] Raw Results limit:`, data.local_results?.length)
      if (!data.local_results) console.log(`[SerpApi] Data returned:`, JSON.stringify(data).substring(0, 200))
      return data.local_results || []
    } catch (e) {
      console.error(`SerpApi fetch error for '${categoryTerm}':`, e)
      return []
    }
  }

  // Esegui tutte le ricerche in parallelo
  const resultsArrays = await Promise.all(categoriesToSearch.map(cat => executeSearch(cat)))
  
  // Appiattisci l'array di array in un unico array
  const allPlaces = resultsArrays.flat()
  
  // Deduplica i risultati basandosi sull'ID/place_id
  const uniquePlacesMap = new Map()
  for (const place of allPlaces) {
    const id = place.place_id || place.id || place.title
    if (id && !uniquePlacesMap.has(id)) {
      uniquePlacesMap.set(id, place)
    }
  }
  
  const places = Array.from(uniquePlacesMap.values())
  console.log(`[SerpApi] Total unique places found: ${places.length}`)

  // Filtra e mappa i risultati
  const mappedPlaces: ProviderLead[] = places
    .filter((place) => {
      // Filtra per recensioni minime se richiesto
      if (query.reviewsMin && (place.reviews || 0) < query.reviewsMin) return false
      
      // Filtra per rating
      if (query.ratingMin && (place.rating || 0) < query.ratingMin) return false

      // Filtra se richiesto "Solo senza sito"
      const websiteUrl = extractWebsite(place.links)
      if (query.onlyNoWebsite && websiteUrl) return false

      // Status opens
      if (place.operating_hours && place.operating_hours.includes("Temporarily closed")) return false
      if (place.operating_hours && place.operating_hours.includes("Permanently closed")) return false

      return true
    })
    .map((place) => {
        const websiteUrl = extractWebsite(place.links)
        const id = place.place_id || place.id || place.title
        return {
            externalId: id,
            businessName: place.title,
            category: place.type || query.category,
            address: place.address,
            city: query.city, // SerpApi parsing is complex for granular address, we use the requested city
            rating: place.rating,
            reviewsCount: place.reviews,
            websiteUrl: websiteUrl,
            sourceUrl: place.links?.directions || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            phone: place.phone,
            latitude: place.gps_coordinates?.latitude,
            longitude: place.gps_coordinates?.longitude,
            raw: place,
        }
    })

  // Esegui scraping delle email per i risultati filtrati
  const resultsWithEmails = await Promise.all(
    mappedPlaces.map(async (lead) => {
      if (!lead.websiteUrl) return lead // Se non ha sito, non cercare email
      
      try {
        const scrapedEmail = await scrapeEmailFromUrl(lead.websiteUrl, lead.businessName)
        if (scrapedEmail) {
          return { ...lead, email: scrapedEmail }
        }
      } catch (e) {
        console.error(`[SerpApi] Scraping error for ${lead.websiteUrl}:`, e)
      }
      return lead
    })
  )

  return resultsWithEmails
}
