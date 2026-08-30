"use client"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatRange } from "@/lib/dates"
import { dbError } from "@/lib/errors"
import { C, btnPrimary, card, input, label } from "@/lib/ui"
import type { Participation, Stage } from "@/lib/types"

interface GeoResult { name: string; label: string; lat: number; lng: number }

const EMPTY = { name: "", description: "", date_start: "", date_end: "", lat: null as number | null, lng: null as number | null }

export function StagesTab({
  tripId,
  stages,
  participations,
  onChange,
}: {
  tripId: string
  stages: Stage[]
  participations: Participation[]
  onChange: (stages: Stage[]) => void
}) {
  const supabase = createClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [results, setResults] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Stage>>({})
  const pickedRef = useRef(false)

  // Recherche de lieu, temporisée : Nominatim demande au plus 1 requête/seconde.
  useEffect(() => {
    if (!adding || pickedRef.current || form.name.trim().length < 3) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/geocode?q=" + encodeURIComponent(form.name.trim()))
        const json = await res.json()
        setResults(json.results ?? [])
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 500)
    return () => { clearTimeout(t); setSearching(false) }
  }, [form.name, adding])

  function pick(r: GeoResult) {
    pickedRef.current = true
    setForm(f => ({ ...f, name: r.name, lat: r.lat, lng: r.lng }))
    setResults([])
  }

  async function addStage(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (form.date_start && form.date_end && form.date_end < form.date_start) {
      setError("La date de fin est avant la date de début.")
      return
    }
    setSaving(true)
    setError("")

    const { data, error } = await supabase
      .from("stages")
      .insert({
        roadtrip_id: tripId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        date_start: form.date_start || null,
        date_end: form.date_end || null,
        lat: form.lat,
        lng: form.lng,
        order_index: stages.length,
      })
      .select()
      .single()

    setSaving(false)
    if (error || !data) { setError(dbError(error)); return }

    onChange([...stages, data as Stage])
    setForm(EMPTY)
    pickedRef.current = false
    setAdding(false)
  }

  async function saveEdit(id: string) {
    const patch = {
      name: (draft.name ?? "").trim(),
      description: draft.description?.trim() || null,
      date_start: draft.date_start || null,
      date_end: draft.date_end || null,
    }
    if (!patch.name) return
    const { error } = await supabase.from("stages").update(patch).eq("id", id)
    if (!error) {
      onChange(stages.map(s => (s.id === id ? { ...s, ...patch } as Stage : s)))
      setEditing(null)
    }
  }

  async function remove(s: Stage) {
    const n = participations.filter(p => p.stage_id === s.id).length
    const warn = n > 0 ? `\n\n${n} participation${n > 1 ? "s" : ""} y ${n > 1 ? "sont" : "est"} rattachée${n > 1 ? "s" : ""} et sera supprimée${n > 1 ? "s" : ""}.` : ""
    if (!confirm(`Supprimer l'étape « ${s.name} » ?${warn}`)) return
    const { error } = await supabase.from("stages").delete().eq("id", s.id)
    if (!error) onChange(stages.filter(x => x.id !== s.id))
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= stages.length) return
    const reordered = [...stages]
    const [item] = reordered.splice(index, 1)
    reordered.splice(next, 0, item)
    const withOrder = reordered.map((s, i) => ({ ...s, order_index: i }))
    onChange(withOrder)
    await Promise.all(
      withOrder.map(s => supabase.from("stages").update({ order_index: s.order_index }).eq("id", s.id))
    )
  }

  return (
    <div>
      {stages.map((s, i) => {
        const people = new Set(participations.filter(p => p.stage_id === s.id).map(p => p.member_id)).size
        const isEditing = editing === s.id

        return (
          <div key={s.id} style={{ ...card, marginBottom: "10px" }}>
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input value={draft.name ?? ""} onChange={e => setDraft({ ...draft, name: e.target.value })} style={input} placeholder="Nom de l'étape" />
                <textarea rows={2} value={draft.description ?? ""} onChange={e => setDraft({ ...draft, description: e.target.value })} style={{ ...input, resize: "vertical" }} placeholder="Description" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <input type="date" value={draft.date_start ?? ""} onChange={e => setDraft({ ...draft, date_start: e.target.value })} style={input} />
                  <input type="date" value={draft.date_end ?? ""} min={draft.date_start ?? undefined} onChange={e => setDraft({ ...draft, date_end: e.target.value })} style={input} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setEditing(null)} style={{ flex: 1, background: C.bg, border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>
                    Annuler
                  </button>
                  <button onClick={() => saveEdit(s.id)} style={{ flex: 1, background: C.accent, border: "none", color: C.bg, borderRadius: "100px", padding: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: C.green, color: C.accent, fontSize: "12px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "16px" }}>{s.name}</div>
                    <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>
                      {formatRange(s.date_start, s.date_end)} · {people} pers.
                      {s.lat == null && <span style={{ color: C.warn }}> · pas de position</span>}
                    </div>
                    {s.description && <p style={{ fontSize: "13px", color: C.muted, marginTop: "6px" }}>{s.description}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                    <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", color: i === 0 ? C.dim : C.muted, cursor: i === 0 ? "default" : "pointer", fontSize: "14px", padding: "2px 6px" }}>▲</button>
                    <button onClick={() => move(i, 1)} disabled={i === stages.length - 1} style={{ background: "none", border: "none", color: i === stages.length - 1 ? C.dim : C.muted, cursor: i === stages.length - 1 ? "default" : "pointer", fontSize: "14px", padding: "2px 6px" }}>▼</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
                  <button
                    onClick={() => { setEditing(s.id); setDraft({ name: s.name, description: s.description ?? "", date_start: s.date_start ?? "", date_end: s.date_end ?? "" }) }}
                    style={{ background: "none", border: "none", color: C.accent, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                  >
                    Modifier
                  </button>
                  <button onClick={() => remove(s)} style={{ background: "none", border: "none", color: C.dim, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}

      {!adding ? (
        <button onClick={() => setAdding(true)} style={{ ...btnPrimary, marginTop: "8px" }}>
          + Ajouter une étape
        </button>
      ) : (
        <form onSubmit={addStage} style={{ ...card, marginTop: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <label style={label}>LIEU *</label>
            <input
              autoFocus
              value={form.name}
              onChange={e => { pickedRef.current = false; setForm({ ...form, name: e.target.value, lat: null, lng: null }) }}
              placeholder="Biarritz"
              style={input}
            />
            {searching && <div style={{ fontSize: "11px", color: C.dim, marginTop: "4px" }}>Recherche…</div>}
            {form.lat != null && <div style={{ fontSize: "11px", color: C.accent, marginTop: "4px" }}>📍 Position trouvée</div>}
            {results.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: "4px", background: C.card2, border: `1px solid ${C.green}`, borderRadius: "12px", overflow: "hidden", zIndex: 10 }}>
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(r)}
                    style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${C.bg}`, color: C.text, padding: "10px 12px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}
                  >
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                    <span style={{ display: "block", color: C.dim, fontSize: "11px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={label}>DESCRIPTION — OPTIONNEL</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...input, resize: "vertical" }} placeholder="Spot de surf, camping en bord de plage…" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <label style={label}>ARRIVÉE</label>
              <input type="date" value={form.date_start} onChange={e => setForm({ ...form, date_start: e.target.value })} style={input} />
            </div>
            <div>
              <label style={label}>DÉPART</label>
              <input type="date" value={form.date_end} min={form.date_start || undefined} onChange={e => setForm({ ...form, date_end: e.target.value })} style={input} />
            </div>
          </div>

          {error && <p style={{ color: C.warn, fontSize: "13px" }}>{error}</p>}

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY); setError("") }} style={{ flex: 1, background: C.bg, border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              Annuler
            </button>
            <button type="submit" disabled={saving || !form.name.trim()} style={{ flex: 2, background: C.accent, border: "none", color: C.bg, borderRadius: "100px", padding: "12px", fontWeight: 700, cursor: "pointer", opacity: saving || !form.name.trim() ? 0.5 : 1, fontFamily: "inherit" }}>
              {saving ? "Ajout…" : "Ajouter l'étape"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
