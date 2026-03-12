import { describe, expect, it } from "vitest"

import { classifyWebsite } from "./website-detection"

describe("classifyWebsite", () => {
  it("classifica social", () => {
    const res = classifyWebsite("https://instagram.com/test", [])
    expect(res.presence).toBe("social")
  })

  it("classifica directory", () => {
    const res = classifyWebsite("https://www.tripadvisor.it/xyz", [])
    expect(res.presence).toBe("directory")
  })

  it("classifica official", () => {
    const res = classifyWebsite("https://example.it", [])
    expect(res.presence).toBe("official")
  })
})
