"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { computeOverlaps, dayCount, formatRange } from "@/lib/dates"
import { C, btnPrimary, input, label } from "@/lib/ui"
import type { Stage } from "@/lib/types"

/**
 * Sert deux cas avec le même écran :
 *  - `memberId` absent  → nouvelle demande de participation (statut pending)
 *  - `memberId` fourni  → mise à jour de ses dates (organisateur ou pote validé)
 */
export function JoinFlow({
  tripId,
  userId,
  stages,
  tripStart,
  tripEnd,
  memberId,
  initialFrom,
  initialTo,
  initialStageIds,
  trigger,
}: {
  tripId: string
  userId: string
  stages: Stage[]
  tripStart: string | null
  tripEnd: string | null
  memberId?: string
  initialFrom?: string | null
  initialTo?: string | null
  initialStageIds?: string[]
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = Boolean(memberId)

  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(initialFrom ?? tripStart ?? "")
  const [to, setTo] = useState(initialTo ?? tripEnd ?? "")
  const [touched, setTouched] = useState(false)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const overlaps = useMemo(() => computeOverlaps(stages, from, to), [stages, from, to])

  // À l'ouverture d'une modification, on restaure la sélection précédente.
  // Si rien n'a encore été déclaré, tout reste coché : on vient a priori partout.
  const effectiveExcluded = useMemo(() => {
    if (touched || !isEdit || !initialStageIds || initialStageIds.length === 0) return excluded
    return new Set(overlaps.map(o => o.stage.id).filter(id => !initialStageIds.includes(id)))
  }, [touched, isEdit, initialStageIds, overlaps, excluded])

  const kept = overlaps.filter(o => !effectiveExcluded.has(o.stage.id))
  const totalDays = from && to && to >= from ? dayCount(from, to) : 0

  function toggle(id: string) {
    const base = new Set(effectiveExcluded)
    if (base.has(id)) base.delete(id)
    else base.add(id)
    setTouched(true)
    setExcluded(base)
  }

  async function submit() {
    if (!from || !to) return
    setLoading(true)
    setError("")

    let id = memberId

    if (isEdit) {
      const { error } = await supabase
        .from("trip_members")
        .update({ date_start: from, date_end: to })
        .eq("id", memberId!)
      if (error) { setLoading(false); setError(error.message); return }

      // On remplace le jeu d'étapes : plus simple et plus sûr qu'un diff.
      const { error: delError } = await supabase
        .from("participations")
        .delete()
        .eq("member_id", memberId!)
      if (delError) { setLoading(false); setError(delError.message); return }
    } else {
      const { data: member, error: memberError } = await supabase
        .from("trip_members")
        .insert({
          trip_id: tripId,
          user_id: userId,
          role: "member",
          status: "pending",
          date_start: from,
          date_end: to,
          message: message.trim() || null,
        })
        .select("id")
        .single()

      if (memberError || !member) {
        setLoading(false)
        setError(
          memberError?.code === "23505"
            ? "Tu as déjà une demande sur ce trip."
            : memberError?.message ?? "Erreur inconnue."
        )
        return
      }
      id = member.id
    }

    if (kept.length > 0) {
      const { error: partError } = await supabase.from("participations").insert(
        kept.map(o => ({
          member_id: id!,
          stage_id: o.stage.id,
          date_start: o.start,
          date_end: o.end,
        }))
      )
      if (partError) { setLoading(false); setError(partError.message); return }
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <span onClick={() => setOpen(true)}>
      {trigger ?? <button style={btnPrimary}>Je viens ! →</button>}
    </span>
  )

  return (
    <div
      onClick={() => !loading && setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.card, borderRadius: "24px 24px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: "480px", maxHeight: "92vh", overflowY: "auto" }}
      >
        <div style={{ width: "40px", height: "4px", background: C.green, borderRadius: "2px", margin: "0 auto 18px" }} />

        <h2 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "4px" }}>
          {isEdit ? "Tes dates" : "Tes dates"}
        </h2>
        <p style={{ color: C.muted, fontSize: "14px", marginBottom: "18px" }}>
          Dis quand tu es dispo, on trouve où vous vous croisez.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          <div>
            <label style={label}>ARRIVÉE</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={input} />
          </div>
          <div>
            <label style={label}>DÉPART</label>
            <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={input} />
          </div>
        </div>

        {from && to && to >= from && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
              <span style={label}>OÙ TU CROISES LE GROUPE</span>
              <span style={{ fontSize: "12px", color: C.dim }}>{totalDays} jours dispo</span>
            </div>

            {overlaps.length === 0 && (
              <div style={{ background: C.bg, borderRadius: "12px", padding: "16px", fontSize: "14px", color: C.muted, lineHeight: 1.5 }}>
                Tes dates ne croisent aucune étape pour l&apos;instant.
                {isEdit ? " Ajuste tes dates ou les étapes du trip." : " Tu peux quand même envoyer ta demande — l'organisateur verra tes dispos."}
              </div>
            )}

            {overlaps.map(o => {
              const on = !effectiveExcluded.has(o.stage.id)
              return (
                <button
                  key={o.stage.id}
                  type="button"
                  onClick={() => toggle(o.stage.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: on ? C.card2 : C.bg,
                    border: `1px solid ${on ? C.greenLight : C.card2}`,
                    borderRadius: "14px",
                    padding: "14px",
                    marginBottom: "8px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: on ? 1 : 0.55,
                  }}
                >
                  <span
                    style={{
                      width: "22px", height: "22px", borderRadius: "7px", flexShrink: 0,
                      background: on ? C.accent : "transparent",
                      border: `2px solid ${on ? C.accent : C.dim}`,
                      color: C.bg, fontSize: "14px", fontWeight: 900,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {on ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "16px", color: C.text }}>
                      {o.stage.name}
                    </span>
                    <span style={{ display: "block", fontSize: "13px", color: C.muted, marginTop: "2px" }}>
                      {formatRange(o.start, o.end)} · {o.days} jour{o.days > 1 ? "s" : ""} ensemble
                    </span>
                  </span>
                </button>
              )
            })}

            {overlaps.length > 0 && (
              <p style={{ fontSize: "12px", color: C.dim, marginTop: "6px" }}>
                Décoche les étapes que tu veux sauter.
              </p>
            )}
          </div>
        )}

        {!isEdit && (
          <div style={{ marginBottom: "18px" }}>
            <label style={label}>UN MOT POUR L&apos;ORGANISATEUR — OPTIONNEL</label>
            <textarea
              rows={2}
              maxLength={300}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Je viens en van, j'ai 2 places !"
              style={{ ...input, resize: "vertical" }}
            />
          </div>
        )}

        {error && <p style={{ color: C.warn, fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !from || !to || to < from}
          style={{ ...btnPrimary, opacity: loading || !from || !to || to < from ? 0.5 : 1 }}
        >
          {loading
            ? "Enregistrement…"
            : isEdit
              ? `Enregistrer · ${kept.length} étape${kept.length > 1 ? "s" : ""}`
              : kept.length > 0
                ? `Envoyer ma demande · ${kept.length} étape${kept.length > 1 ? "s" : ""}`
                : "Envoyer ma demande"}
        </button>
      </div>
    </div>
  )
}
