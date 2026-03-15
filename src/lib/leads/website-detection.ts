import { normalizeDomain } from "@/lib/leads/normalize"

const socialHosts = new Set([
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "tiktok.com",
  "www.tiktok.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
])

const directoryHosts = new Set([
  "tripadvisor.it",
  "tripadvisor.com",
  "www.tripadvisor.it",
  "www.tripadvisor.com",
  "thefork.it",
  "www.thefork.it",
  "just-eat.it",
  "www.just-eat.it",
  "glovoapp.com",
  "www.glovoapp.com",
  "deliveroo.it",
  "www.deliveroo.it",
  "google.com",
  "www.google.com",
  "maps.app.goo.gl",
  "paginegialle.it",
  "www.paginegialle.it",
  "sluurpy.it",
  "www.sluurpy.it",
  "menulo.it",
  "www.menulo.it",
  "restaurantguru.com",
  "it.restaurantguru.com",
])

// Suffissi di dominio che identificano siti NON ufficiali (auto-generati, aggregatori, ecc.)
// Usato per riconoscere host che non corrispondono a un sito web di proprietà dell'attività.
const directoryHostSuffixes = [
  ".business.site",      // Google Business Sites (dismesso 2024, spesso dà 404)
  ".sites.google.com",   // Google Sites
  ".googleusercontent.com",
  ".goo.gl",
]

export function isOfficialWebsiteHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (socialHosts.has(h)) return false
  if (directoryHosts.has(h)) return false
  if (directoryHostSuffixes.some((suffix) => h.endsWith(suffix) || h === suffix.slice(1))) return false
  return true
}

export type WebsitePresence = "official" | "social" | "directory" | "none"

export function classifyWebsite(url: string | null | undefined, blacklistDomains: string[]) {
  const trimmed = url?.trim()
  if (!trimmed) return { presence: "none" as WebsitePresence, domain: undefined as string | undefined }

  let host: string | undefined
  try {
    const u = new URL(trimmed)
    host = u.hostname.toLowerCase()
  } catch {
    return { presence: "none" as WebsitePresence, domain: undefined as string | undefined }
  }

  const domain = normalizeDomain(trimmed)
  const blocked = domain ? blacklistDomains.includes(domain) : false

  if (host && socialHosts.has(host)) {
    return { presence: "social" as WebsitePresence, domain }
  }

  if (host && directoryHosts.has(host)) {
    return { presence: "directory" as WebsitePresence, domain }
  }

  if (host && !isOfficialWebsiteHost(host)) {
    return { presence: "directory" as WebsitePresence, domain }
  }

  if (blocked) {
    return { presence: "directory" as WebsitePresence, domain }
  }

  return { presence: "official" as WebsitePresence, domain }
}
