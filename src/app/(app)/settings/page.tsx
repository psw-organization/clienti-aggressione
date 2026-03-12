import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Admin</div>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurazioni</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Provider, scoring e blacklist saranno gestibili qui.
        </CardContent>
      </Card>
    </div>
  )
}
