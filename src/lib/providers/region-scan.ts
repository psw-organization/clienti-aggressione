import type { ProviderLead, ProviderSearchQuery } from "./types"
import { serpApiSearch } from "./serp-api"
import { regionCities, normalizeRegionName } from "./regions"

export async function serpApiRegionScan(query: ProviderSearchQuery): Promise<ProviderLead[]> {
  if (!query.region) {
    throw new Error("Per la scansione regionale è richiesto il campo 'region'")
  }

  const normalizedRegion = normalizeRegionName(query.region)
  const cities = regionCities[normalizedRegion] || []

  if (cities.length === 0) {
    // Fallback: se la regione non è mappata, usa la singola città se fornita
    if (query.city) {
      return await serpApiSearch(query)
    }
    throw new Error(
      `Regione non riconosciuta: "${query.region}". Regioni disponibili: ${Object.keys(regionCities).join(", ")}`
    )
  }

  console.log(`[RegionScan] Scansione "${normalizedRegion}": ${cities.length} città`)

  // Batching: processiamo 4 città alla volta per evitare di sovraccaricare SerpAPI in parallelo.
  // Toscana (10 città, 3 cat, 2 pag) = 60 chiamate totali → ~4 batch × ~15 chiamate parallele = ok.
  const BATCH_SIZE = 4
  const perCityResults: ProviderLead[][] = []

  for (let i = 0; i < cities.length; i += BATCH_SIZE) {
    const batch = cities.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((city) =>
        serpApiSearch({ ...query, region: normalizedRegion, city, limit: 100 }).catch((err) => {
          console.error(`[RegionScan] Errore per città ${city}:`, err)
          return [] as ProviderLead[]
        })
      )
    )
    perCityResults.push(...batchResults)
  }

  const all = perCityResults.flat()
  console.log(`[RegionScan] Totale raw (pre-dedup): ${all.length}`)

  // Deduplica su externalId o combinazione (businessName + city)
  const seen = new Set<string>()
  const unique: ProviderLead[] = []
  for (const item of all) {
    const key =
      item.externalId?.trim() ||
      `${(item.businessName || "").toLowerCase()}|${(item.city || "").toLowerCase()}`
    if (key && !seen.has(key)) {
      seen.add(key)
      unique.push(item)
    }
  }

  console.log(`[RegionScan] Totale dopo dedup: ${unique.length}`)
  return unique
}
