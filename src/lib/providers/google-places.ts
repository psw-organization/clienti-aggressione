import { z } from "zod"
import { ProviderLead, ProviderSearchQuery } from "./types"
import { scrapeEmailFromUrl } from "../email-scraper"

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText"

// Schema di risposta parziale per Google Places (New) API
const googlePlaceSchema = z.object({
  name: z.string(),
  id: z.string(),
  displayName: z.object({
    text: z.string(),
    languageCode: z.string().optional(),
  }).optional(),
  formattedAddress: z.string().optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  websiteUri: z.string().optional(),
  googleMapsUri: z.string().optional(),
  businessStatus: z.string().optional(),
  nationalPhoneNumber: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  types: z.array(z.string()).optional(),
})

const googleSearchResponseSchema = z.object({
  places: z.array(googlePlaceSchema).optional(),
})

export async function googleSearch(query: ProviderSearchQuery): Promise<ProviderLead[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Manca la configurazione GOOGLE_PLACES_API_KEY")
  }

  // Se non c'è una categoria specifica, cerchiamo per più categorie in parallelo
  // Questo risolve il problema dei "pochi risultati" con query generiche
  const categoriesToSearch = query.category 
    ? [query.category] 
    : ["ristorante", "pizzeria", "pub", "trattoria", "bar"]

  // Funzione helper per eseguire una singola ricerca
  const executeSearch = async (categoryTerm: string) => {
    const textParts = []
    textParts.push(categoryTerm)
    if (query.city) textParts.push(query.city)
    if (query.province) textParts.push(query.province)
    if (query.region) textParts.push(query.region)
    
    const textQuery = textParts.join(" ")

    const requestBody = {
      textQuery,
      languageCode: "it",
      minRating: query.ratingMin,
      openNow: false,
      maxResultCount: Math.min(query.limit || 20, 20),
    }

    const fieldMask = [
      "places.name",
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.rating",
      "places.userRatingCount",
      "places.websiteUri",
      "places.googleMapsUri",
      "places.businessStatus",
      "places.nationalPhoneNumber",
      "places.location",
      "places.types",
    ].join(",")

    const response = await fetch(GOOGLE_PLACES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Google API Error for '${categoryTerm}':`, errorText)
      return [] // Continua con le altre categorie anche se una fallisce
    }

    const data = await response.json()
    const parsed = googleSearchResponseSchema.safeParse(data)
    
    if (!parsed.success) {
      console.error(`Google Places parse error for '${categoryTerm}':`, parsed.error)
      return []
    }

    return parsed.data.places || []
  }

  // Esegui tutte le ricerche in parallelo
  const resultsArrays = await Promise.all(categoriesToSearch.map(cat => executeSearch(cat)))
  
  // Appiattisci l'array di array in un unico array
  const allPlaces = resultsArrays.flat()
  
  // Deduplica i risultati basandosi sull'ID
  const uniquePlacesMap = new Map()
  for (const place of allPlaces) {
    if (!uniquePlacesMap.has(place.id)) {
      uniquePlacesMap.set(place.id, place)
    }
  }
  
  const places = Array.from(uniquePlacesMap.values())
  console.log(`Total unique places found: ${places.length}`)

  // Filtra e mappa i risultati
  const mappedPlaces = places
    .filter((place) => {
      // Filtra risultati che sono località o regioni amministrative
      if (place.types?.some((t: string) => ["locality", "political", "administrative_area_level_1", "administrative_area_level_2"].includes(t))) return false

      // Filtra per recensioni minime se richiesto
      if (query.reviewsMin && (place.userRatingCount || 0) < query.reviewsMin) return false
      
      // Filtra per business status (solo operativi)
      // if (place.businessStatus !== "OPERATIONAL") return false // Temporaneamente disabilitato per debug

      // Filtra se richiesto "Solo senza sito"
      if (query.onlyNoWebsite && place.websiteUri) return false

      return true
    })
    .map((place) => ({
      externalId: place.id,
      businessName: place.displayName?.text || place.name.replace(/^places\//, ""), // Usa displayName se presente
      category: place.types?.[0] || query.category,
      address: place.formattedAddress,
      city: query.city, // Google non restituisce sempre città separata facilmente, usiamo input
      rating: place.rating,
      reviewsCount: place.userRatingCount,
      websiteUrl: place.websiteUri,
      sourceUrl: place.googleMapsUri,
      phone: place.nationalPhoneNumber,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      raw: place as Record<string, unknown>,
    }))

  // Esegui scraping delle email per i risultati filtrati
  // Questo richiede tempo, quindi si esegue in batch o in parallelo
  const resultsWithEmails = await Promise.all(
    mappedPlaces.map(async (lead) => {
      if (!lead.websiteUrl) return lead // Se non ha sito, non cercare email
      
      try {
        const scrapedEmail = await scrapeEmailFromUrl(lead.websiteUrl, lead.businessName)
        if (scrapedEmail) {
          return { ...lead, email: scrapedEmail }
        }
      } catch (e) {
        console.error(`Scraping error for ${lead.websiteUrl}:`, e)
      }
      return lead
    })
  )

  return resultsWithEmails
}
