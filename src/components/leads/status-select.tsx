"use client"

import React from "react"
import { cn } from "@/lib/utils"

type StatusValue = "new" | "reviewed" | "contacted" | "qualified" | "discarded"

const STATUS_STYLES: Record<StatusValue, string> = {
  new:       "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/20",
  reviewed:  "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-500/10 dark:border-violet-500/20",
  contacted: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20",
  qualified: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  discarded: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20",
}

export function StatusSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => Promise<void>
  defaultValue: StatusValue
}) {
  const [current, setCurrent] = React.useState<StatusValue>(defaultValue)

  return (
    <form action={action}>
      <select
        name="status"
        value={current}
        className={cn(
          "h-7 rounded-full border px-2.5 text-xs font-semibold focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer appearance-none pr-5 bg-no-repeat transition-colors",
          STATUS_STYLES[current]
        )}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E\")", backgroundPosition: "right 6px center" }}
        onChange={(e) => {
          setCurrent(e.target.value as StatusValue)
          e.currentTarget.form?.requestSubmit()
        }}
      >
        <option value="new">Nuovo</option>
        <option value="reviewed">Verificato</option>
        <option value="contacted">Contattato</option>
        <option value="qualified">Qualificato</option>
        <option value="discarded">Scartato</option>
      </select>
    </form>
  )
}

// Etichette leggibili per ogni status
export const STATUS_LABELS: Record<StatusValue, string> = {
  new:       "Nuovo",
  reviewed:  "Verificato",
  contacted: "Contattato",
  qualified: "Qualificato",
  discarded: "Scartato",
}
