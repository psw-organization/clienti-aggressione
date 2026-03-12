import type { ProviderLead, ProviderSearchQuery } from "@/lib/providers/types"

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const categories = [
  "ristorante",
  "pizzeria",
  "pub",
  "trattoria",
  "bistrot",
  "hamburgeria",
  "rosticceria",
  "bar con cucina",
  "braceria",
]

const cities = [
  { city: "Napoli", province: "NA", region: "Campania" },
  { city: "Salerno", province: "SA", region: "Campania" },
  { city: "Bari", province: "BA", region: "Puglia" },
  { city: "Lecce", province: "LE", region: "Puglia" },
  { city: "Cosenza", province: "CS", region: "Calabria" },
  { city: "Palermo", province: "PA", region: "Sicilia" },
]

export async function mockSearch(query: ProviderSearchQuery): Promise<ProviderLead[]> {
  const target = {
    city: query.city ?? pick(cities).city,
    province: query.province ?? pick(cities).province,
    region: query.region ?? pick(cities).region,
    category: query.category ?? pick(categories),
  }

  const items: ProviderLead[] = []
  for (let i = 0; i < query.limit; i += 1) {
    const rating = Math.round(rand(3.8, 4.9) * 10) / 10
    const reviewsCount = Math.floor(rand(20, 650))
    const chainDetected = Math.random() < 0.06
    const hasWebsite = Math.random() < 0.25
    const hasInstagram = Math.random() < 0.65
    const hasFacebook = Math.random() < 0.45

    const baseName = `${target.category} ${target.city}`
    const businessName = `${baseName} ${i + 1}`
    const externalId = `mock_${target.city.toLowerCase()}_${i + 1}`
    const websiteUrl = hasWebsite ? `https://${businessName.toLowerCase().replace(/\s+/g, "")}.it` : undefined

    const instagramUrl = hasInstagram ? `https://instagram.com/${businessName.toLowerCase().replace(/\s+/g, "")}` : undefined
    const facebookUrl = hasFacebook ? `https://facebook.com/${businessName.toLowerCase().replace(/\s+/g, "")}` : undefined

    const item: ProviderLead = {
      externalId,
      businessName,
      category: target.category,
      address: `Via ${pick(["Roma", "Garibaldi", "Verdi", "Manzoni"])}, ${Math.floor(rand(1, 180))}`,
      city: target.city,
      province: target.province,
      region: target.region,
      country: "IT",
      latitude: 40.85 + rand(-0.3, 0.3),
      longitude: 14.25 + rand(-0.3, 0.3),
      phone: `+39 3${Math.floor(rand(10, 99))} ${Math.floor(rand(1000000, 9999999))}`,
      rating,
      reviewsCount,
      websiteUrl,
      instagramUrl,
      facebookUrl,
      sourceUrl: `https://maps.google.com/?q=${encodeURIComponent(businessName)}`,
      chainDetected,
      isVerifiedActive: true,
      raw: {
        mock: true,
        generatedAt: new Date().toISOString(),
      },
    }

    if (query.onlyNoWebsite && websiteUrl) continue
    if (query.excludeChains && chainDetected) continue
    if (typeof query.ratingMin === "number" && rating < query.ratingMin) continue
    if (typeof query.reviewsMin === "number" && reviewsCount < query.reviewsMin) continue

    items.push(item)
  }

  return items
}
