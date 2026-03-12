import { z } from "zod"
import { ProviderLead, ProviderSearchQuery } from "./types"

export async function parseHubSearch(query: ProviderSearchQuery): Promise<ProviderLead[]> {
  const PARSEHUB_API_KEY = process.env.PARSEHUB_API_KEY
  const PARSEHUB_PROJECT_TOKEN = process.env.PARSEHUB_PROJECT_TOKEN

  if (!PARSEHUB_API_KEY || !PARSEHUB_PROJECT_TOKEN) {
    throw new Error("Mancano le configurazioni PARSEHUB_API_KEY o PARSEHUB_PROJECT_TOKEN nel file .env")
  }

  console.log(`[ParseHub] Fetching last ready run for project: ${PARSEHUB_PROJECT_TOKEN}`)
  
  // Endpoint per l'ultima esecuzione pronta
  const url = `https://www.parsehub.com/api/v2/projects/${PARSEHUB_PROJECT_TOKEN}/last_ready_run/data`
  
  let rawData: any = null

  try {
    const response = await fetch(`${url}?api_key=${PARSEHUB_API_KEY}`, {
      method: "GET",
      // ParseHub API returns gzip compressed JSON
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error(`ParseHub Error [${response.status}]:`, errorText)
        throw new Error(`ParseHub API error: ${response.status}`)
    }

    rawData = await response.json()
  } catch (e) {
    console.error(`ParseHub fetch error:`, e)
    return []
  }

  // ParseHub returns custom JSON based on template.
  // We assume the user creates a list of elements (e.g., "businesses", "results", "leads")
  // Or maybe it's completely flat. Let's try to find an array of objects.
  let itemsArray: any[] = []

  if (Array.isArray(rawData)) {
    itemsArray = rawData
  } else if (typeof rawData === "object" && rawData !== null) {
      // Find the first value that is an array
      for (const key of Object.keys(rawData)) {
          if (Array.isArray(rawData[key])) {
              itemsArray = rawData[key]
              break
          }
      }
      // If we couldn't find an array, maybe it's a single object (unlikely for a list of leads)
      if (itemsArray.length === 0) {
          itemsArray = [rawData]
      }
  }

  console.log(`[ParseHub] Found ${itemsArray.length} items from run data.`)

  // ParseHub data keys are defined by the user in the ParseHub UI.
  // We will do a fuzzy match (case-insensitive, ignoring spaces) to standard fields.
  const findField = (item: any, possibleNames: string[]) => {
      if (!item) return undefined
      const keys = Object.keys(item)
      for (const name of possibleNames) {
          const match = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, "") === name)
          if (match && item[match]) return item[match]
      }
      return undefined
  }

  const parseRating = (val: any) => {
      if (!val) return undefined
      const num = parseFloat(String(val).replace(",", "."))
      return isNaN(num) ? undefined : num
  }
  
  const parseReviews = (val: any) => {
      if (!val) return undefined
      const cleaned = String(val).replace(/[^0-9]/g, "")
      const num = parseInt(cleaned, 10)
      return isNaN(num) ? undefined : num
  }

  // Map to internal ProviderLead
  const mappedPlaces: ProviderLead[] = itemsArray.map((item, index) => {
      // Common names a user might name their selections in ParseHub
      const businessName = findField(item, ["name", "title", "business", "company", "nome", "attivita"]) || `ParseHub_Lead_${index}`
      const websiteUrl = findField(item, ["website", "site", "url", "link", "sito"])
      const email = findField(item, ["email", "mail", "contactemail"])
      const phone = findField(item, ["phone", "telefono", "tel"])
      const address = findField(item, ["address", "indirizzo", "location"])
      const rating = findField(item, ["rating", "score", "voto", "stars", "stelle"])
      const reviews = findField(item, ["reviews", "recensioni", "reviewscount"])
      const category = findField(item, ["category", "type", "categoria", "tipo", "industry"]) || query.category
      
      return {
          // Use name + index if there's no unique url to id with
          externalId: websiteUrl || `${businessName}_${index}`,
          businessName: String(businessName),
          category: category ? String(category) : undefined,
          address: address ? String(address) : undefined,
          city: query.city, // We fallback to the query filter
          region: query.region, 
          rating: parseRating(rating),
          reviewsCount: parseReviews(reviews),
          websiteUrl: websiteUrl ? String(websiteUrl) : undefined,
          sourceUrl: websiteUrl ? String(websiteUrl) : undefined, // Parsehub doesn't give a directory url usually
          phone: phone ? String(phone) : undefined,
          email: email ? String(email) : undefined,
          raw: item, // save the original custom json
      }
  })

  // Applica filtri UI localmente dato che ParseHub restituisce l'intero dataset
  const filteredPlaces = mappedPlaces.filter(place => {
      // 1. Text Query (if user uses the search bar)
      // Note: The main search route.ts might not pass `q` to provider query in the current architecture, 
      // but we handle constraints passed in `query` like onlyNoWebsite, rating, reviews.
      
      if (query.ratingMin && (place.rating || 0) < query.ratingMin) return false
      if (query.reviewsMin && (place.reviewsCount || 0) < query.reviewsMin) return false
      if (query.onlyNoWebsite && place.websiteUrl) return false

      // Parsehub doesn't natively give closed status unless specifically scraped, so we skip closed filtering here
      return true
  })

  console.log(`[ParseHub] Final localized list: ${filteredPlaces.length} (after applying filters)`)

  return filteredPlaces
}
