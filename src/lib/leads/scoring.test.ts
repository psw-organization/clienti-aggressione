import { describe, expect, it } from "vitest"

import { scoreLead, type ScoringConfig } from "./scoring"

const cfg: ScoringConfig = {
  points: {
    noOfficialWebsite: 40,
    ratingGte: { threshold: 4.3, points: 20 },
    reviewsGte: { threshold: 100, points: 20 },
    hasSocialNoWebsite: 10,
    sellableCategory: 10,
  },
  sellableCategories: ["pizzeria", "ristorante", "pub"],
  priority: { highGte: 70, mediumGte: 40 },
}

describe("scoreLead", () => {
  it("assegna punteggio alto a lead senza sito, con rating e recensioni", () => {
    const res = scoreLead(cfg, {
      hasOfficialWebsite: false,
      rating: 4.6,
      reviewsCount: 250,
      instagramUrl: "https://instagram.com/x",
      category: "pizzeria",
    })
    expect(res.score).toBeGreaterThanOrEqual(80)
    expect(res.priorityLevel).toBe("high")
    expect(res.reasons.length).toBeGreaterThan(0)
  })

  it("non supera 100", () => {
    const res = scoreLead(cfg, {
      hasOfficialWebsite: false,
      rating: 5,
      reviewsCount: 1000,
      instagramUrl: "https://instagram.com/x",
      facebookUrl: "https://facebook.com/y",
      category: "ristorante",
    })
    expect(res.score).toBeLessThanOrEqual(100)
  })
})
