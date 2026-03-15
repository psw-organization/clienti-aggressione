import { providers } from "@/lib/providers/registry"
import { classifyWebsite } from "@/lib/leads/website-detection"
import type { ProviderId, ProviderLead, ProviderSearchQuery, ProviderSelection } from "@/lib/providers/types"
import { stripUnreachableWebsites } from "@/lib/providers/website-health"

export type SearchFlowDecision = {
  requestedProvider: ProviderSelection
  primaryProvider: ProviderId
  fallbackProvider?: ProviderId
  reasons: string[]
}

type UnifiedSearchResult = {
  items: ProviderLead[]
  decision: SearchFlowDecision
  usedFallback: boolean
  counts: {
    primary: number
    fallback: number
    final: number
  }
}

function hasCredentials(providerId: ProviderId): boolean {
  if (providerId === "google") return Boolean(process.env.GOOGLE_PLACES_API_KEY)
  if (providerId === "serpapi" || providerId === "serpapi_region") return Boolean(process.env.SERPAPI_KEY)
  if (providerId === "parsehub") return Boolean(process.env.PARSEHUB_API_KEY && process.env.PARSEHUB_PROJECT_TOKEN)
  return true
}

function dedupeLeads(items: ProviderLead[]): ProviderLead[] {
  const seen = new Set<string>()
  const unique: ProviderLead[] = []
  for (const item of items) {
    const key =
      item.externalId?.trim() ||
      `${(item.businessName || "").trim().toLowerCase()}|${(item.address || "").trim().toLowerCase()}|${(item.city || "").trim().toLowerCase()}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }
  return unique
}

function applyStandardFilters(items: ProviderLead[], query: ProviderSearchQuery): ProviderLead[] {
  return items.filter((item) => {
    const website = classifyWebsite(item.websiteUrl, [])
    const hasOfficialWebsite = website.presence === "official"
    if (typeof query.ratingMin === "number" && (item.rating || 0) < query.ratingMin) return false
    if (typeof query.reviewsMin === "number" && (item.reviewsCount || 0) < query.reviewsMin) return false
    if (query.onlyNoWebsite && hasOfficialWebsite) return false
    if (query.excludeChains && Boolean(item.chainDetected)) return false
    if (item.isVerifiedActive === false) return false
    return true
  })
}

function normalizeLead(item: ProviderLead): ProviderLead {
  const businessName = (item.businessName || "").trim()
  return {
    ...item,
    externalId: (item.externalId || businessName).trim(),
    businessName,
    category: item.category?.trim() || undefined,
    address: item.address?.trim() || undefined,
    city: item.city?.trim() || undefined,
    province: item.province?.trim() || undefined,
    region: item.region?.trim() || undefined,
    country: item.country?.trim() || undefined,
    phone: item.phone?.trim() || undefined,
    email: item.email?.trim() || undefined,
    websiteUrl: item.websiteUrl?.trim() || undefined,
    instagramUrl: item.instagramUrl?.trim() || undefined,
    facebookUrl: item.facebookUrl?.trim() || undefined,
    sourceUrl: item.sourceUrl?.trim() || undefined,
  }
}

function canUse(providerId: ProviderId, enabledProviders: Set<ProviderId>) {
  return enabledProviders.has(providerId)
}

export function resolveSearchFlowDecision(
  requestedProvider: ProviderSelection,
  query: ProviderSearchQuery,
  enabledProviders: Set<ProviderId>
): SearchFlowDecision {
  const availableProviders = new Set(
    Array.from(enabledProviders).filter((providerId) => hasCredentials(providerId))
  )

  if (requestedProvider !== "auto") {
    if (!availableProviders.has(requestedProvider)) {
      throw new Error(`Provider ${requestedProvider} non configurato o disabilitato`)
    }
    return {
      requestedProvider,
      primaryProvider: requestedProvider,
      reasons: ["Provider selezionato manualmente"],
    }
  }

  if (query.region && !query.city && canUse("serpapi_region", availableProviders)) {
    return {
      requestedProvider,
      primaryProvider: "serpapi_region",
      fallbackProvider: canUse("google", availableProviders) ? "google" : undefined,
      reasons: ["Regione senza città specifica: attivo scan multi-città"],
    }
  }

  if (query.onlyNoWebsite && canUse("serpapi", availableProviders)) {
    return {
      requestedProvider,
      primaryProvider: "serpapi",
      fallbackProvider: canUse("google", availableProviders) ? "google" : undefined,
      reasons: ["Ricerca senza sito: priorità a SerpApi per copertura local result"],
    }
  }

  if (query.city && canUse("google", availableProviders)) {
    return {
      requestedProvider,
      primaryProvider: "google",
      fallbackProvider: canUse("serpapi", availableProviders) ? "serpapi" : undefined,
      reasons: ["Città specifica: priorità a Google Places per precisione geografica"],
    }
  }

  if (canUse("serpapi", availableProviders)) {
    return {
      requestedProvider,
      primaryProvider: "serpapi",
      fallbackProvider: canUse("google", availableProviders) ? "google" : undefined,
      reasons: ["Fallback automatico: SerpApi disponibile"],
    }
  }

  if (canUse("google", availableProviders)) {
    return {
      requestedProvider,
      primaryProvider: "google",
      fallbackProvider: canUse("serpapi", availableProviders) ? "serpapi" : undefined,
      reasons: ["Fallback automatico: Google disponibile"],
    }
  }

  if (canUse("mock", availableProviders)) {
    return {
      requestedProvider,
      primaryProvider: "mock",
      reasons: ["Nessun provider live disponibile, uso mock"],
    }
  }

  return {
    requestedProvider,
    primaryProvider: "parsehub",
    reasons: ["Fallback finale su ParseHub"],
  }
}

export async function runUnifiedProviderSearch({
  requestedProvider,
  query,
  enabledProviders,
}: {
  requestedProvider: ProviderSelection
  query: ProviderSearchQuery
  enabledProviders: Set<ProviderId>
}): Promise<UnifiedSearchResult> {
  const decision = resolveSearchFlowDecision(requestedProvider, query, enabledProviders)
  const runProvider = async (providerId: ProviderId) => {
    const provider = providers[providerId]
    if (!provider) {
      throw new Error(`Provider ${providerId} non supportato`)
    }
    if (!canUse(providerId, enabledProviders)) {
      throw new Error(`Provider ${providerId} disabilitato`)
    }
    if (!hasCredentials(providerId)) {
      throw new Error(`Provider ${providerId} non configurato`)
    }
    const raw = await provider.search({ ...query, providerId })
    const normalized = raw.map(normalizeLead)
    const reachable = await stripUnreachableWebsites(normalized)
    return dedupeLeads(applyStandardFilters(reachable, query))
  }

  let primaryItems: ProviderLead[] = []
  let primaryError: string | null = null
  try {
    primaryItems = await runProvider(decision.primaryProvider)
  } catch (error) {
    primaryError = error instanceof Error ? error.message : "Errore provider primario"
    if (requestedProvider !== "auto" || !decision.fallbackProvider) {
      throw new Error(primaryError)
    }
  }

  let fallbackItems: ProviderLead[] = []
  let usedFallback = false
  const shouldUseFallback =
    requestedProvider === "auto" &&
    Boolean(decision.fallbackProvider) &&
    (primaryItems.length < Math.min(query.limit ?? 30, 12) || Boolean(primaryError))

  if (shouldUseFallback && decision.fallbackProvider) {
    fallbackItems = await runProvider(decision.fallbackProvider)
    usedFallback = fallbackItems.length > 0 || Boolean(primaryError)
  }

  if (primaryItems.length === 0 && fallbackItems.length === 0 && primaryError) {
    throw new Error(primaryError)
  }

  const merged = dedupeLeads([...primaryItems, ...fallbackItems])
  const limited = merged.slice(0, query.limit ?? 30)

  return {
    items: limited,
    decision,
    usedFallback,
    counts: {
      primary: primaryItems.length,
      fallback: fallbackItems.length,
      final: limited.length,
    },
  }
}
