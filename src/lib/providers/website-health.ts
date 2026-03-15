import type { ProviderLead } from "./types"

const notFoundPatterns = [
  "not found",
  "page not found",
  "pagina non trovata",
  "errore 404",
  "error 404",
  "doesn't exist",
  "does not exist",
  "non disponibile",
]

const invalidPathPatterns = ["/404", "not-found", "not_found", "/error", "page-not-found"]

const websiteCheckCache = new Map<string, Promise<boolean>>()

function lower(value: string | undefined) {
  return (value || "").toLowerCase()
}

export function isNotFoundLikeResponse(status: number, finalUrl: string, bodySnippet: string) {
  const body = lower(bodySnippet)
  const finalUrlLower = lower(finalUrl)

  if (status === 404 || status === 410 || status === 451) return true
  if (status >= 500) return true
  if (invalidPathPatterns.some((token) => finalUrlLower.includes(token))) return true
  if (notFoundPatterns.some((token) => body.includes(token))) return true
  return false
}

async function checkWebsiteReachability(url: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; FoodLeadEngine/1.0; +https://localhost)",
      },
    })

    const contentType = lower(response.headers.get("content-type") || "")
    let bodySnippet = ""
    if (contentType.includes("text/html") || contentType.includes("text/plain")) {
      const text = await response.text()
      bodySnippet = text.slice(0, 4000)
    }

    return !isNotFoundLikeResponse(response.status, response.url || parsed.toString(), bodySnippet)
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function hasReachableWebsite(url: string) {
  const key = url.trim().toLowerCase()
  if (!key) return false
  if (!websiteCheckCache.has(key)) {
    websiteCheckCache.set(key, checkWebsiteReachability(url))
  }
  return websiteCheckCache.get(key) as Promise<boolean>
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
) {
  const results: R[] = new Array(items.length)
  let index = 0

  async function run() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await worker(items[current])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

export async function stripUnreachableWebsites(leads: ProviderLead[]) {
  return mapWithConcurrency(leads, 6, async (lead) => {
    if (!lead.websiteUrl) return lead
    const reachable = await hasReachableWebsite(lead.websiteUrl)
    if (reachable) return lead
    return { ...lead, websiteUrl: undefined }
  })
}
