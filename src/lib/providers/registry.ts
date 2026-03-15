import type { ProviderId, ProviderLead, ProviderSearchQuery } from "@/lib/providers/types"
import { mockSearch } from "@/lib/providers/mock-provider"
import { googleSearch } from "@/lib/providers/google-places"
import { serpApiSearch } from "@/lib/providers/serp-api"
import { serpApiRegionScan } from "@/lib/providers/region-scan"
import { parseHubSearch } from "@/lib/providers/parsehub"

export type LeadProvider = {
  id: ProviderId
  name: string
  search: (query: ProviderSearchQuery) => Promise<ProviderLead[]>
}

export const providers: Record<ProviderId, LeadProvider> = {
  mock: {
    id: "mock",
    name: "Mock Provider (demo)",
    search: mockSearch,
  },
  google: {
    id: "google",
    name: "Google Places API (New)",
    search: googleSearch,
  },
  serpapi: {
    id: "serpapi",
    name: "SerpApi Google Local",
    search: serpApiSearch,
  },
  serpapi_region: {
    id: "serpapi_region",
    name: "SerpApi Region Scan (multi-città)",
    search: serpApiRegionScan,
  },
  parsehub: {
    id: "parsehub",
    name: "ParseHub Last Run Import",
    search: parseHubSearch,
  },
}
