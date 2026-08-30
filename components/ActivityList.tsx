"use client"
import { useState } from "react"
import { formatRange } from "@/lib/dates"
import { C, card, input, tint } from "@/lib/ui"
import type { Activity } from "@/lib/types"

export function ActivityList({
  items,
  voteCount,
  myVotes,
  meId,
  isOwner,
  fixedDay,
  dayMin,
  dayMax,
  onToggleVote,
  onSchedule,
  onRemove,
  emptyText,
}: {
  items: Activity[]
  voteCount: Map<string, number>
  myVotes: Set<string>
  meId: string
  isOwner: boolean
  /** Contexte « journée » : un seul bouton pour caler l'activité ici. */
  fixedDay?: string
  dayMin?: string | null
  dayMax?: string | null
  onToggleVote: (id: string) => void
  onSchedule: (id: string, day: string | null) => void
  onRemove: (id: string) => void
  emptyText: string
}) {
  const [pickingFor, setPickingFor] = useState<string | null>(null)
  const [pickedDay, setPickedDay] = useState("")

  if (items.length === 0) {
    return <p style={{ color: C.dim, fontSize: "13px", padding: "16px 0", lineHeight: 1.5 }}>{emptyText}</p>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map(a => {
        const count = voteCount.get(a.id) ?? 0
        const voted = myVotes.has(a.id)
        const scheduled = a.status === "scheduled" && a.scheduled_on
        const canRemove = a.author_id === meId || isOwner

        return (
          <div key={a.id} style={{ ...card, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <button
                onClick={() => onToggleVote(a.id)}
                aria-pressed={voted}
                title={voted ? "Retirer mon vote" : "Ça me tente"}
                style={{
                  ...(voted ? tint(C.accent, 0.18) : { background: C.bg, color: C.muted, border: `1px solid ${C.card2}` }),
                  borderRadius: "12px",
                  padding: "6px 10px",
                  minWidth: "46px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: "13px",
                  lineHeight: 1.2,
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ display: "block", fontSize: "14px" }}>👍</span>
                {count}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.3 }}>{a.title}</div>
                {a.description && (
                  <p style={{ fontSize: "13px", color: C.muted, marginTop: "3px", lineHeight: 1.45 }}>{a.description}</p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                  <span style={{ fontSize: "11px", color: C.dim }}>
                    proposé par {a.profiles?.display_name ?? "—"}
                  </span>
                  {scheduled && (
                    <span style={{ ...tint(C.teal, 0.16), borderRadius: "20px", padding: "2px 9px", fontSize: "11px", fontWeight: 700 }}>
                      {formatRange(a.scheduled_on, a.scheduled_on)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(isOwner || canRemove) && (
              <div style={{ display: "flex", gap: "12px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" }}>
                {isOwner && fixedDay && !scheduled && (
                  <button
                    onClick={() => onSchedule(a.id, fixedDay)}
                    style={{ ...tint(C.accent, 0.16), borderRadius: "100px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Caler sur cette journée
                  </button>
                )}

                {isOwner && !fixedDay && !scheduled && (
                  pickingFor === a.id ? (
                    <span style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="date"
                        autoFocus
                        min={dayMin ?? undefined}
                        max={dayMax ?? undefined}
                        value={pickedDay}
                        onChange={e => setPickedDay(e.target.value)}
                        style={{ ...input, width: "auto", padding: "6px 10px", fontSize: "13px" }}
                      />
                      <button
                        disabled={!pickedDay}
                        onClick={() => { onSchedule(a.id, pickedDay); setPickingFor(null); setPickedDay("") }}
                        style={{ ...tint(C.accent, 0.16), borderRadius: "100px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: pickedDay ? 1 : 0.5 }}
                      >
                        Programmer
                      </button>
                      <button
                        onClick={() => { setPickingFor(null); setPickedDay("") }}
                        style={{ background: "none", border: "none", color: C.dim, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => { setPickingFor(a.id); setPickedDay(dayMin ?? "") }}
                      style={{ background: "none", border: "none", color: C.accent, fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                    >
                      Retenir cette idée
                    </button>
                  )
                )}

                {isOwner && scheduled && (
                  <button
                    onClick={() => onSchedule(a.id, null)}
                    style={{ background: "none", border: "none", color: C.muted, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                  >
                    Remettre en proposition
                  </button>
                )}

                {canRemove && (
                  <button
                    onClick={() => { if (confirm(`Supprimer « ${a.title} » ?`)) onRemove(a.id) }}
                    style={{ background: "none", border: "none", color: C.dim, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit", marginLeft: "auto" }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Formulaire de proposition, partagé lui aussi par l'étape et la journée. */
export function ActivityForm({ onSubmit }: { onSubmit: (title: string, description: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const ok = await onSubmit(title, description)
    setSaving(false)
    if (ok) { setTitle(""); setDescription(""); setOpen(false) }
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{ ...tint(C.accent, 0.12), width: "100%", borderRadius: "14px", padding: "12px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: "10px" }}
    >
      + Proposer une activité
    </button>
  )

  return (
    <form onSubmit={submit} style={{ ...card, marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <input
        autoFocus
        maxLength={80}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Cours de surf au lever du soleil"
        style={input}
      />
      <textarea
        rows={2}
        maxLength={500}
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Détails, prix, horaires… (optionnel)"
        style={{ ...input, resize: "vertical" }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, background: C.bg, border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>
          Annuler
        </button>
        <button type="submit" disabled={saving || !title.trim()} style={{ flex: 2, background: C.accent, border: "none", color: "#0b120f", borderRadius: "100px", padding: "10px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", opacity: saving || !title.trim() ? 0.5 : 1 }}>
          {saving ? "…" : "Proposer"}
        </button>
      </div>
    </form>
  )
}
