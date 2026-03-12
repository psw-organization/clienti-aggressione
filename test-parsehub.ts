import { parseHubSearch } from "./src/lib/providers/parsehub"
import * as dotenv from "dotenv"

dotenv.config()

async function run() {
  console.log("Testing ParseHub Integration...")
  
  if (!process.env.PARSEHUB_API_KEY || !process.env.PARSEHUB_PROJECT_TOKEN) {
      console.log("Skipping real test because PARSEHUB keys are not set.")
      return
  }
  
  try {
    const results = await parseHubSearch({
      providerId: "parsehub",
      category: "pizzeria",
      limit: 20
    })
    
    console.log("Raw Execution Complete.")
    console.log("Results mapped:", results.length)
    if (results.length > 0) {
      console.log("First result:", JSON.stringify(results[0], null, 2))
    }
  } catch(e) {
    console.error("Test failed:", e)
  }
}

run()
