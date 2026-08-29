"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

interface Stage {
  id: string
  name: string
  date_start: string
  date_end: string
}

export function JoinSection({ tripId, stages }: { tripId: string, stages: Stage[] }) {
  const [step, setStep] = useState<"idle"|"form"|"success">("idle")
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", date_start: "", date_end: "" })
  const [overlaps, setOverlaps] = useState<{stage: Stage, days: number}[]>([])

  function computeOverlaps(ds: string, de: string) {
    if (!ds || !de) return []
    const gS = new Date(ds), gE = new Date(de)
    return stages.filter(s => s.date_start && s.date_end).map(s => {
      const sS = new Date(s.date_start), sE = new Date(s.date_end)
      const oS = gS > sS ? gS : sS
      const oE = gE < sE ? gE : sE
      if (oS <= oE) {
        const days = Math.round((oE.getTime() - oS.getTime()) / 86400000) + 1
        return { stage: s, days, overlapStart: oS.toISOString().slice(0,10), overlapEnd: oE.toISOString().slice(0,10) }
      }
      return null
    }).filter(Boolean) as {stage: Stage, days: number, overlapStart: string, overlapEnd: string}[]
  }

  function onDatesChange(ds: string, de: string) {
    setForm(f => ({...f, date_start: ds, date_end: de}))
    if (ds && de) setOverlaps(computeOverlaps(ds, de) as any)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.date_start || !form.date_end) return
    setLoading(true)
    const ovs = computeOverlaps(form.date_start, form.date_end) as any[]
    const { data: participant } = await supabase.from("participants").insert({ roadtrip_id: tripId, name: form.name }).select().single()
    if (participant && ovs.length > 0) {
      for (const ov of ovs) {
        await supabase.from("participations").insert({
          participant_id: participant.id,
          stage_id: ov.stage.id,
          date_start: form.date_start,
          date_end: form.date_end,
          overlap_start: ov.overlapStart,
          overlap_end: ov.overlapEnd,
          status: "pending"
        })
      }
    }
    setLoading(false)
    setStep("success")
  }

  if (step === "success") return (
    <div style={{background: "#111", borderRadius: "12px", padding: "2rem", textAlign: "center"}}>
      <p style={{fontSize: "2rem", marginBottom: "1rem"}}>🎉</p>
      <h3 style={{fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem"}}>Demande envoyee !</h3>
      <p style={{color: "#888"}}>Le createur va valider ta participation. Tu recevras une confirmation.</p>
    </div>
  )

  return (
    <div style={{background: "#111", borderRadius: "12px", padding: "1.5rem"}}>
      {step === "idle" ? (
        <div style={{textAlign: "center"}}>
          <p style={{color: "#888", marginBottom: "1rem"}}>Tu veux rejoindre ce trip ?</p>
          <button onClick={() => setStep("form")} style={{background: "#2563eb", color: "white", padding: "12px 32px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "1rem", fontWeight: "bold"}}>
            Je viens !
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h3 style={{fontSize: "1.125rem", fontWeight: "bold", marginBottom: "1rem"}}>Tes infos</h3>
          <div style={{marginBottom: "0.75rem"}}>
            <label style={{display: "block", color: "#888", fontSize: "0.875rem", marginBottom: "4px"}}>Ton prenom *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="ex: Thomas" style={{width: "100%", background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px 12px", color: "white"}} />
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem"}}>
            <div>
              <label style={{display: "block", color: "#888", fontSize: "0.875rem", marginBottom: "4px"}}>Tu arrives le</label>
              <input type="date" value={form.date_start} onChange={e => onDatesChange(e.target.value, form.date_end)} style={{width: "100%", background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px 12px", color: "white"}} />
            </div>
            <div>
              <label style={{display: "block", color: "#888", fontSize: "0.875rem", marginBottom: "4px"}}>Tu repars le</label>
              <input type="date" value={form.date_end} onChange={e => onDatesChange(form.date_start, e.target.value)} style={{width: "100%", background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px 12px", color: "white"}} />
            </div>
          </div>
          {overlaps.length > 0 && (
            <div style={{background: "#0d2d1a", border: "1px solid #166534", borderRadius: "8px", padding: "1rem", marginBottom: "0.75rem"}}>
              <p style={{color: "#4ade80", fontWeight: "bold", marginBottom: "0.5rem"}}>On se croise !</p>
              {overlaps.map((o: any) => (
                <p key={o.stage.id} style={{color: "#86efac", fontSize: "0.875rem"}}>📍 {o.stage.name} — {o.days} jour{o.days > 1 ? "s" : ""}</p>
              ))}
            </div>
          )}
          {form.date_start && form.date_end && overlaps.length === 0 && (
            <div style={{background: "#2d1b00", border: "1px solid #92400e", borderRadius: "8px", padding: "1rem", marginBottom: "0.75rem"}}>
              <p style={{color: "#fbbf24", fontSize: "0.875rem"}}>Aucun creneau commun avec les etapes du trip — tu peux quand meme envoyer ta dispo !</p>
            </div>
          )}
          <button type="submit" disabled={loading} style={{width: "100%", background: "#2563eb", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold"}}>
            {loading ? "Envoi..." : "Confirmer ma participation"}
          </button>
        </form>
      )}
    </div>
  )
}