"use client"
import { useState } from "react"
import { formatDay, formatTime } from "@/lib/dates"
import { C, card, input, label, tint } from "@/lib/ui"
import type { Activity } from "@/lib/types"

export interface ActivityDraft {
  title: string
  place: string
  startsOn: string
  startsAt: string
  description: string
  address: string
  url: string
}

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
        const retained = a.status === "scheduled"
        const canRemove = a.author_id === meId || isOwner
        const when = [formatDay(a.starts_on), formatTime(a.starts_at)].filter(Boolean).join(" · ")

        return (
          <div key={a.id} className="hoverable" style={{ ...card, padding: "12px 14px" }}>
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
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.3 }}>{a.title}</span>
                  {retained && (
                    <span style={{ ...tint(C.teal, 0.16), borderRadius: "20px", padding: "2px 9px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px" }}>
                      AU PROGRAMME
                    </span>
                  )}
                </div>

                {(when || a.place) && (
                  <div style={{ fontSize: "13px", color: C.accent, marginTop: "4px", fontWeight: 600 }}>
                    {when}{when && a.place ? " · " : ""}{a.place}
                  </div>
                )}

                {a.description && (
                  <p style={{ fontSize: "13px", color: C.muted, marginTop: "4px", lineHeight: 1.45 }}>{a.description}</p>
                )}

                {a.address && (
                  <a
                    href={"https://www.openstreetmap.org/search?query=" + encodeURIComponent(a.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", fontSize: "12px", color: C.muted, marginTop: "4px", textDecoration: "none" }}
                  >
                    📍 {a.address}
                  </a>
                )}

                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    style={{ display: "inline-block", fontSize: "12px", color: C.sky, marginTop: "4px", wordBreak: "break-all" }}
                  >
                    🔗 {hostOf(a.url)}
                  </a>
                )}

                <div style={{ fontSize: "11px", color: C.dim, marginTop: "6px" }}>
                  proposé par {a.profiles?.display_name ?? "—"}
                </div>
              </div>
            </div>

            {canRemove && (
              <div style={{ display: "flex", gap: "12px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" }}>
                {isOwner && fixedDay && !retained && (
                  <button
                    onClick={() => onSchedule(a.id, fixedDay)}
                    style={{ ...tint(C.accent, 0.16), borderRadius: "100px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Mettre au programme de ce jour
                  </button>
                )}

                {isOwner && !fixedDay && !retained && (
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
                        Confirmer
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
                      onClick={() => { setPickingFor(a.id); setPickedDay(a.starts_on ?? dayMin ?? "") }}
                      style={{ background: "none", border: "none", color: C.accent, fontSize: "12px", fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                    >
                      Retenir cette idée
                    </button>
                  )
                )}

                {isOwner && retained && (
                  <button
                    onClick={() => onSchedule(a.id, null)}
                    style={{ background: "none", border: "none", color: C.muted, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                  >
                    Remettre en proposition
                  </button>
                )}

                <button
                  onClick={() => { if (confirm(`Supprimer « ${a.title} » ?`)) onRemove(a.id) }}
                  style={{ background: "none", border: "none", color: C.dim, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit", marginLeft: "auto" }}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const EMPTY: ActivityDraft = {
  title: "", place: "", startsOn: "", startsAt: "", description: "", address: "", url: "",
}

/** Formulaire de proposition, partagé par l'étape et la journée. */
export function ActivityForm({
  onSubmit,
  defaultDay,
  dayMin,
  dayMax,
}: {
  onSubmit: (draft: ActivityDraft) => Promise<boolean>
  defaultDay?: string | null
  dayMin?: string | null
  dayMax?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ActivityDraft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function start() {
    setForm({ ...EMPTY, startsOn: defaultDay ?? dayMin ?? "" })
    setError("")
    setOpen(true)
  }

  const complete = form.title.trim() && form.place.trim() && form.startsOn && form.startsAt

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!complete) return
    if (form.url.trim() && !/^https?:\/\//i.test(form.url.trim())) {
      setError("Le lien doit commencer par http:// ou https://")
      return
    }
    setSaving(true)
    const ok = await onSubmit(form)
    setSaving(false)
    if (ok) { setForm(EMPTY); setOpen(false) }
  }

  const set = (k: keyof ActivityDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setError("")
  }

  if (!open) return (
    <button
      onClick={start}
      className="hoverable"
      style={{ ...tint(C.accent, 0.12), width: "100%", borderRadius: "14px", padding: "12px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: "10px" }}
    >
      + Proposer une activité
    </button>
  )

  return (
    <form onSubmit={submit} style={{ ...card, marginTop: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <label style={label}>QUOI ?*</label>
        <input autoFocus maxLength={80} value={form.title} onChange={set("title")} placeholder="Cours de surf" style={input} />
      </div>

      <div>
        <label style={label}>OÙ ?*</label>
        <input maxLength={120} value={form.place} onChange={set("place")} placeholder="Plage de la Côte des Basques" style={input} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "8px" }}>
        <div>
          <label style={label}>QUEL JOUR ?*</label>
          <input
            type="date"
            value={form.startsOn}
            min={dayMin ?? undefined}
            max={dayMax ?? undefined}
            onChange={set("startsOn")}
            style={input}
          />
        </div>
        <div>
          <label style={label}>À QUELLE HEURE ?*</label>
          <input type="time" value={form.startsAt} onChange={set("startsAt")} style={input} />
        </div>
      </div>

      <div>
        <label style={label}>ADRESSE — OPTIONNEL</label>
        <input maxLength={200} value={form.address} onChange={set("address")} placeholder="12 rue Mazagran, Biarritz" style={input} />
      </div>

      <div>
        <label style={label}>LIEN — OPTIONNEL</label>
        <input
          type="url"
          inputMode="url"
          value={form.url}
          onChange={set("url")}
          placeholder="https://le-restaurant.fr"
          style={input}
        />
      </div>

      <div>
        <label style={label}>DÉTAILS — OPTIONNEL</label>
        <textarea rows={2} maxLength={500} value={form.description} onChange={set("description")} placeholder="Prix, réservation, matériel…" style={{ ...input, resize: "vertical" }} />
      </div>

      {error && <p style={{ color: C.warn, fontSize: "13px" }}>{error}</p>}

      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, background: C.bg, border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>
          Annuler
        </button>
        <button type="submit" disabled={saving || !complete} style={{ flex: 2, background: C.accent, border: "none", color: "#0b120f", borderRadius: "100px", padding: "10px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", opacity: saving || !complete ? 0.5 : 1 }}>
          {saving ? "…" : "Proposer au groupe"}
        </button>
      </div>
    </form>
  )
}
