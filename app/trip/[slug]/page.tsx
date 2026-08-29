import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { JoinSection } from "./JoinSection"
import { ShareButton } from "./ShareButton"
import { AdminSwitch } from "./AdminSwitch"

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: trip } = await supabase.from("roadtrips").select("*").eq("slug", slug).single()
  if (!trip) return notFound()
  const { data: stages } = await supabase.from("stages").select("*").eq("roadtrip_id", trip.id).order("order_index")
  const { data: participations } = await supabase.from("participations").select("*, participants(name), stages(id)").eq("status", "approved")

  const totalKm = stages && stages.length > 1 ? Math.round(stages.reduce((acc, s, i) => {
    if (i === 0) return 0
    const prev = stages[i-1]
    const R = 6371
    const dLat = (s.lat - prev.lat) * Math.PI / 180
    const dLon = (s.lng - prev.lng) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(prev.lat * Math.PI/180) * Math.cos(s.lat * Math.PI/180) * Math.sin(dLon/2)**2
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }, 0)) : 0

  const uniqueParticipants = participations ? [...new Set(participations.map((p: any) => p.participants?.name).filter(Boolean))] : []
  const colors = ["#2d4a1e","#5c3d2e","#3d6429","#7a5240","#1a2212"]

  return (
    <>
      <style>{`
        .trip-container { max-width: 430px; margin: 0 auto; }
        .trip-hero { height: 280px; }
        .trip-stats-grid { grid-template-columns: 1fr auto; }
        .trip-cards-grid { grid-template-columns: 1fr 1fr; }
        @media (min-width: 768px) {
          .trip-container { max-width: 800px; }
          .trip-hero { height: 340px; }
          .trip-stats-grid { grid-template-columns: 1fr 1fr 1fr; }
          .trip-cards-grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
          .trip-stages { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        }
      `}</style>
      <main style={{background: "#0e1409", minHeight: "100vh", color: "#e8e4d9"}}>
        <div className="trip-container">

          {/* TOPBAR */}
          <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px"}}>
            <div style={{background: "#2d4a1e", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px"}}>
              ROADTRIP · {new Date(trip.date_start || Date.now()).getFullYear()}
            </div>
            <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
              <AdminSwitch slug={slug} />
              <ShareButton url={"https://roadtrip-app-vercel.vercel.app/trip/" + slug} title={trip.title} />
            </div>
          </div>

          {/* HERO */}
          <div className="trip-hero" style={{position: "relative", background: "linear-gradient(180deg, #1a2212 0%, #0e1409 100%)", overflow: "hidden", padding: "0 24px 24px", display: "flex", flexDirection: "column", justifyContent: "flex-end"}}>
            <div style={{position: "absolute", top: "20px", right: "60px", width: "100px", height: "100px", borderRadius: "50%", background: "#3d6429", opacity: 0.5}}></div>
            <div style={{position: "absolute", bottom: "60px", left: 0, right: 0, height: "80px", background: "linear-gradient(to right, #1a2212 0%, #2d4a1e 50%, #1a2212 100%)", opacity: 0.3, borderRadius: "50% 50% 0 0"}}></div>
            <div style={{position: "relative"}}>
              <div style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", marginBottom: "4px"}}>
                {stages && stages[0] ? `${stages[0].lat?.toFixed(2)}N · ${Math.abs(Number(stages[0].lng?.toFixed(2)))}W` : ""}
              </div>
              <h1 style={{fontSize: "clamp(32px, 5vw, 48px)", fontWeight: "700", lineHeight: 1}}>{trip.title}</h1>
              <div style={{fontSize: "13px", color: "#7a8a6a", marginTop: "6px"}}>
                {trip.date_start && trip.date_end
                  ? `${new Date(trip.date_start).toLocaleDateString("fr-FR", {day:"numeric", month:"long"})} → ${new Date(trip.date_end).toLocaleDateString("fr-FR", {day:"numeric", month:"long", year:"numeric"})}`
                  : ""} · {trip.creator_email?.split("@")[0]}
              </div>
            </div>
          </div>

          <div style={{padding: "20px 20px 100px"}}>

            {/* STATS */}
            <div className="trip-stats-grid" style={{display: "grid", gap: "12px", marginBottom: "24px"}}>
              <div style={{background: "#141a0e", borderRadius: "16px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <div>
                  <div style={{fontSize: "28px", fontWeight: "700"}}>{totalKm || "—"}</div>
                  <div style={{fontSize: "12px", color: "#7a8a6a"}}>km au total</div>
                </div>
                <div style={{width: "36px", height: "36px", borderRadius: "50%", background: "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px"}}>↗</div>
              </div>
              <div style={{background: "#141a0e", borderRadius: "16px", padding: "16px"}}>
                <div style={{fontSize: "20px", marginBottom: "4px"}}>📍</div>
                <div style={{fontSize: "24px", fontWeight: "700"}}>{stages?.length || 0}</div>
                <div style={{fontSize: "12px", color: "#7a8a6a"}}>étapes</div>
              </div>
              <div style={{background: "#141a0e", borderRadius: "16px", padding: "16px"}}>
                <div style={{fontSize: "20px", marginBottom: "4px"}}>👥</div>
                <div style={{fontSize: "24px", fontWeight: "700"}}>{uniqueParticipants.length}</div>
                <div style={{fontSize: "12px", color: "#7a8a6a"}}>participants</div>
              </div>
            </div>

            {/* DESCRIPTION */}
            {trip.description && (
              <p style={{color: "#a0b080", fontSize: "15px", lineHeight: "1.6", marginBottom: "24px"}}>{trip.description}</p>
            )}

            {/* CTA */}
            <JoinSection tripId={trip.id} stages={stages || []} />

            {/* ITINERAIRE */}
            {stages && stages.length > 0 && (
              <div style={{marginTop: "32px"}}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px"}}>
                  <div style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px"}}>RELEVÉ D ITINÉRAIRE</div>
                  <div style={{fontSize: "11px", color: "#7a8a6a"}}>{stages.length} ÉTAPES · {totalKm} KM</div>
                </div>
                <div style={{background: "#f5f0e8", borderRadius: "16px", padding: "20px", position: "relative", overflow: "hidden", height: "160px"}}>
                  <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none">
                    <path d={"M 0 80 " + stages.map((s, i) => `Q ${(i+0.5) * (300/stages.length)} ${40 + Math.sin(i) * 30} ${(i+1) * (300/stages.length)} ${50 + Math.cos(i*1.5) * 25}`).join(" ")} fill="none" stroke="#2d4a1e" strokeWidth="2" strokeDasharray="6 4"/>
                    {stages.map((s, i) => (
                      <g key={s.id}>
                        <circle cx={(i+0.5) * (300/stages.length)} cy={50 + Math.cos(i*1.5) * 25} r="6" fill="#2d4a1e"/>
                        <text x={(i+0.5) * (300/stages.length)} y={50 + Math.cos(i*1.5) * 25 - 12} textAnchor="middle" fontSize="8" fill="#2d4a1e" fontWeight="bold">{i+1}</text>
                      </g>
                    ))}
                  </svg>
                  <div style={{position: "absolute", bottom: "12px", left: "12px", display: "flex", gap: "8px", flexWrap: "wrap"}}>
                    {stages.map((s) => (
                      <div key={s.id} style={{background: "rgba(45,74,30,0.15)", border: "1px solid #2d4a1e", borderRadius: "20px", padding: "4px 10px", fontSize: "10px", color: "#2d4a1e", fontWeight: "600", whiteSpace: "nowrap"}}>
                        {s.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PROGRAMME */}
            <div style={{marginTop: "32px"}}>
              <h2 style={{fontSize: "20px", fontWeight: "700", marginBottom: "16px"}}>Le programme</h2>
              <div className="trip-stages">
                {stages?.map((s, i) => {
                  const stageP = participations?.filter((p: any) => p.stages?.id === s.id) || []
                  const names = stageP.map((p: any) => p.participants?.name).filter(Boolean)
                  return (
                    <div key={s.id} style={{background: "#141a0e", borderRadius: "16px", padding: "16px", marginBottom: "12px"}}>
                      <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px"}}>
                        <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                          <span style={{fontSize: "14px"}}>📍</span>
                          <span style={{fontWeight: "700", fontSize: "17px"}}>{s.name}</span>
                        </div>
                        {s.date_start && s.date_end && (
                          <div style={{background: "#2d4a1e", borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: "600", color: "#8fb840"}}>
                            J{i*2+1}-{i*2+3}
                          </div>
                        )}
                      </div>
                      {s.description && <p style={{fontSize: "13px", color: "#7a8a6a", marginBottom: "10px"}}>{s.description}</p>}
                      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px"}}>
                        <div style={{background: "#0e1409", borderRadius: "10px", padding: "10px"}}>
                          <div style={{fontSize: "10px", color: "#7a8a6a", marginBottom: "2px"}}>DATES</div>
                          <div style={{fontSize: "13px", fontWeight: "600"}}>
                            {s.date_start ? new Date(s.date_start).toLocaleDateString("fr-FR", {day:"numeric", month:"short"}) : "—"}
                            {s.date_end ? " – " + new Date(s.date_end).toLocaleDateString("fr-FR", {day:"numeric", month:"short"}) : ""}
                          </div>
                        </div>
                        <div style={{background: "#0e1409", borderRadius: "10px", padding: "10px"}}>
                          <div style={{fontSize: "10px", color: "#7a8a6a", marginBottom: "2px"}}>GROUPE</div>
                          <div style={{fontSize: "13px", fontWeight: "600"}}>{names.length} pers.</div>
                        </div>
                      </div>
                      {names.length > 0 && (
                        <div style={{display: "flex", gap: "0"}}>
                          {names.slice(0, 4).map((name: string, idx: number) => (
                            <div key={idx} style={{width: "28px", height: "28px", borderRadius: "50%", background: colors[idx % colors.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", border: "2px solid #141a0e", marginLeft: idx > 0 ? "-8px" : "0"}}>
                              {name[0].toUpperCase()}
                            </div>
                          ))}
                          {names.length > 4 && (
                            <div style={{width: "28px", height: "28px", borderRadius: "50%", background: "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", border: "2px solid #141a0e", marginLeft: "-8px"}}>
                              +{names.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CTA BAS */}
            <div style={{marginTop: "32px", textAlign: "center", padding: "24px", background: "#141a0e", borderRadius: "20px"}}>
              <p style={{color: "#7a8a6a", fontSize: "14px", marginBottom: "16px"}}>Prêt·e pour l aventure ?</p>
              <JoinSection tripId={trip.id} stages={stages || []} ctaOnly />
            </div>

          </div>
        </div>
      </main>
    </>
  )
}