import Link from "next/link"
import { notFound } from "next/navigation"

import { prisma } from "@/lib/db"
import { updateLeadAction } from "@/app/(app)/leads/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

export default async function LeadDetailPage({ params }: any) {
  const { id } = params
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { sources: { orderBy: { createdAt: "desc" }, take: 20 } },
  })
  if (!lead) notFound()

  type Source = { id: string; providerId: string; externalId: string; createdAt: Date }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/leads" className="hover:underline">
              Lead
            </Link>
            <span className="px-2 text-muted-foreground">/</span>
            <span className="text-foreground">Scheda</span>
          </div>
          <h1 className="text-xl font-semibold">{lead.businessName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={lead.leadScore >= 70 ? "success" : "default"}>{lead.leadScore}</Badge>
          <Badge variant="outline">{lead.status}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Dettagli</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateLeadAction.bind(null, lead.id)} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessName">Nome attività</Label>
                <Input id="businessName" name="businessName" defaultValue={lead.businessName} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" name="category" defaultValue={lead.category ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Input id="address" name="address" defaultValue={lead.address ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Città</Label>
                <Input id="city" name="city" defaultValue={lead.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" name="province" defaultValue={lead.province ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Regione</Label>
                <Input id="region" name="region" defaultValue={lead.region ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input id="phone" name="phone" defaultValue={lead.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={lead.email ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Input id="rating" name="rating" defaultValue={lead.rating ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewsCount">Recensioni</Label>
                <Input id="reviewsCount" name="reviewsCount" defaultValue={lead.reviewsCount ?? ""} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="internalNotes">Note interne</Label>
                <Textarea id="internalNotes" name="internalNotes" defaultValue={lead.internalNotes ?? ""} />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Salva</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracciabilità</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Provider</div>
              <div>{lead.provider}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Sito ufficiale</div>
              <div className="truncate">{lead.hasOfficialWebsite ? lead.officialWebsiteUrl ?? "Sì" : "No"}</div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-xs font-medium text-muted-foreground">Sorgenti (ultime 20)</div>
              <div className="mt-2 space-y-2">
                {lead.sources.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nessuna sorgente registrata.</div>
                ) : null}
                {(lead.sources as unknown as Source[]).map((s) => (
                  <div key={s.id} className="rounded-md border border-border bg-background/40 p-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="font-medium">{s.providerId}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString("it-IT")}
                      </div>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{s.externalId}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
