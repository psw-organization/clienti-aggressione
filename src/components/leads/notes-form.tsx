"use client"

import { useRef, useTransition, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type NotesFormProps = {
  action: (formData: FormData) => Promise<void>
  defaultValue: string | null | undefined
}

export function NotesForm({ action, defaultValue }: NotesFormProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await action(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        name="internalNotes"
        defaultValue={defaultValue ?? ""}
        className="min-h-[280px] text-sm bg-muted/30 border-border resize-y"
        placeholder="Scrivi le tue note su questo lead…"
        disabled={isPending}
      />
      <div className="flex items-center justify-between">
        {saved ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Note salvate
          </span>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Salvataggio…" : "Salva Note"}
        </Button>
      </div>
    </form>
  )
}
