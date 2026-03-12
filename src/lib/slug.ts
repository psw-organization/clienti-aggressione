export function slugify(input: string) {
  const cleaned = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  return cleaned || "lead"
}

export function withSuffix(base: string) {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base}-${suffix}`
}
