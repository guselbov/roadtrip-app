"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export function DashboardClient({ trip: initialTrip, stages: initialStages, participants, participations: initialP, slug }: any) {
  const [trip, setTrip] = useState(initialTrip)
  const [stages, setStages] = useState(initialStages)
  const [participations, setParticipations] = useState(initialP)
  const [editingTrip, setEditingTrip] = useState(false)
  const [editingStage, setEditingStage] = useState<string|null>(null)
  const [loadingP, setLoadingP] = useState<string|null>(null)
  const [activeTab, setActiveTab] = useState<"participations"|"stages"|"messages">("participations")
  const [activeStageMsg, setActiveStageMsg] = useState<string|null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState("")
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [addingStage, setAddingStage] = useState(false)
  const [newStage, setNewStage] = useState({ name: "", date_start: "", date_end: "", description: "" })
  const [copiedToken, setCopiedToken] = useState<string|null>(null)

  const pending = participations.filter((p: any) => p.status === "pending")
  const approved = participations.filter((p: any) => p.status === "approved")

  async function saveTrip() {
    await supabase.from("roadtrips").update({ title: trip.title, description: trip.description, date_start: trip.date_start || null, date_end: trip.date_end || null }).eq("id", trip.id)
    setEditingTrip(false)
  }

  async function saveStage(stage: any) {
    await supabase.from("stages").update({ name: stage.name, description: stage.description, date_start: stage.date_start || null, date_end: stage.date_end || null }).eq("id", stage.id)
    setEditingStage(null)
  }

  function updateStageLocal(id: string, field: string, value: string) {
    setStages((prev: any[]) => prev.map((s: any) => s.id === id ? {...s, [field]: value} : s))
  }

  async function deleteStage(id: string) {
    if (!confirm("Supprimer cette étape ?")) return
    await supabase.from("stages").delete().eq("id", id)
    setStages((prev: any[]) => prev.filter((s: any) => s.id !== id))
  }

  async function addStage(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(newStage.name) + "&format=json&limit=1", { headers: { "User-Agent": "RoadTripApp/1.0" } })
    const geo = await res.json()
    const lat = geo[0] ? parseFloat(geo[0].lat) : 0
    const lng = geo[0] ? parseFloat(geo[0].lon) : 0
    const { data } = await supabase.from("stages").insert({ roadtrip_id: trip.id, name: newStage.name, description: newStage.description, date_start: newStage.date_start || null, date_end: newStage.date_end || null, lat, lng, order_index: stages.length }).select().single()
    if (data) { setStages((prev: any[]) => [...prev, data]); setAddingStage(false); setNewStage({ name: "", date_start: "", date_end: "", description: "" }) }
  }

  async function updateStatus(id: string, status: string) {
    setLoadingP(id)
    await supabase.from("participations").update({ status }).eq("id", id)
    setParticipations((prev: any) => prev.map((p: any) => p.id === id ? {...p, status} : p))
    setLoadingP(null)
  }

  async function deleteParticipation(id: string) {
    if (!confirm("Supprimer cette participation ?")) return
    await supabase.from("participations").delete().eq("id", id)
    setParticipations((prev: any) => prev.filter((p: any) => p.id !== id))
  }

  async function loadMessages(stageId: string) {
    setActiveStageMsg(stageId)
    setLoadingMsg(true)
    const { data } = await supabase.from("messages").select("*").eq("stage_id", stageId).order("created_at")
    setMessages(data || [])
    setLoadingMsg(false)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim() || !activeStageMsg) return
    const tempMsg = { id: "temp-" + Date.now(), stage_id: activeStageMsg, author: "Admin", content: newMsg, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempMsg])
    setNewMsg("")
    const { data } = await supabase.from("messages").insert({ stage_id: activeStageMsg, author: "Admin", content: newMsg }).select().single()
    if (data) setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m))
  }

  function copyParticipantLink(token: string) {
    navigator.clipboard.writeText(window.location.origin + "/participant/" + token)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const colors = ["#2d4a1e","#5c3d2e","#3d6429","#7a5240","#1a2212"]
  const tabStyle = (tab: string) => ({ padding: "8px 18px", borderRadius: "100px", fontSize: "13px", fontWeight: "600", cursor: "pointer", border: "none", background: activeTab === tab ? "#8fb840" : "#141a0e", color: activeTab === tab ? "#0e1409" : "#7a8a6a" })
  const inputStyle = { background: "#0e1409", border: "1px solid #2d4a1e", color: "#e8e4d9", borderRadius: "10px", padding: "10px 14px", width: "100%", fontSize: "14px", fontFamily: "inherit" }

  // Récupérer les tokens des participants
  const participantTokens: Record<string, string> = {}
  participants.forEach((p: any) => { participantTokens[p.id] = p.token })

  // Grouper les participations approuvées par participant
  const approvedByParticipant: Record<string, any[]> = {}
  approved.forEach((p: any) => {
    const pid = p.participant_id
    if (!approvedByParticipant[pid]) approvedByParticipant[pid] = []
    approvedByParticipant[pid].push(p)
  })

  return (
    <div>
      {/* STATS */}
      <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px"}}>
        {[
          { label: "Étapes", value: stages.length, color: "#e8e4d9" },
          { label: "Potes", value: participants.length, color: "#60a5fa" },
          { label: "Confirmés", value: approved.length, color: "#8fb840" },
          { label: "En attente", value: pending.length, color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{background: "#141a0e", borderRadius: "14px", padding: "14px 16px", border: "1px solid #1a2212"}}>
            <div style={{fontSize: "11px", color: "#7a8a6a", marginBottom: "4px"}}>{s.label}</div>
            <div style={{fontSize: "22px", fontWeight: "700", color: s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* EDIT TRIP */}
      <div style={{background: "#141a0e", borderRadius: "16px", padding: "20px", marginBottom: "20px", border: "1px solid #1a2212"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editingTrip ? "16px" : "0"}}>
          <h2 style={{fontSize: "15px", fontWeight: "700"}}>Infos du trip</h2>
          <button onClick={() => editingTrip ? saveTrip() : setEditingTrip(true)}
            style={{background: editingTrip ? "#8fb840" : "#2d4a1e", color: editingTrip ? "#0e1409" : "#8fb840", border: "none", borderRadius: "100px", padding: "6px 16px", fontSize: "12px", fontWeight: "700", cursor: "pointer"}}>
            {editingTrip ? "Enregistrer" : "Modifier"}
          </button>
        </div>
        {editingTrip ? (
          <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
            <div><label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "5px"}}>NOM DU TRIP</label><input style={inputStyle} value={trip.title} onChange={e => setTrip({...trip, title: e.target.value})} /></div>
            <div><label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "5px"}}>DESCRIPTION</label><textarea style={{...inputStyle, minHeight: "80px", resize: "vertical"}} value={trip.description || ""} onChange={e => setTrip({...trip, description: e.target.value})} /></div>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
              <div><label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "5px"}}>DATE DÉBUT</label><input type="date" style={inputStyle} value={trip.date_start || ""} onChange={e => setTrip({...trip, date_start: e.target.value})} /></div>
              <div><label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "5px"}}>DATE FIN</label><input type="date" style={inputStyle} value={trip.date_end || ""} onChange={e => setTrip({...trip, date_end: e.target.value})} /></div>
            </div>
          </div>
        ) : (
          <div style={{color: "#7a8a6a", fontSize: "14px", marginTop: "8px"}}>
            <span style={{color: "#e8e4d9", fontWeight: "600"}}>{trip.title}</span>
            {trip.date_start && <span> · {new Date(trip.date_start).toLocaleDateString("fr-FR", {day:"numeric", month:"long"})} → {new Date(trip.date_end).toLocaleDateString("fr-FR", {day:"numeric", month:"long", year:"numeric"})}</span>}
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap"}}>
        <button style={tabStyle("participations")} onClick={() => setActiveTab("participations")}>👥 Participations</button>
        <button style={tabStyle("stages")} onClick={() => setActiveTab("stages")}>📍 Étapes</button>
        <button style={tabStyle("messages")} onClick={() => setActiveTab("messages")}>💬 Messages</button>
      </div>

      {/* TAB PARTICIPATIONS */}
      {activeTab === "participations" && (
        <div>
          {pending.length > 0 && (
            <div style={{marginBottom: "24px"}}>
              <h3 style={{fontSize: "13px", color: "#7a8a6a", letterSpacing: "1px", marginBottom: "12px"}}>EN ATTENTE ({pending.length})</h3>
              <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                {pending.map((p: any) => (
                  <div key={p.id} style={{background: "#1a1200", border: "1px solid #5c3d2e", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap"}}>
                    <div style={{width: "36px", height: "36px", borderRadius: "50%", background: "#5c3d2e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0}}>
                      {p.participants?.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{flex: 1, minWidth: "120px"}}>
                      <div style={{fontWeight: "700", fontSize: "15px"}}>{p.participants?.name}</div>
                      <div style={{color: "#7a8a6a", fontSize: "12px"}}>📍 {p.stages?.name} · {p.date_start} → {p.date_end}
                        {p.overlap_start && <span style={{color: "#fbbf24"}}> · ensemble {p.overlap_start} → {p.overlap_end}</span>}
                      </div>
                    </div>
                    <div style={{display: "flex", gap: "8px"}}>
                      <button onClick={() => updateStatus(p.id, "approved")} disabled={loadingP === p.id}
                        style={{background: "#2d4a1e", color: "#8fb840", padding: "8px 16px", borderRadius: "100px", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px"}}>
                        {loadingP === p.id ? "..." : "✓ Valider"}
                      </button>
                      <button onClick={() => updateStatus(p.id, "rejected")} disabled={loadingP === p.id}
                        style={{background: "#2d0000", color: "#f87171", padding: "8px 16px", borderRadius: "100px", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px"}}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONFIRMES - groupés par participant */}
          <div>
            <h3 style={{fontSize: "13px", color: "#7a8a6a", letterSpacing: "1px", marginBottom: "12px"}}>CONFIRMÉS ({Object.keys(approvedByParticipant).length} potes)</h3>
            {Object.keys(approvedByParticipant).length === 0 ? (
              <div style={{background: "#141a0e", borderRadius: "14px", padding: "24px", textAlign: "center", color: "#4a5a3a"}}>Aucune participation confirmée</div>
            ) : (
              <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
                {Object.entries(approvedByParticipant).map(([participantId, pList]: [string, any[]]) => {
                  const name = pList[0]?.participants?.name || "?"
                  const token = participantTokens[participantId]
                  return (
                    <div key={participantId} style={{background: "#0d2d1a", border: "1px solid #2d4a1e", borderRadius: "14px", padding: "14px 16px"}}>
                      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px"}}>
                        <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                          <div style={{width: "32px", height: "32px", borderRadius: "50%", background: "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "14px", color: "#8fb840"}}>
                            {name[0].toUpperCase()}
                          </div>
                          <span style={{fontWeight: "700", fontSize: "15px"}}>{name}</span>
                          <span style={{fontSize: "12px", color: "#7a8a6a"}}>{pList.length} étape{pList.length > 1 ? "s" : ""}</span>
                        </div>
                        <button onClick={() => copyParticipantLink(token)}
                          style={{background: copiedToken === token ? "#2d4a1e" : "#141a0e", color: copiedToken === token ? "#8fb840" : "#7a8a6a", border: "1px solid #2d4a1e", borderRadius: "100px", padding: "6px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer"}}>
                          {copiedToken === token ? "✓ Lien copié !" : "🔗 Copier son lien"}
                        </button>
                      </div>
                      <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                        {pList.map((p: any) => (
                          <div key={p.id} style={{display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0e1409", borderRadius: "8px", padding: "8px 12px"}}>
                            <span style={{fontSize: "13px"}}>📍 {p.stages?.name}</span>
                            <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                              {p.overlap_start && <span style={{fontSize: "11px", color: "#8fb840"}}>ensemble {p.overlap_start} → {p.overlap_end}</span>}
                              <button onClick={() => deleteParticipation(p.id)} style={{background: "transparent", color: "#4a5a3a", border: "none", cursor: "pointer", fontSize: "16px"}}>×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB ETAPES */}
      {activeTab === "stages" && (
        <div>
          <div style={{display: "flex", justifyContent: "flex-end", marginBottom: "16px"}}>
            <button onClick={() => setAddingStage(!addingStage)}
              style={{background: addingStage ? "#141a0e" : "#2d4a1e", color: addingStage ? "#7a8a6a" : "#8fb840", border: "1px solid #2d4a1e", borderRadius: "100px", padding: "8px 20px", fontSize: "13px", fontWeight: "700", cursor: "pointer"}}>
              {addingStage ? "Annuler" : "+ Ajouter une étape"}
            </button>
          </div>
          {addingStage && (
            <form onSubmit={addStage} style={{background: "#141a0e", border: "1px solid #2d4a1e", borderRadius: "16px", padding: "20px", marginBottom: "16px"}}>
              <h3 style={{fontSize: "14px", fontWeight: "700", marginBottom: "14px", color: "#8fb840"}}>Nouvelle étape</h3>
              <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                <input required style={inputStyle} placeholder="Ville (ex: Biarritz)" value={newStage.name} onChange={e => setNewStage({...newStage, name: e.target.value})} />
                <textarea style={{...inputStyle, minHeight: "60px", resize: "vertical"}} placeholder="Description (optionnel)" value={newStage.description} onChange={e => setNewStage({...newStage, description: e.target.value})} />
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
                  <input type="date" style={inputStyle} value={newStage.date_start} onChange={e => setNewStage({...newStage, date_start: e.target.value})} />
                  <input type="date" style={inputStyle} value={newStage.date_end} onChange={e => setNewStage({...newStage, date_end: e.target.value})} />
                </div>
                <button type="submit" style={{background: "#8fb840", color: "#0e1409", border: "none", borderRadius: "100px", padding: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer"}}>Ajouter</button>
              </div>
            </form>
          )}
          <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
            {stages.map((s: any, i: number) => (
              <div key={s.id} style={{background: "#141a0e", border: "1px solid #1a2212", borderRadius: "16px", padding: "16px"}}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editingStage === s.id ? "14px" : "0"}}>
                  <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                    <div style={{width: "28px", height: "28px", borderRadius: "50%", background: "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "#8fb840"}}>{i+1}</div>
                    {editingStage !== s.id && <span style={{fontWeight: "700", fontSize: "16px"}}>{s.name}</span>}
                  </div>
                  <div style={{display: "flex", gap: "8px"}}>
                    <button onClick={() => editingStage === s.id ? saveStage(s) : setEditingStage(s.id)}
                      style={{background: editingStage === s.id ? "#8fb840" : "#2d4a1e", color: editingStage === s.id ? "#0e1409" : "#8fb840", border: "none", borderRadius: "100px", padding: "5px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer"}}>
                      {editingStage === s.id ? "Enregistrer" : "Modifier"}
                    </button>
                    <button onClick={() => deleteStage(s.id)} style={{background: "#2d0000", color: "#f87171", border: "none", borderRadius: "100px", padding: "5px 12px", fontSize: "12px", cursor: "pointer"}}>🗑</button>
                  </div>
                </div>
                {editingStage === s.id ? (
                  <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
                    <div><label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "5px"}}>VILLE</label><input style={inputStyle} value={s.name} onChange={e => updateStageLocal(s.id, "name", e.target.value)} /></div>
                    <div><label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "5px"}}>DESCRIPTION</label><textarea style={{...inputStyle, minHeight: "60px", resize: "vertical"}} value={s.description || ""} onChange={e => updateStageLocal(s.id, "description", e.target.value)} /></div>
                    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
                      <div><label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "5px"}}>ARRIVÉE</label><input type="date" style={inputStyle} value={s.date_start || ""} onChange={e => updateStageLocal(s.id, "date_start", e.target.value)} /></div>
                      <div><label style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", display: "block", marginBottom: "5px"}}>DÉPART</label><input type="date" style={inputStyle} value={s.date_end || ""} onChange={e => updateStageLocal(s.id, "date_end", e.target.value)} /></div>
                    </div>
                  </div>
                ) : (
                  <div style={{color: "#7a8a6a", fontSize: "13px", marginTop: "6px"}}>
                    {s.date_start && <span>{new Date(s.date_start).toLocaleDateString("fr-FR", {day:"numeric", month:"short"})} → {new Date(s.date_end).toLocaleDateString("fr-FR", {day:"numeric", month:"short"})} · </span>}
                    {s.description && <span>{s.description}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB MESSAGES */}
      {activeTab === "messages" && (
        <div>
          <div style={{display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap"}}>
            {stages.map((s: any) => (
              <button key={s.id} onClick={() => loadMessages(s.id)}
                style={{padding: "8px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: "600", cursor: "pointer", border: "1px solid", borderColor: activeStageMsg === s.id ? "#3d6429" : "#1a2212", background: activeStageMsg === s.id ? "#2d4a1e" : "#141a0e", color: activeStageMsg === s.id ? "#8fb840" : "#7a8a6a"}}>
                📍 {s.name}
              </button>
            ))}
          </div>
          {!activeStageMsg ? (
            <div style={{background: "#141a0e", borderRadius: "16px", padding: "40px", textAlign: "center", color: "#4a5a3a"}}>Sélectionne une étape</div>
          ) : (
            <div style={{background: "#141a0e", borderRadius: "16px", border: "1px solid #1a2212", overflow: "hidden"}}>
              <div style={{padding: "14px 20px", borderBottom: "1px solid #1a2212"}}>
                <h3 style={{fontSize: "14px", fontWeight: "700", color: "#8fb840"}}>💬 {stages.find((s: any) => s.id === activeStageMsg)?.name}</h3>
              </div>
              <div style={{height: "300px", overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px"}}>
                {loadingMsg && <div style={{textAlign: "center", color: "#4a5a3a"}}>Chargement...</div>}
                {!loadingMsg && messages.length === 0 && <div style={{textAlign: "center", color: "#4a5a3a", marginTop: "40px"}}>Aucun message</div>}
                {messages.map((m: any) => (
                  <div key={m.id} style={{display: "flex", gap: "10px", alignItems: "flex-start"}}>
                    <div style={{width: "28px", height: "28px", borderRadius: "50%", background: m.author === "Admin" ? "#8fb840" : "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: m.author === "Admin" ? "#0e1409" : "#8fb840", flexShrink: 0}}>
                      {m.author[0].toUpperCase()}
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px"}}>
                        <span style={{fontSize: "12px", fontWeight: "700"}}>{m.author}</span>
                        <span style={{fontSize: "10px", color: "#4a5a3a"}}>{new Date(m.created_at).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"})}</span>
                      </div>
                      <div style={{background: "#0e1409", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", color: "#e8e4d9", lineHeight: "1.5"}}>{m.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} style={{padding: "14px", borderTop: "1px solid #1a2212", display: "flex", gap: "10px"}}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Écris un message en tant qu admin..."
                  style={{flex: 1, background: "#0e1409", border: "1px solid #2d4a1e", color: "#e8e4d9", borderRadius: "100px", padding: "10px 16px", fontSize: "13px", fontFamily: "inherit"}} />
                <button type="submit" style={{background: "#8fb840", color: "#0e1409", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "14px", fontWeight: "700", cursor: "pointer"}}>→</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}