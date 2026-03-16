import * as cheerio from "cheerio"

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const OBFUSCATED_EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+\s*[\[\(]at[\]\)]\s*[a-zA-Z0-9.\-]+\s*[\[\(]dot[\]\)]\s*[a-zA-Z]{2,}/gi
const IGNORE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".css", ".js", ".woff", ".woff2", ".ico", ".pdf", ".webp", ".mp4"]
const CONTACT_KEYWORDS = ["contatti", "contact", "chi siamo", "about", "dove siamo", "info", "scrivi", "parla"]

const BLACKLIST_DOMAINS = new Set([
  "sentry.io", "domain.com", "example.com", "wixpress.com", "wordpress.com", "godaddy.com",
  "cloudflare.com", "yandex.ru", "qq.com", "google.com", "facebook.com", "instagram.com",
  "twitter.com", "linkedin.com", "youtube.com", "pinterest.com", "tiktok.com",
  "whatsapp.com", "telegram.org", "microsoft.com", "apple.com", "amazon.com",
  "shopify.com", "squarespace.com", "weebly.com", "jimdo.com",
  "aruba.it", "register.it", "netsons.com", "serverplan.com", "siteground.com",
  "bluehost.com", "ovh.com", "hetzner.com", "digitalocean.com",
  "vercel.com", "netlify.com", "github.com",
])

const VALID_PREFIXES = [
  "info", "contatti", "contact", "prenotazioni", "reservation", "booking",
  "hello", "ciao", "office", "segreteria", "direzione", "ristorante", "pizzeria",
  "bar", "studio", "amministrazione", "amministrazione", "segreteria",
]

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8",
      },
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

// ── Email extraction ──────────────────────────────────────────────────────────

function normalizeObfuscated(raw: string): string {
  return raw
    .replace(/\s*[\[\(]at[\]\)]\s*/gi, "@")
    .replace(/\s*[\[\(]dot[\]\)]\s*/gi, ".")
    .trim()
}

function extractEmailsFromText(text: string): string[] {
  const found = new Set<string>()
  // Standard emails
  const matches = text.match(EMAIL_REGEX) || []
  matches.forEach((e) => found.add(e.toLowerCase()))
  // Obfuscated emails
  const obf = text.match(OBFUSCATED_EMAIL_REGEX) || []
  obf.forEach((e) => found.add(normalizeObfuscated(e).toLowerCase()))
  return filterEmails(Array.from(found))
}

function extractEmailsFromHtml(html: string): string[] {
  const $ = cheerio.load(html)
  const found = new Set<string>()

  // 1. Mailto links (più affidabili)
  $("a[href^='mailto:']").each((_, el) => {
    const href = $(el).attr("href") || ""
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase()
    if (email) found.add(email)
  })

  // 2. Meta tags (some sites put email in meta)
  $("meta").each((_, el) => {
    const content = $(el).attr("content") || ""
    extractEmailsFromText(content).forEach((e) => found.add(e))
  })

  // 3. Schema.org JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "{}")
      const email = json.email || json.contactPoint?.email
      if (typeof email === "string") found.add(email.toLowerCase())
    } catch { /* ignore */ }
  })

  // 4. Body text
  const bodyText = $("body").text()
  extractEmailsFromText(bodyText).forEach((e) => found.add(e))

  return filterEmails(Array.from(found))
}

function filterEmails(emails: string[]): string[] {
  return emails
    .filter((email) => {
      const lower = email.toLowerCase()
      if (IGNORE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return false
      const domain = lower.split("@")[1]
      if (!domain || !domain.includes(".")) return false
      if (BLACKLIST_DOMAINS.has(domain)) return false
      if (BLACKLIST_DOMAINS.has(domain.replace(/^www\./, ""))) return false
      if (lower.includes("noreply") || lower.includes("no-reply")) return false
      if (lower.includes("u00") || lower.includes("sentry")) return false
      return true
    })
    .sort((a, b) => {
      const aPrefix = a.split("@")[0]
      const bPrefix = b.split("@")[0]
      const aOk = VALID_PREFIXES.some((p) => aPrefix === p || aPrefix.startsWith(p))
      const bOk = VALID_PREFIXES.some((p) => bPrefix === p || bPrefix.startsWith(p))
      if (aOk && !bOk) return -1
      if (!aOk && bOk) return 1
      return 0
    })
}

// ── SerpAPI Knowledge Graph (fonte più ricca) ─────────────────────────────────

async function searchKnowledgeGraph(businessName: string, city?: string): Promise<string | null> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY
  if (!SERPAPI_KEY) return null

  const q = city ? `${businessName} ${city}` : businessName
  const url = new URL("https://serpapi.com/search.json")
  url.searchParams.set("engine", "google")
  url.searchParams.set("q", q)
  url.searchParams.set("gl", "it")
  url.searchParams.set("hl", "it")
  url.searchParams.set("num", "5")
  url.searchParams.set("api_key", SERPAPI_KEY)

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json() as any

    // 1. Knowledge Graph diretto (fonte migliore)
    if (data.knowledge_graph?.email) {
      const email = String(data.knowledge_graph.email).toLowerCase().trim()
      const filtered = filterEmails([email])
      if (filtered.length > 0) {
        console.log(`✅ Email from knowledge_graph: ${filtered[0]}`)
        return filtered[0]
      }
    }

    // 2. Local results (google maps data integrato nella SERP)
    for (const result of data.local_results || []) {
      if (result.email) {
        const filtered = filterEmails([String(result.email).toLowerCase()])
        if (filtered.length > 0) {
          console.log(`✅ Email from local_results: ${filtered[0]}`)
          return filtered[0]
        }
      }
    }

    // 3. Organic snippets — cerca pattern email nel testo
    for (const result of data.organic_results || []) {
      const text = `${result.snippet || ""} ${result.title || ""}`
      const emails = extractEmailsFromText(text)
      if (emails.length > 0) {
        console.log(`✅ Email from snippet: ${emails[0]}`)
        return emails[0]
      }
    }

    // 4. Prova a scrapare la prima pagina italiana che non sia un social
    for (const result of (data.organic_results || []) as any[]) {
      const link: string = result.link || ""
      if (!link) continue
      if (link.includes("facebook.") || link.includes("instagram.") || link.includes("tripadvisor.")) continue

      const html = await fetchHtml(link, 6000)
      if (html) {
        const emails = extractEmailsFromHtml(html)
        if (emails.length > 0) {
          console.log(`✅ Email scraped from ${link}: ${emails[0]}`)
          return emails[0]
        }
      }
      break // Solo il primo sito
    }
  } catch (e) {
    console.error("[knowledge_graph] Error:", e)
  }
  return null
}

async function searchDirectoryEmail(businessName: string, city?: string): Promise<string | null> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY
  if (!SERPAPI_KEY) return null

  const cityStr = city ? ` ${city}` : ""

  const queries = [
    `"${businessName}"${cityStr} email contatti`,
    `"${businessName}"${cityStr} site:paginegialle.it`,
    `"${businessName}"${cityStr} site:tuttocittà.it`,
  ]

  for (const q of queries) {
    const url = new URL("https://serpapi.com/search.json")
    url.searchParams.set("engine", "google")
    url.searchParams.set("q", q)
    url.searchParams.set("gl", "it")
    url.searchParams.set("hl", "it")
    url.searchParams.set("num", "5")
    url.searchParams.set("api_key", SERPAPI_KEY)

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const data = await res.json() as any

      // Snippet
      for (const result of data.organic_results || []) {
        const text = `${result.snippet || ""} ${result.title || ""}`
        const emails = extractEmailsFromText(text)
        if (emails.length > 0) {
          console.log(`✅ Email from directory snippet: ${emails[0]}`)
          return emails[0]
        }
      }

      // Scrape pagine gialle
      for (const result of (data.organic_results || []) as any[]) {
        if (result.link?.includes("paginegialle.it")) {
          const html = await fetchHtml(result.link, 7000)
          if (html) {
            const emails = extractEmailsFromHtml(html)
            if (emails.length > 0) {
              console.log(`✅ Email from paginegialle: ${emails[0]}`)
              return emails[0]
            }
          }
          break
        }
      }
    } catch (e) {
      console.error(`[directory] Error for "${q}":`, e)
    }
  }

  return null
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function scrapeEmailFromUrl(
  startUrl: string | null,
  businessName: string,
  city?: string
): Promise<string | null> {

  // 1. Se ha un sito ufficiale, cerca prima lì
  if (startUrl) {
    try {
      const urlStr = startUrl.startsWith("http") ? startUrl : `https://${startUrl}`
      const baseUrl = new URL(urlStr)
      console.log(`🔍 Scraping website: ${baseUrl.href}`)

      const homeHtml = await fetchHtml(baseUrl.href)
      if (homeHtml) {
        const emails = extractEmailsFromHtml(homeHtml)
        if (emails.length > 0) {
          console.log(`✅ Email on homepage: ${emails[0]}`)
          return emails[0]
        }

        // Cerca pagine contatti interne
        const $ = cheerio.load(homeHtml)
        const contactLinks = new Set<string>()
        $("a").each((_, el) => {
          const href = $(el).attr("href") || ""
          const text = $(el).text().toLowerCase()
          if (CONTACT_KEYWORDS.some((kw) => text.includes(kw) || href.toLowerCase().includes(kw))) {
            try {
              const abs = new URL(href, baseUrl.href).href
              if (abs.startsWith(baseUrl.origin)) contactLinks.add(abs)
            } catch { /* ignore */ }
          }
        })

        for (const link of Array.from(contactLinks).slice(0, 3)) {
          const pageHtml = await fetchHtml(link)
          if (pageHtml) {
            const pageEmails = extractEmailsFromHtml(pageHtml)
            if (pageEmails.length > 0) {
              console.log(`✅ Email on contact page: ${pageEmails[0]}`)
              return pageEmails[0]
            }
          }
        }
      }
    } catch { /* URL non valido */ }
  }

  // 2. Knowledge Graph SerpAPI (fonte più ricca, 1 sola chiamata)
  console.log(`🔎 Knowledge graph search: ${businessName} ${city || ""}`)
  const kgEmail = await searchKnowledgeGraph(businessName, city)
  if (kgEmail) return kgEmail

  // 3. Directory italiane
  console.log(`📂 Directory search: ${businessName} ${city || ""}`)
  return await searchDirectoryEmail(businessName, city)
}
