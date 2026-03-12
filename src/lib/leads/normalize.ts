export function normalizeName(input: string | null | undefined) {
  if (!input) return undefined
  const v = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")

  return v || undefined
}

export function normalizeEmail(input: string | null | undefined) {
  const v = input?.trim().toLowerCase()
  return v || undefined
}

export function normalizePhone(input: string | null | undefined) {
  if (!input) return undefined
  const digits = input.replace(/\D/g, "")
  if (!digits) return undefined
  if (digits.startsWith("39") && digits.length > 10) return digits.slice(2)
  return digits
}

export function normalizeAddress(input: string | null | undefined) {
  if (!input) return undefined
  const v = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")

  return v || undefined
}

export function normalizeDomain(url: string | null | undefined) {
  if (!url) return undefined
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    return host.startsWith("www.") ? host.slice(4) : host
  } catch {
    return undefined
  }
}
