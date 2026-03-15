import { describe, expect, it } from "vitest"

import { isNotFoundLikeResponse } from "./website-health"

describe("isNotFoundLikeResponse", () => {
  it("ritorna true su stato 404", () => {
    expect(isNotFoundLikeResponse(404, "https://example.com", "")).toBe(true)
  })

  it("ritorna true su body not found anche con stato 200", () => {
    expect(
      isNotFoundLikeResponse(
        200,
        "https://osteriadeglisvitati.business.site",
        "<html><title>Not Found</title><body>Page Not Found</body></html>"
      )
    ).toBe(true)
  })

  it("ritorna false su pagina raggiungibile", () => {
    expect(
      isNotFoundLikeResponse(
        200,
        "https://example.it/menu",
        "<html><title>Ristorante</title><body>Prenota ora</body></html>"
      )
    ).toBe(false)
  })
})
