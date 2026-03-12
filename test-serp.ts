import { serpApiSearch } from "./src/lib/providers/serp-api"
import * as dotenv from "dotenv"

dotenv.config()

async function run() {
  console.log("Testing SerpApi Search...")
  console.log("Key starting with:", process.env.SERPAPI_KEY?.substring(0, 5))
  
  try {
    const results = await serpApiSearch({
      providerId: "serpapi",
      region: "Campania",
      province: "SA",
      city: "Battipaglia",
      category: "pizzeria",
      ratingMin: 4.3,
      reviewsMin: 100,
      onlyNoWebsite: true,
      excludeChains: true,
      limit: 20
    })
    
    console.log("Raw Execution Complete.")
    console.log("Results found:", results.length)
    if (results.length > 0) {
      console.log("First result:", JSON.stringify(results[0], null, 2))
    }
  } catch(e) {
    console.error("Test failed:", e)
  }
}

run()
