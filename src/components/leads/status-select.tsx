"use client"

import React from "react"

type StatusValue = "new" | "reviewed" | "contacted" | "qualified" | "discarded"

export function StatusSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => Promise<void>
  defaultValue: StatusValue
}) {
  return (
    <form action={action}>
      <select
        name="status"
        defaultValue={defaultValue}
        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-ring"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
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
