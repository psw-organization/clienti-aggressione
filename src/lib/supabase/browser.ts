"use client"

import { createBrowserClient } from "@supabase/ssr"

export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    const stub = {
      auth: {
        async signInWithPassword() {
          return { data: null, error: new Error("Supabase non configurato") }
        },
      },
    }
    return stub as any
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
