"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

interface Stage {
  id: string
  name: string
  lat: number
  lng: number
  date_start: string
  date_end: string
}

export function StagesSection({ tripId, stages: initialStages }: { tripId: string, stages: Stage[] }) {
  const [stages, setStages] = useState<Stage[]>(initialStages)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", date_start: "", date_end: "" })
  const [adding, setAdding] = useState(false)

  async function geocode(city: string) {
    const res = await fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(city) + "&format=json&limit=1", { headers: { "User-Agent": "RoadTripApp/1.0" } })
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    return null
  }

  async function addStage(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const coords = await geocode(form.name)
    if (!coords) { alert("Ville non trouvee"); setLoading(false); return }
    const { data, error } = await supabase.from("stages").insert({
      roadtrip_id: tripId,
      name: form.name,
      lat: coords.lat,
      lng: coords.lng,
      date_start: form.date_start || null,
      date_end: form.date_end || null,
      order_index: stages.length
    }).select().single()
    if (!error && data) {
      setStages([...stages, data])
      setForm({ name: "", date_start: "", date_end: "" })
      setAdding(false)
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem"}}>
        <h2 style={{fontSize: "1.25rem", fontWeight: "bold"}}>Etapes du trip</h2>
        <button onClick={() => setAdding(!adding)} style={{background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer"}}>
          {adding ? "Annuler" : "+ Ajouter"}
        </button>
      </div>
      {adding && (
        <form onSubmit={addStage} style={{background: "#111", borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem"}}>
          <div style={{marginBottom: "0.75rem"}}>
            <label style={{display: "block", color: "#888", fontSize: "0.875rem", marginBottom: "4px"}}>Ville *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="ex: Bordeaux" style={{width: "100%", background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px 12px", color: "white"}} />
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem"}}>
            <div>
              <label style={{display: "block", color: "#888", fontSize: "0.875rem", marginBottom: "4px"}}>Arrivee</label>
              <input type="date" value={form.date_start} onChange={e => setForm({...form, date_start: e.target.value})} style={{width: "100%", background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px 12px", color: "white"}} />
            </div>
            <div>
              <label style={{display: "block", color: "#888", fontSize: "0.875rem", marginBottom: "4px"}}>Depart</label>
              <input type="date" value={form.date_end} onChange={e => setForm({...form, date_end: e.target.value})} style={{width: "100%", background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px 12px", color: "white"}} />
            </div>
          </div>
          <button type="submit" disabled={loading} style={{width: "100%", background: "#2563eb", color: "white", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer"}}>
            {loading ? "Ajout en cours..." : "Ajouter cette etape"}
          </button>
        </form>
      )}
      {stages.length === 0 ? (
        <div style={{textAlign: "center", padding: "3rem", color: "#555", background: "#111", borderRadius: "12px"}}>
          <p style={{fontSize: "2rem", marginBottom: "0.5rem"}}>🗺️</p>
          <p>Aucune etape pour linstant</p>
          <p style={{fontSize: "0.875rem", marginTop: "4px"}}>Ajoute des etapes pour que tes potes puissent sincrire</p>
        </div>
      ) : (
        <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          {stages.map((stage, i) => (
            <div key={stage.id} style={{background: "#111", borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem"}}>
              <div style={{width: "32px", height: "32px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", fontWeight: "bold", flexShrink: 0}}>{i + 1}</div>
              <div style={{flex: 1}}>
                <p style={{fontWeight: "bold", marginBottom: "2px"}}>{stage.name}</p>
                {stage.date_start && <p style={{color: "#888", fontSize: "0.875rem"}}>{stage.date_start} {stage.date_end ? "→ " + stage.date_end : ""}</p>}
              </div>
              <p style={{color: "#555", fontSize: "0.75rem"}}>📍 {stage.lat ? stage.lat.toFixed(2) : ""}, {stage.lng ? stage.lng.toFixed(2) : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}