"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

interface Stage { id: string; name: string; lat: number; lng: number; date_start: string; date_end: string }

export function JoinSection({ tripId, stages: initialStages, ctaOnly }: { tripId: string, stages: Stage[], ctaOnly?: boolean }) {
  const [step, setStep] = useState<"idle"|"form"|"success">("idle")
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", date_start: "", date_end: "" })
  const [overlaps, setOverlaps] = useState<any[]>([])

  function computeOverlaps(ds: string, de: string) {
    if (!ds || !de) return []
    const gS = new Date(ds), gE = new Date(de)
    return initialStages.filter(s => s.date_start && s.date_end).map(s => {
      const sS = new Date(s.date_start), sE = new Date(s.date_end)
      const oS = gS > sS ? gS : sS, oE = gE < sE ? gE : sE
      if (oS <= oE) {
        const days = Math.round((oE.getTime() - oS.getTime()) / 86400000) + 1
        return { stage: s, days, overlapStart: oS.toISOString().slice(0,10), overlapEnd: oE.toISOString().slice(0,10) }
      }
      return null
    }).filter(Boolean)
  }

  function onDatesChange(ds: string, de: string) {
    setForm(f => ({...f, date_start: ds, date_end: de}))
    if (ds && de) setOverlaps(computeOverlaps(ds, de))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.date_start || !form.date_end) return
    setLoading(true)
    const ovs = computeOverlaps(form.date_start, form.date_end) as any[]
    const { data: participant } = await supabase.from("participants").insert({ roadtrip_id: tripId, name: form.name, email: form.email || null }).select().single()
    if (participant && ovs.length > 0) {
      for (const ov of ovs) {
        await supabase.from("participations").insert({ participant_id: participant.id, stage_id: ov.stage.id, date_start: form.date_start, date_end: form.date_end, overlap_start: ov.overlapStart, overlap_end: ov.overlapEnd, status: "pending" })
      }
    }
    setLoading(false)
    setStep("success")
  }

  if (step === "success") return (
    <div style={{textAlign: "center", padding: "24px"}}>
      <div style={{fontSize: "40px", marginBottom: "12px"}}>🎉</div>
      <h3 style={{fontSize: "18px", fontWeight: "700", marginBottom: "8px"}}>Demande envoyée !</h3>
      <p style={{color: "#7a8a6a", fontSize: "14px"}}>Le créateur valide chaque participation avant confirmation.</p>
    </div>
  )

  if (step === "idle") return (
    <button onClick={() => setStep("form")} style={{width: "100%", background: "#8fb840", color: "#0e1409", padding: "16px", borderRadius: "100px", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}>
      Je viens ! →
    </button>
  )

  return (
    <div style={{position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", zIndex: 1000}} onClick={() => setStep("idle")}>
      <div style={{background: "#141a0e", borderRadius: "24px 24px 0 0", padding: "24px", width: "100%", maxWidth: "430px", margin: "0 auto"}} onClick={e => e.stopPropagation()}>
        <div style={{width: "40px", height: "4px", background: "#2d4a1e", borderRadius: "2px", margin: "0 auto 20px"}}></div>
        <h2 style={{fontSize: "24px", fontWeight: "700", marginBottom: "4px"}}>Je viens !</h2>
        <p style={{color: "#7a8a6a", fontSize: "14px", marginBottom: "20px"}}>Indique tes dates, on gère les recoupements.</p>

        <form onSubmit={submit}>
          <div style={{marginBottom: "12px"}}>
            <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>PRÉNOM</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Camille" />
          </div>
          <div style={{marginBottom: "12px"}}>
            <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>EMAIL — OPTIONNEL</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="camille@email.com" />
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px"}}>
            <div>
              <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>ARRIVÉE</label>
              <input type="date" value={form.date_start} onChange={e => onDatesChange(e.target.value, form.date_end)} />
            </div>
            <div>
              <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>DÉPART</label>
              <input type="date" value={form.date_end} onChange={e => onDatesChange(form.date_start, e.target.value)} />
            </div>
          </div>

          {overlaps.length > 0 && (
            <div style={{background: "#0e1409", border: "1px solid #3d6429", borderRadius: "12px", padding: "14px", marginBottom: "16px"}}>
              <div style={{fontSize: "13px", fontWeight: "700", color: "#8fb840", marginBottom: "8px"}}>Tu croises {overlaps.length} étape{overlaps.length > 1 ? "s" : ""} sur ces dates</div>
              {overlaps.map((o: any) => (
                <div key={o.stage.id} style={{display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#a0b080", marginBottom: "4px"}}>
                  <span>{o.stage.name}</span>
                  <span style={{color: "#7a8a6a"}}>{o.overlapStart.slice(5).replace("-","/")} – {o.overlapEnd.slice(5).replace("-","/")} juil.</span>
                </div>
              ))}
            </div>
          )}

          {form.date_start && form.date_end && overlaps.length === 0 && (
            <div style={{background: "#1a1200", border: "1px solid #5c3d2e", borderRadius: "12px", padding: "14px", marginBottom: "16px"}}>
              <div style={{fontSize: "13px", color: "#c07040"}}>Aucun créneau commun avec les étapes — tu peux quand même confirmer.</div>
            </div>
          )}

          <button type="submit" disabled={loading} style={{width: "100%", background: "#8fb840", color: "#0e1409", padding: "16px", borderRadius: "100px", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "700"}}>
            {loading ? "Envoi..." : "Confirmer ma venue →"}
          </button>
          <p style={{textAlign: "center", fontSize: "12px", color: "#4a5a3a", marginTop: "12px"}}>Le créateur valide chaque participation avant confirmation.</p>
        </form>
      </div>
    </div>
  )
}