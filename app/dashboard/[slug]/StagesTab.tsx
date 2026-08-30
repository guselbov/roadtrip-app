"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatRange, spansOverlap, stageSpan } from "@/lib/dates"
import { useConfirm } from "@/components/Confirm"
import { dbError } from "@/lib/errors"
import { C, btnPrimary, card, input, label, stageColor, tint } from "@/lib/ui"
import type { Participation, Stage } from "@/lib/types"

interface GeoResult { name: string; label: string; lat: number; lng: number }

const EMPTY = { name: "", description: "", date_start: "", date_end: "", lat: null as number | null, lng: null as number | null }

export function StagesTab({
  tripId,
  stages,
  participations,
  ownerMemberId,
  tripStart,
  tripEnd,
  selectedStageId,
  onOpenStage,
  onChange,
  onParticipationsChange,
  onRefresh,
}: {
  tripId: string
  stages: Stage[]
  participations: Participation[]
  ownerMemberId: string | null
  tripStart: string | null
  tripEnd: string | null
  selectedStageId: string | null
  onOpenStage: (stageId: string) => void
  onChange: (stages: Stage[]) => void
  onParticipationsChange: (p: Participation[]) => void
  onRefresh: () => void
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
  const [busy, setBusy] = useState<string | null>(null)
  const pickedRef = useRef(false)
  const { ask, dialog } = useConfirm()

  // Les étapes deja datées : c'est contre elles qu'on vérifie les conflits.
  const booked = useMemo(
    () => stages.filter(s => s.date_start && s.date_end),
    [stages]
  )

  const conflictWith = useCallback(
    (start: string, end: string, exceptId?: string) => {
      if (!start || !end || end < start) return null
      const span = stageSpan(start, end)
      return booked.find(
        s => s.id !== exceptId && spansOverlap(stageSpan(s.date_start!, s.date_end!), span)
      ) ?? null
    },
    [booked]
  )

  const addConflict = conflictWith(form.date_start, form.date_end)
  const editConflict = editing
    ? conflictWith(draft.date_start ?? "", draft.date_end ?? "", editing)
    : null

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

  function overlapMessage(s: Stage) {
    return `Ces dates chevauchent « ${s.name} » (${formatRange(s.date_start, s.date_end)}). Le jour de départ d'une étape peut être le jour d'arrivée de la suivante, mais pas plus.`
  }

  async function addStage(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (form.date_start && form.date_end && form.date_end < form.date_start) {
      setError("La date de fin est avant la date de début.")
      return
    }
    if (addConflict) { setError(overlapMessage(addConflict)); return }

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
    if (error || !data) { setError(stageError(error)); return }

    onChange([...stages, data as Stage])
    setForm(EMPTY)
    pickedRef.current = false
    setAdding(false)
    // Le trigger vient d'inscrire l'organisateur sur l'étape.
    onRefresh()
  }

  /** Le trigger de la base renvoie un message balisé qu'on reformule ici. */
  function stageError(e: { message?: string; code?: string } | null) {
    const raw = e?.message ?? ""
    if (raw.startsWith("CHEVAUCHEMENT|")) {
      const [, name, start, end] = raw.split("|")
      return `Ces dates chevauchent « ${name} » (${formatRange(start, end)}).`
    }
    return dbError(e)
  }

  async function saveEdit(id: string) {
    const patch = {
      name: (draft.name ?? "").trim(),
      description: draft.description?.trim() || null,
      date_start: draft.date_start || null,
      date_end: draft.date_end || null,
    }
    if (!patch.name) return
    if (patch.date_start && patch.date_end && patch.date_end < patch.date_start) {
      setError("La date de fin est avant la date de début.")
      return
    }
    if (editConflict) { setError(overlapMessage(editConflict)); return }

    setError("")
    const { error } = await supabase.from("stages").update(patch).eq("id", id)
    if (error) { setError(stageError(error)); return }
    onChange(stages.map(s => (s.id === id ? { ...s, ...patch } as Stage : s)))
    setEditing(null)
    onRefresh()
  }

  async function remove(s: Stage) {
    const n = new Set(participations.filter(p => p.stage_id === s.id).map(p => p.member_id)).size
    const ok = await ask({
      title: `Supprimer l'étape « ${s.name} » ?`,
      message: n > 0
        ? `${n} participation${n > 1 ? "s y sont rattachées et seront supprimées" : " y est rattachée et sera supprimée"}, ainsi que la discussion, l'album et les activités de l'étape.`
        : "La discussion, l'album et les activités de l'étape partent avec.",
      confirmLabel: "Supprimer",
      tone: "danger",
    })
    if (!ok) return
    const { error } = await supabase.from("stages").delete().eq("id", s.id)
    if (error) { setError(dbError(error)); return }
    onChange(stages.filter(x => x.id !== s.id))
    onParticipationsChange(participations.filter(p => p.stage_id !== s.id))
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

  /** L'organisateur est inscrit d'office ; ce bouton lui permet de se retirer. */
  async function toggleMine(s: Stage) {
    if (!ownerMemberId) return
    const existing = participations.find(p => p.stage_id === s.id && p.member_id === ownerMemberId)
    setBusy(s.id)
    setError("")

    if (existing) {
      const { error } = await supabase.from("participations").delete().eq("id", existing.id)
      setBusy(null)
      if (error) { setError(dbError(error)); return }
      onParticipationsChange(participations.filter(p => p.id !== existing.id))
    } else {
      if (!s.date_start || !s.date_end) { setBusy(null); setError("Donne d'abord des dates à cette étape."); return }
      const { data, error } = await supabase
        .from("participations")
        .insert({ member_id: ownerMemberId, stage_id: s.id, date_start: s.date_start, date_end: s.date_end })
        .select()
        .single()
      setBusy(null)
      if (error || !data) { setError(dbError(error)); return }
      onParticipationsChange([...participations, data as Participation])
    }
    onRefresh()
  }

  const dateBounds = { min: tripStart ?? undefined, max: tripEnd ?? undefined }

  const list = (
    <div>
      {dialog}
      {booked.length > 0 && (
        <div style={{ ...card, marginBottom: "12px", padding: "12px 14px" }}>
          <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px", marginBottom: "8px" }}>
            JOURS DÉJÀ OCCUPÉS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {booked.map(s => {
              const color = stageColor(stages.findIndex(x => x.id === s.id))
              return (
                <span key={s.id} style={{ ...tint(color), borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: 600 }}>
                  {s.name} · {formatRange(s.date_start, s.date_end)}
                </span>
              )
            })}
          </div>
          <p style={{ fontSize: "11px", color: C.dim, marginTop: "8px", lineHeight: 1.45 }}>
            Le jour de départ d&apos;une étape peut servir de jour d&apos;arrivée à la suivante.
          </p>
        </div>
      )}

      {stages.map((s, i) => {
        const people = new Set(participations.filter(p => p.stage_id === s.id).map(p => p.member_id)).size
        const isEditing = editing === s.id
        const mine = ownerMemberId
          ? participations.some(p => p.stage_id === s.id && p.member_id === ownerMemberId)
          : false
        const isSelected = selectedStageId === s.id

        return (
          <div
            key={s.id}
            className={isEditing ? "" : "hoverable"}
            style={{
              ...card,
              marginBottom: "10px",
              border: `1px solid ${isSelected ? stageColor(i) : C.card2}`,
            }}
          >
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input value={draft.name ?? ""} onChange={e => setDraft({ ...draft, name: e.target.value })} style={input} placeholder="Nom de l'étape" />
                <textarea rows={2} value={draft.description ?? ""} onChange={e => setDraft({ ...draft, description: e.target.value })} style={{ ...input, resize: "vertical" }} placeholder="Description" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <input type="date" {...dateBounds} value={draft.date_start ?? ""} onChange={e => { setDraft({ ...draft, date_start: e.target.value }); setError("") }} style={input} />
                  <input type="date" min={draft.date_start ?? dateBounds.min} max={dateBounds.max} value={draft.date_end ?? ""} onChange={e => { setDraft({ ...draft, date_end: e.target.value }); setError("") }} style={input} />
                </div>
                {editConflict && (
                  <p style={{ color: C.warn, fontSize: "12px", lineHeight: 1.45 }}>{overlapMessage(editConflict)}</p>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => { setEditing(null); setError("") }} style={{ flex: 1, background: C.bg, border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "10px", cursor: "pointer", fontFamily: "inherit" }}>
                    Annuler
                  </button>
                  <button onClick={() => saveEdit(s.id)} disabled={Boolean(editConflict)} style={{ flex: 1, background: C.accent, border: "none", color: C.bg, borderRadius: "100px", padding: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: editConflict ? 0.5 : 1 }}>
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ width: "28px", height: "28px", borderRadius: "9px", background: stageColor(i), color: "#0b120f", fontSize: "13px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                    {i + 1}
                  </span>
                  <button
                    onClick={() => onOpenStage(s.id)}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text }}
                  >
                    <span style={{ display: "block", fontWeight: 700, fontSize: "16px" }}>{s.name}</span>
                    <span style={{ display: "block", fontSize: "12px", color: C.muted, marginTop: "2px" }}>
                      {formatRange(s.date_start, s.date_end)} · {people} pers.
                      {s.lat == null && <span style={{ color: C.warn }}> · pas de position</span>}
                    </span>
                    {s.description && <span style={{ display: "block", fontSize: "13px", color: C.muted, marginTop: "6px" }}>{s.description}</span>}
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                    <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", color: i === 0 ? C.dim : C.muted, cursor: i === 0 ? "default" : "pointer", fontSize: "14px", padding: "2px 6px" }}>▲</button>
                    <button onClick={() => move(i, 1)} disabled={i === stages.length - 1} style={{ background: "none", border: "none", color: i === stages.length - 1 ? C.dim : C.muted, cursor: i === stages.length - 1 ? "default" : "pointer", fontSize: "14px", padding: "2px 6px" }}>▼</button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "14px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={() => toggleMine(s)}
                    disabled={busy === s.id}
                    style={{
                      background: mine ? C.green : "transparent",
                      border: `1px solid ${mine ? C.greenLight : C.dim}`,
                      color: mine ? C.accent : C.muted,
                      borderRadius: "100px",
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {mine ? "✓ Tu y es" : "Tu n'y es pas"}
                  </button>
                  <button
                    onClick={() => { setEditing(s.id); setError(""); setDraft({ name: s.name, description: s.description ?? "", date_start: s.date_start ?? "", date_end: s.date_end ?? "" }) }}
                    style={{ background: "none", border: "none", color: C.accent, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                  >
                    Modifier
                  </button>
                  <button onClick={() => remove(s)} style={{ background: "none", border: "none", color: C.dim, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                    Supprimer
                  </button>
                  <button onClick={() => onOpenStage(s.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit", marginLeft: "auto" }}>
                    Discussion →
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
              <input type="date" {...dateBounds} value={form.date_start} onChange={e => { setForm({ ...form, date_start: e.target.value }); setError("") }} style={input} />
            </div>
            <div>
              <label style={label}>DÉPART</label>
              <input type="date" min={form.date_start || dateBounds.min} max={dateBounds.max} value={form.date_end} onChange={e => { setForm({ ...form, date_end: e.target.value }); setError("") }} style={input} />
            </div>
          </div>

          {addConflict && (
            <p style={{ color: C.warn, fontSize: "12px", lineHeight: 1.45 }}>{overlapMessage(addConflict)}</p>
          )}
          {error && <p style={{ color: C.warn, fontSize: "13px", lineHeight: 1.45 }}>{error}</p>}

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY); setError("") }} style={{ flex: 1, background: C.bg, border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              Annuler
            </button>
            <button type="submit" disabled={saving || !form.name.trim() || Boolean(addConflict)} style={{ flex: 2, background: C.accent, border: "none", color: C.bg, borderRadius: "100px", padding: "12px", fontWeight: 700, cursor: "pointer", opacity: saving || !form.name.trim() || addConflict ? 0.5 : 1, fontFamily: "inherit" }}>
              {saving ? "Ajout…" : "Ajouter l'étape"}
            </button>
          </div>
        </form>
      )}

      {error && !adding && <p style={{ color: C.warn, fontSize: "13px", marginTop: "12px", lineHeight: 1.45 }}>{error}</p>}
    </div>
  )

  return list
}
