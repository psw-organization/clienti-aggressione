export type PriorityLevel = "low" | "medium" | "high"

export type ScoringConfig = {
  points: {
    noOfficialWebsite: number
    ratingGte: { threshold: number; points: number }
    reviewsGte: { threshold: number; points: number }
    hasSocialNoWebsite: number
    sellableCategory: number
  }
  sellableCategories: string[]
  priority: { highGte: number; mediumGte: number }
}

export type ScoreResult = {
  score: number
  reasons: string[]
  priorityLevel: PriorityLevel
}

export type ScoringLeadInput = {
  hasOfficialWebsite: boolean
  rating: number | null
  reviewsCount: number | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  category?: string | null
}

export function scoreLead(cfg: ScoringConfig, lead: ScoringLeadInput): ScoreResult {
  const reasons: string[] = []
  let score = 0

  if (!lead.hasOfficialWebsite) {
    score += cfg.points.noOfficialWebsite
    reasons.push("Nessun sito ufficiale")
  }

  if (typeof lead.rating === "number" && lead.rating >= cfg.points.ratingGte.threshold) {
    score += cfg.points.ratingGte.points
    reasons.push(`Rating >= ${cfg.points.ratingGte.threshold}`)
  }

  if (typeof lead.reviewsCount === "number" && lead.reviewsCount >= cfg.points.reviewsGte.threshold) {
    score += cfg.points.reviewsGte.points
    reasons.push(`Recensioni >= ${cfg.points.reviewsGte.threshold}`)
  }

  const hasSocial = Boolean(lead.instagramUrl || lead.facebookUrl)
  if (hasSocial && !lead.hasOfficialWebsite) {
    score += cfg.points.hasSocialNoWebsite
    reasons.push("Social presente")
  }

  const category = lead.category?.trim().toLowerCase()
  if (category && cfg.sellableCategories.includes(category)) {
    score += cfg.points.sellableCategory
    reasons.push("Categoria alta resa")
  }

  if (score > 100) score = 100
  if (score < 0) score = 0

  let priorityLevel: PriorityLevel = "low"
  if (score >= cfg.priority.highGte) priorityLevel = "high"
  else if (score >= cfg.priority.mediumGte) priorityLevel = "medium"

  return { score, reasons, priorityLevel }
}
