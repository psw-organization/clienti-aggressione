"use client"

import { useTransition, useState } from "react"
import { CheckCircle2, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type NotesFormProps = {
  action: (formData: FormData) => Promise<void>
  defaultValue: string | null | undefined
}

export function NotesForm({ action, defaultValue }: NotesFormProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [text, setText] = useState(defaultValue ?? "")
  const [preview, setPreview] = useState(defaultValue ?? "")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await action(formData)
      setPreview(text)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="space-y-4">
      {/* Anteprima */}
      {preview ? (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <StickyNote className="h-3 w-3" />
            Nota salvata
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{preview}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-xs text-muted-foreground justify-center">
          <StickyNote className="h-4 w-4 opacity-40" />
          Nessuna nota ancora — scrivi qui sotto e salva
        </div>
      )}

      {/* Form di modifica */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {preview ? "Modifica nota" : "Aggiungi nota"}
        </p>
        <Textarea
          name="internalNotes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[160px] text-sm bg-muted/30 border-border resize-y"
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
            <span className="text-xs text-muted-foreground">{text.length}/5000</span>
          )}
          <Button type="submit" size="sm" disabled={isPending || text === preview}>
            {isPending ? "Salvataggio…" : "Salva Note"}
          </Button>
        </div>
      </form>
    </div>
  )
}
