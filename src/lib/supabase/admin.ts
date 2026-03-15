import { createClient } from "@supabase/supabase-js"

function getEnv() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL")
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
  }

  return { supabaseUrl, supabaseServiceRoleKey }
}

let client: any = null

export const supabaseAdmin: any = new Proxy(
  {},
  {
  get(_, prop) {
    if (!client) {
      const { supabaseUrl, supabaseServiceRoleKey } = getEnv()
      client = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }
    return client[prop]
  },
}
)
