import type { ProviderLead, ProviderSearchQuery } from "./types"
import { serpApiSearch } from "./serp-api"
import { regionCities } from "./regions"

export async function serpApiRegionScan(query: ProviderSearchQuery): Promise<ProviderLead[]> {
  if (!query.region) {
    throw new Error("Per la scansione regionale è richiesto il campo 'region'")
  }
  const cities = regionCities[query.region] || []
  if (cities.length === 0) {
    // fallback: se non mappata, usa city singola se fornita
    if (query.city) {
      return await serpApiSearch(query)
    }
    throw new Error(`Regione non mappata per scansione: ${query.region}`)
  }

  const perCityResults: ProviderLead[][] = await Promise.all(
    cities.map((city) => serpApiSearch({ ...query, city, limit: query.limit ?? 100 }))
  )

  const all = perCityResults.flat()

  // Deduplica su externalId o combinazione (businessName + city)
  const seen = new Set<string>()
  const unique: ProviderLead[] = []
  for (const item of all) {
    const key =
      (item.externalId && `${item.externalId}`) ||
      `${(item.businessName || "").toLowerCase()}|${(item.city || "").toLowerCase()}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(item)
    }
  }

  // Se l'utente ha richiesto "solo senza sito", applica filtro lato provider output (websiteUrl assente)
  if ((query as any).onlyNoWebsite) {
    return unique.filter((i) => !i.websiteUrl)
  }

  return unique
}
