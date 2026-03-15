"use client"

import Link from "next/link"
import { Globe, Mail, Phone, MapPin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { updateLeadStatusAction } from "@/app/(app)/leads/actions"
import { StatusSelect } from "./status-select"
import { Lead } from "@/types/index"

type LeadBoardProps = {
  leads: Lead[]
}

const STATUS_COLUMNS = [
  { id: "new",       label: "Nuovi",      colClass: "col-new",       headerClass: "col-header-new" },
  { id: "reviewed",  label: "Verificati", colClass: "col-reviewed",  headerClass: "col-header-reviewed" },
  { id: "contacted", label: "Contattati", colClass: "col-contacted", headerClass: "col-header-contacted" },
  { id: "qualified", label: "Qualificati",colClass: "col-qualified", headerClass: "col-header-qualified" },
  { id: "discarded", label: "Scartati",   colClass: "col-discarded", headerClass: "col-header-discarded" },
] as const

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null
  const cls = score >= 70 ? "score-high" : score >= 40 ? "score-medium" : "score-low"
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${cls}`}>
      {score}
    </span>
  )
}

export function LeadBoard({ leads }: LeadBoardProps) {
  const grouped = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.id] = leads.filter((l) => l.status === col.id)
    return acc
  }, {} as Record<string, Lead[]>)

  return (
    <div className="flex h-[calc(100vh-220px)] w-full gap-3 overflow-x-auto pb-4">
      {STATUS_COLUMNS.map((col) => (
        <div
          key={col.id}
          className={`flex min-w-[280px] max-w-[300px] flex-col gap-2.5 rounded-xl border border-border p-3 ${col.colClass}`}
        >
          {/* Column header */}
          <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${col.headerClass}`}>
            <span>{col.label}</span>
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-background/60 text-[10px] font-bold text-foreground">
              {grouped[col.id]?.length ?? 0}
            </span>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {grouped[col.id]?.map((lead) => (
              <div
                key={lead.id}
                className="bento-card group flex flex-col gap-2 p-3 hover:shadow-md transition-shadow"
              >
                {/* Name + score */}
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-sm font-semibold leading-snug hover:text-primary transition-colors line-clamp-2"
                  >
                    {lead.businessName}
                  </Link>
                  <ScoreBadge score={lead.leadScore} />
                </div>

                {/* Location + category */}
                <div className="space-y-0.5 text-[11px] text-muted-foreground">
                  {(lead.city || lead.address) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0 opacity-60" />
                      <span className="truncate">{lead.city || lead.address}</span>
                    </div>
                  )}
                  {lead.category && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                      <span className="truncate">{lead.category}</span>
                    </div>
                  )}
                </div>

                {/* Contact icons + status select */}
                <div className="flex items-center gap-1 border-t border-border pt-2">
                  {lead.officialWebsiteUrl ? (
                    <a
                      href={lead.officialWebsiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 transition-colors"
                      title="Sito web"
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="p-1.5 text-muted-foreground/30"><Globe className="h-3.5 w-3.5" /></span>
                  )}

                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="rounded-md p-1.5 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 transition-colors"
                      title={lead.email}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="p-1.5 text-muted-foreground/30"><Mail className="h-3.5 w-3.5" /></span>
                  )}

                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="rounded-md p-1.5 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10 transition-colors"
                      title={lead.phone}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="p-1.5 text-muted-foreground/30"><Phone className="h-3.5 w-3.5" /></span>
                  )}

                  <div className="ml-auto">
                    <StatusSelect
                      action={updateLeadStatusAction.bind(null, lead.id)}
                      defaultValue={lead.status}
                    />
                  </div>
                </div>
              </div>
            ))}

            {grouped[col.id]?.length === 0 && (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                Vuoto
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
