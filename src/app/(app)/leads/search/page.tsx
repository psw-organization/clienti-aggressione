import { ProviderSearch } from "@/components/leads/provider-search"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { providers as availableProviders } from "@/lib/providers/registry"
import { supabaseAdmin } from "@/lib/supabase/admin"

export default async function LeadsSearchPage() {
  const { data: providerConfigs } = await supabaseAdmin
    .from("ProviderConfig")
    .select("providerId,enabled")

  const providerOptions = Object.values(availableProviders).map((p) => {
    const cfg = (providerConfigs as { providerId: string; enabled: boolean }[] | null)?.find(
      (c: { providerId: string; enabled: boolean }) => c.providerId === p.id
    )
    return {
      providerId: p.id,
      name: p.name,
      enabled: cfg ? cfg.enabled : true,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Lead</p>
        <h1 className="text-2xl font-bold tracking-tight">Ricerca Lead</h1>
      </div>

      <Card className="bento-card">
        <CardHeader>
          <CardTitle>API providers</CardTitle>
        </CardHeader>
        <CardContent>
          <ProviderSearch providers={providerOptions} />
        </CardContent>
      </Card>
    </div>
  )
}
