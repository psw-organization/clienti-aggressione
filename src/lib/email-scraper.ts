import * as cheerio from "cheerio"

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const IGNORE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".css", ".js", ".woff", ".woff2", ".ico", ".pdf", ".webp", ".mp4"]
const CONTACT_KEYWORDS = ["contatti", "contact", "chi siamo", "about", "dove siamo", "info"]

const BLACKLIST_DOMAINS = [
  "sentry.io", "domain.com", "example.com", "wixpress.com", "wordpress.com", "godaddy.com",
  "cloudflare.com", "yandex.ru", "qq.com", "google.com", "facebook.com", "instagram.com",
  "twitter.com", "linkedin.com", "youtube.com", "pinterest.com", "tiktok.com", "snapchat.com",
  "whatsapp.com", "telegram.org", "skype.com", "microsoft.com", "apple.com", "amazon.com",
  "shopify.com", "myshopify.com", "squarespace.com", "weebly.com", "jimdo.com", "webnode.com",
  "1and1.com", "ionos.com", "aruba.it", "register.it", "netsons.com", "serverplan.com",
  "vhosting-it.com", "keliweb.it", "siteground.com", "bluehost.com", "hostgator.com",
  "ovh.com", "hetzner.com", "digitalocean.com", "linode.com", "vultr.com",
  "herokuapp.com", "vercel.com", "netlify.com",
  "github.com", "gitlab.com", "bitbucket.org", "npmjs.com",
  "stackoverflow.com", "medium.com", "reddit.com",
]

// Prefissi validi per business locali (priorità alta nel sorting)
const VALID_PREFIXES = ["info", "contatti", "prenotazioni", "hello", "ciao", "reservation", "booking", "office", "segreteria", "direzione", "ristorante", "pizzeria", "bar"]

async function fetchHtml(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    })

    clearTimeout(timeoutId)
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

function extractEmails(html: string): string[] {
  const $ = cheerio.load(html)
  const found = new Set<string>()

  // 1. Link mailto:
  $("a[href^='mailto:']").each((_, el) => {
    const href = $(el).attr("href")
    if (href) {
      const email = href.replace(/^mailto:/i, "").split("?")[0].trim()
      if (email) found.add(email)
    }
  })

  // 2. Testo body
  const text = $("body").text()
  const matches = text.match(EMAIL_REGEX) || []
  matches.forEach((email) => found.add(email))

  // Filtri
  return Array.from(found)
    .filter((email) => {
      const lower = email.toLowerCase()
      if (IGNORE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return false
      const domain = lower.split("@")[1]
      if (!domain) return false
      if (BLACKLIST_DOMAINS.some((d) => domain.includes(d))) return false
      if (lower.includes("noreply") || lower.includes("no-reply")) return false
      if (lower.includes("example.com") || lower.includes("wixpress.com")) return false
      if (lower.includes("u00")) return false // Unicode escape artifacts
      if (lower.includes("sentry")) return false
      return true
    })
    .sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const aValid = VALID_PREFIXES.some((p) => aLower.startsWith(p + "@") || aLower.startsWith(p + "."))
      const bValid = VALID_PREFIXES.some((p) => bLower.startsWith(p + "@") || bLower.startsWith(p + "."))
      if (aValid && !bValid) return -1
      if (!aValid && bValid) return 1
      return 0
    })
}

// Estrae testo puro da snippet HTML (rimuove tag)
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Cerca email su directory italiane e motori di ricerca via SerpAPI (engine=google).
 * Molto più efficace di cercare sui social per attività locali.
 */
async function searchDirectoryEmail(businessName: string, city?: string): Promise<string | null> {
  const SERPAPI_KEY = process.env.SERPAPI_KEY
  if (!SERPAPI_KEY) return null

  const cityStr = city ? ` ${city}` : ""

  // Queries ordinate per probabilità di successo per attività italiane
  const queries = [
    `"${businessName}"${cityStr} site:paginegialle.it`,
    `"${businessName}"${cityStr} contatti email`,
    `"${businessName}"${cityStr} site:tripadvisor.it`,
    `"${businessName}"${cityStr} site:tuttocittà.it`,
  ]

  for (const q of queries) {
    const url = new URL("https://serpapi.com/search.json")
    url.searchParams.append("engine", "google")
    url.searchParams.append("q", q)
    url.searchParams.append("gl", "it")
    url.searchParams.append("hl", "it")
    url.searchParams.append("num", "5")
    url.searchParams.append("api_key", SERPAPI_KEY)

    try {
      console.log(`📂 Directory search: ${q}`)
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue

      const data = await res.json()

      // Cerca nelle snippet dei risultati organici
      for (const result of data.organic_results || []) {
        const text = stripHtmlTags(`${result.snippet || ""} ${result.title || ""}`)
        const emails = extractEmails(text)
        if (emails.length > 0) {
          console.log(`✅ Email found via directory ("${q}"): ${emails[0]}`)
          return emails[0]
        }
      }

      // Se paginegialle.it è nei risultati, prova a scrapare la pagina
      for (const result of (data.organic_results || []) as Array<{ link?: string }>) {
        if (result.link?.includes("paginegialle.it")) {
          const html = await fetchHtml(result.link, 6000)
          if (html) {
            const emails = extractEmails(html)
            if (emails.length > 0) {
              console.log(`✅ Email scraped from paginegialle: ${emails[0]}`)
              return emails[0]
            }
          }
          break // Prova solo il primo link di paginegialle
        }
      }
    } catch (e) {
      console.error(`[Directory search] Error for "${q}":`, e)
    }
  }

  return null
}

export async function scrapeEmailFromUrl(startUrl: string | null, businessName: string, city?: string): Promise<string | null> {

  // 1. Se c'è un sito web, cerca prima lì
  if (startUrl) {
    try {
      const urlStr = startUrl.startsWith("http") ? startUrl : `https://${startUrl}`
      const baseUrl = new URL(urlStr)

      console.log(`🔍 Scraping website: ${baseUrl.href}`)
      const homeHtml = await fetchHtml(baseUrl.href)

      if (homeHtml) {
        const emails = extractEmails(homeHtml)
        if (emails.length > 0) {
          console.log(`✅ Email found on website: ${emails[0]}`)
          return emails[0]
        }

        // Cerca pagine contatti interne
        const $ = cheerio.load(homeHtml)
        const contactLinks = new Set<string>()

        $("a").each((_, el) => {
          const href = $(el).attr("href")
          const text = $(el).text().toLowerCase()
          if (!href) return
          if (CONTACT_KEYWORDS.some((kw) => text.includes(kw) || href.toLowerCase().includes(kw))) {
            try {
              const absoluteUrl = new URL(href, baseUrl.href).href
              if (absoluteUrl.startsWith(baseUrl.origin)) contactLinks.add(absoluteUrl)
            } catch { /* ignore malformed URLs */ }
          }
        })

        for (const link of Array.from(contactLinks).slice(0, 2)) {
          const pageHtml = await fetchHtml(link)
          if (pageHtml) {
            const pageEmails = extractEmails(pageHtml)
            if (pageEmails.length > 0) {
              console.log(`✅ Email found on contact page: ${pageEmails[0]}`)
              return pageEmails[0]
            }
          }
        }
      }
    } catch { /* URL non valido o network error */ }
  }

  // 2. Nessuna email sul sito (o nessun sito): cerca su directory italiane
  console.log(`⚠️ Trying directory search for: ${businessName}`)
  return await searchDirectoryEmail(businessName, city)
}
