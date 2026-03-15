"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"

function mapAuthError(message: string) {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) return "Email o password non corretti"
  if (m.includes("email not confirmed")) return "Email non confermata in Supabase Auth"
  if (m.includes("email logins are disabled")) return "Login con email/password disabilitato su Supabase"
  if (m.includes("no api key found")) return "Manca NEXT_PUBLIC_SUPABASE_ANON_KEY in ambiente client"
  return `Errore login Supabase: ${message}`
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserSupabaseClient()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (signInError) {
      setError(mapAuthError(signInError.message))
      return
    }
    router.refresh()
    router.push("/leads")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>FoodLead Engine</CardTitle>
          <CardDescription>Accedi per gestire ricerca e lead.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accesso…" : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
