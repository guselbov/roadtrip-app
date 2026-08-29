"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export function DashboardClient({ trip, stages, participants, participations: initialP }: any) {
  const [participations, setParticipations] = useState(initialP)
  const [loading, setLoading] = useState<string|null>(null)

  const pending = participations.filter((p: any) => p.status === "pending")
  const approved = participations.filter((p: any) => p.status === "approved")
  const rejected = participations.filter((p: any) => p.status === "rejected")

  async function updateStatus(id: string, status: string) {
    setLoading(id)
    await supabase.from("participations").update({ status }).eq("id", id)
    setParticipations((prev: any) => prev.map((p: any) => p.id === id ? {...p, status} : p))
    setLoading(null)
  }

  return (
    <div>
      <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem"}}>
        <div style={{background: "#111", borderRadius: "12px", padding: "1rem"}}>
          <p style={{color: "#888", fontSize: "0.75rem", marginBottom: "4px"}}>Etapes</p>
          <p style={{fontSize: "1.75rem", fontWeight: "bold"}}>{stages.length}</p>
        </div>
        <div style={{background: "#111", borderRadius: "12px", padding: "1rem"}}>
          <p style={{color: "#888", fontSize: "0.75rem", marginBottom: "4px"}}>Potes</p>
          <p style={{fontSize: "1.75rem", fontWeight: "bold", color: "#60a5fa"}}>{participants.length}</p>
        </div>
        <div style={{background: "#111", borderRadius: "12px", padding: "1rem"}}>
          <p style={{color: "#888", fontSize: "0.75rem", marginBottom: "4px"}}>Confirmes</p>
          <p style={{fontSize: "1.75rem", fontWeight: "bold", color: "#4ade80"}}>{approved.length}</p>
        </div>
        <div style={{background: "#111", borderRadius: "12px", padding: "1rem"}}>
          <p style={{color: "#888", fontSize: "0.75rem", marginBottom: "4px"}}>En attente</p>
          <p style={{fontSize: "1.75rem", fontWeight: "bold", color: "#fbbf24"}}>{pending.length}</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{marginBottom: "2rem"}}>
          <h2 style={{fontSize: "1.125rem", fontWeight: "bold", marginBottom: "1rem"}}>En attente de validation ({pending.length})</h2>
          <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {pending.map((p: any) => (
              <div key={p.id} style={{background: "#1a1200", border: "1px solid #92400e", borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem"}}>
                <div style={{width: "36px", height: "36px", borderRadius: "50%", background: "#92400e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0}}>
                  {p.participants?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{flex: 1}}>
                  <p style={{fontWeight: "bold"}}>{p.participants?.name}</p>
                  <p style={{color: "#888", fontSize: "0.875rem"}}>
                    📍 {p.stages?.name} · {p.date_start} → {p.date_end}
                    {p.overlap_start && <span style={{color: "#fbbf24"}}> · ensemble {p.overlap_start} → {p.overlap_end}</span>}
                  </p>
                </div>
                <div style={{display: "flex", gap: "0.5rem"}}>
                  <button
                    onClick={() => updateStatus(p.id, "approved")}
                    disabled={loading === p.id}
                    style={{background: "#166534", color: "#4ade80", padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold"}}
                  >
                    {loading === p.id ? "..." : "✓ Valider"}
                  </button>
                  <button
                    onClick={() => updateStatus(p.id, "rejected")}
                    disabled={loading === p.id}
                    style={{background: "#7f1d1d", color: "#f87171", padding: "6px 14px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold"}}
                  >
                    ✕ Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{marginBottom: "2rem"}}>
        <h2 style={{fontSize: "1.125rem", fontWeight: "bold", marginBottom: "1rem"}}>Confirmes ({approved.length})</h2>
        {approved.length === 0 ? (
          <div style={{background: "#111", borderRadius: "12px", padding: "2rem", textAlign: "center", color: "#555"}}>
            <p>Aucune participation confirmee</p>
          </div>
        ) : (
          <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            {approved.map((p: any) => (
              <div key={p.id} style={{background: "#0d2d1a", border: "1px solid #166534", borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem"}}>
                <div style={{width: "36px", height: "36px", borderRadius: "50%", background: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0}}>
                  {p.participants?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{flex: 1}}>
                  <p style={{fontWeight: "bold"}}>{p.participants?.name}</p>
                  <p style={{color: "#888", fontSize: "0.875rem"}}>
                    📍 {p.stages?.name} · {p.date_start} → {p.date_end}
                    {p.overlap_start && <span style={{color: "#4ade80"}}> · ensemble {p.overlap_start} → {p.overlap_end}</span>}
                  </p>
                </div>
                <button
                  onClick={() => updateStatus(p.id, "rejected")}
                  style={{background: "transparent", color: "#555", padding: "6px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "1.25rem"}}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{fontSize: "1.125rem", fontWeight: "bold", marginBottom: "1rem"}}>Etapes ({stages.length})</h2>
        <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
          {stages.map((s: any, i: number) => {
            const stageP = approved.filter((p: any) => p.stage_id === s.id)
            return (
              <div key={s.id} style={{background: "#111", borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem"}}>
                <div style={{width: "32px", height: "32px", borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0, fontSize: "0.875rem"}}>{i+1}</div>
                <div style={{flex: 1}}>
                  <p style={{fontWeight: "bold"}}>{s.name}</p>
                  <p style={{color: "#888", fontSize: "0.875rem"}}>{s.date_start} → {s.date_end}</p>
                </div>
                <div style={{display: "flex", gap: "0.5rem"}}>
                  {stageP.length > 0 ? stageP.map((p: any) => (
                    <div key={p.id} style={{width: "28px", height: "28px", borderRadius: "50%", background: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold"}} title={p.participants?.name}>
                      {p.participants?.name?.[0]?.toUpperCase()}
                    </div>
                  )) : <p style={{color: "#555", fontSize: "0.875rem"}}>Personne</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}