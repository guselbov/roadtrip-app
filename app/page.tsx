"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

function generateSlug() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  return Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export default function Home() {
  const router = useRouter()
  const [step, setStep] = useState<"landing"|"create"|"join">("landing")
  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState("")
  const [form, setForm] = useState({ title: "", description: "", creator_email: "", date_start: "", date_end: "" })

  async function createTrip(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const slug = generateSlug()
    const code = generateCode()
    const { data, error } = await supabase.from("roadtrips").insert({
      slug, code, title: form.title, description: form.description,
      creator_email: form.creator_email,
      date_start: form.date_start || null, date_end: form.date_end || null,
    }).select().single()
    if (error) { alert("Erreur : " + error.message); setLoading(false); return }
    router.push("/dashboard/" + data.slug)
  }

  async function joinTrip(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setJoinError("")
    const { data } = await supabase.from("roadtrips").select("slug").eq("code", joinCode.toUpperCase().trim()).single()
    if (!data) { setJoinError("Code invalide — vérifie avec ton pote !"); setLoading(false); return }
    router.push("/trip/" + data.slug)
  }

  const inputStyle = {
    background: "#141a0e", border: "1px solid #2d4a1e", color: "#e8e4d9",
    borderRadius: "12px", padding: "12px 16px", width: "100%", fontSize: "15px",
    outline: "none", fontFamily: "inherit"
  }

  // LANDING
  if (step === "landing") return (
    <main style={{background: "#0e1409", minHeight: "100vh", color: "#e8e4d9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden"}}>

      {/* Background décoratif */}
      <div style={{position: "absolute", top: "-80px", right: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "#1a2212", opacity: 0.8}}></div>
      <div style={{position: "absolute", bottom: "-60px", left: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "#141a0e", opacity: 0.9}}></div>
      <div style={{position: "absolute", top: "40%", left: "-40px", width: "120px", height: "120px", borderRadius: "50%", background: "#2d4a1e", opacity: 0.3}}></div>

      <div style={{position: "relative", width: "100%", maxWidth: "400px", textAlign: "center"}}>

        {/* Logo */}
        <div style={{fontSize: "56px", marginBottom: "16px"}}>🌊</div>
        <h1 style={{fontSize: "clamp(32px, 8vw, 48px)", fontWeight: "800", marginBottom: "8px", letterSpacing: "-1px"}}>RoadTrip</h1>
        <p style={{color: "#7a8a6a", fontSize: "16px", marginBottom: "56px", lineHeight: "1.5"}}>
          Organise ton aventure.<br/>Embarque tes potes.
        </p>

        {/* Deux choix */}
        <div style={{display: "flex", flexDirection: "column", gap: "14px"}}>

          <button onClick={() => setStep("create")}
            style={{background: "#8fb840", color: "#0e1409", border: "none", borderRadius: "20px", padding: "20px 24px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "16px", transition: "transform 0.15s"}}>
            <div style={{width: "48px", height: "48px", borderRadius: "14px", background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0}}>🗺️</div>
            <div>
              <div style={{fontSize: "17px", fontWeight: "800", marginBottom: "2px"}}>Je crée un trip</div>
              <div style={{fontSize: "13px", opacity: 0.7}}>Tu organises, tu invites tes potes</div>
            </div>
            <div style={{marginLeft: "auto", fontSize: "20px", opacity: 0.6}}>→</div>
          </button>

          <button onClick={() => setStep("join")}
            style={{background: "#141a0e", color: "#e8e4d9", border: "1px solid #2d4a1e", borderRadius: "20px", padding: "20px 24px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "16px"}}>
            <div style={{width: "48px", height: "48px", borderRadius: "14px", background: "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0}}>🎒</div>
            <div>
              <div style={{fontSize: "17px", fontWeight: "800", marginBottom: "2px"}}>Je rejoins un trip</div>
              <div style={{fontSize: "13px", color: "#7a8a6a"}}>Tu as un code ? Entre-le ici</div>
            </div>
            <div style={{marginLeft: "auto", fontSize: "20px", color: "#4a5a3a"}}>→</div>
          </button>

        </div>

        <p style={{color: "#4a5a3a", fontSize: "12px", marginTop: "32px"}}>
          Pas de compte requis · 100% gratuit
        </p>
      </div>
    </main>
  )

  // CREATE TRIP
  if (step === "create") return (
    <main style={{background: "#0e1409", minHeight: "100vh", color: "#e8e4d9", padding: "24px"}}>
      <div style={{maxWidth: "480px", margin: "0 auto"}}>

        <button onClick={() => setStep("landing")} style={{background: "none", border: "none", color: "#7a8a6a", cursor: "pointer", fontSize: "14px", marginBottom: "32px", display: "flex", alignItems: "center", gap: "6px", padding: 0}}>
          ← Retour
        </button>

        <div style={{fontSize: "36px", marginBottom: "12px"}}>🗺️</div>
        <h2 style={{fontSize: "28px", fontWeight: "800", marginBottom: "6px"}}>Crée ton trip</h2>
        <p style={{color: "#7a8a6a", fontSize: "14px", marginBottom: "32px"}}>Tu seras redirigé vers ton dashboard admin pour tout gérer.</p>

        <form onSubmit={createTrip} style={{display: "flex", flexDirection: "column", gap: "14px"}}>
          <div>
            <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>NOM DU TRIP *</label>
            <input required style={inputStyle} placeholder="ex : Sud-Ouest juillet 2026" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div>
            <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>DESCRIPTION</label>
            <textarea style={{...inputStyle, minHeight: "80px", resize: "vertical"}} placeholder="Quelques mots pour donner envie..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div>
            <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>TON EMAIL *</label>
            <input required type="email" style={inputStyle} placeholder="ex : augustin@gmail.com" value={form.creator_email} onChange={e => setForm({...form, creator_email: e.target.value})} />
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px"}}>
            <div>
              <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>DATE DÉBUT</label>
              <input type="date" style={inputStyle} value={form.date_start} onChange={e => setForm({...form, date_start: e.target.value})} />
            </div>
            <div>
              <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>DATE FIN</label>
              <input type="date" style={inputStyle} value={form.date_end} onChange={e => setForm({...form, date_end: e.target.value})} />
            </div>
          </div>
          <button type="submit" disabled={loading}
            style={{background: "#8fb840", color: "#0e1409", border: "none", borderRadius: "100px", padding: "16px", fontSize: "16px", fontWeight: "800", cursor: "pointer", marginTop: "8px"}}>
            {loading ? "Création en cours..." : "Créer mon trip →"}
          </button>
        </form>
      </div>
    </main>
  )

  // JOIN TRIP
  return (
    <main style={{background: "#0e1409", minHeight: "100vh", color: "#e8e4d9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px"}}>
      <div style={{width: "100%", maxWidth: "400px"}}>

        <button onClick={() => setStep("landing")} style={{background: "none", border: "none", color: "#7a8a6a", cursor: "pointer", fontSize: "14px", marginBottom: "32px", display: "flex", alignItems: "center", gap: "6px", padding: 0}}>
          ← Retour
        </button>

        <div style={{fontSize: "36px", marginBottom: "12px"}}>🎒</div>
        <h2 style={{fontSize: "28px", fontWeight: "800", marginBottom: "6px"}}>Rejoins un trip</h2>
        <p style={{color: "#7a8a6a", fontSize: "14px", marginBottom: "32px"}}>Entre le code que ton pote t a envoyé.</p>

        <form onSubmit={joinTrip} style={{display: "flex", flexDirection: "column", gap: "14px"}}>
          <div>
            <label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "6px"}}>CODE DU TRIP</label>
            <input
              required
              style={{...inputStyle, fontSize: "24px", fontWeight: "800", letterSpacing: "6px", textAlign: "center", textTransform: "uppercase"}}
              placeholder="SURF26"
              value={joinCode}
              maxLength={6}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError("") }}
            />
            {joinError && <p style={{color: "#c07040", fontSize: "13px", marginTop: "8px"}}>{joinError}</p>}
          </div>
          <button type="submit" disabled={loading || joinCode.length < 6}
            style={{background: joinCode.length === 6 ? "#8fb840" : "#141a0e", color: joinCode.length === 6 ? "#0e1409" : "#4a5a3a", border: joinCode.length === 6 ? "none" : "1px solid #2d4a1e", borderRadius: "100px", padding: "16px", fontSize: "16px", fontWeight: "800", cursor: joinCode.length === 6 ? "pointer" : "not-allowed", transition: "all 0.2s"}}>
            {loading ? "Recherche..." : "Rejoindre →"}
          </button>
        </form>

        <p style={{color: "#4a5a3a", fontSize: "12px", marginTop: "24px", textAlign: "center"}}>
          Le code est envoyé par l organisateur du trip
        </p>
      </div>
    </main>
  )
}