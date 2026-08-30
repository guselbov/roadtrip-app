import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"

export default async function ParticipantPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: participant } = await supabase
    .from("participants")
    .select("*, roadtrips(title, slug, date_start, date_end)")
    .eq("token", token)
    .single()

  if (!participant) return notFound()

  const { data: participations } = await supabase
    .from("participations")
    .select("*, stages(id, name, date_start, date_end, description, lat, lng)")
    .eq("participant_id", participant.id)
    .eq("status", "approved")

  const trip = participant.roadtrips as any

  return (
    <main style={{background: "#0e1409", minHeight: "100vh", color: "#e8e4d9"}}>
      <div style={{maxWidth: "600px", margin: "0 auto", padding: "0 0 80px"}}>

        {/* HEADER */}
        <div style={{background: "linear-gradient(180deg, #1a2212 0%, #0e1409 100%)", padding: "32px 24px", position: "relative", overflow: "hidden"}}>
          <div style={{position: "absolute", top: "10px", right: "40px", width: "80px", height: "80px", borderRadius: "50%", background: "#3d6429", opacity: 0.4}}></div>
          <a href={"/trip/" + trip?.slug} style={{display: "inline-flex", alignItems: "center", gap: "6px", color: "#7a8a6a", fontSize: "13px", textDecoration: "none", marginBottom: "20px"}}>
            ← {trip?.title}
          </a>
          <div style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", marginBottom: "6px"}}>MON TRIP</div>
          <h1 style={{fontSize: "32px", fontWeight: "800", marginBottom: "4px"}}>Salut {participant.name} 👋</h1>
          <p style={{color: "#7a8a6a", fontSize: "14px"}}>
            {trip?.date_start && new Date(trip.date_start).toLocaleDateString("fr-FR", {day:"numeric", month:"long"})}
            {trip?.date_end && " → " + new Date(trip.date_end).toLocaleDateString("fr-FR", {day:"numeric", month:"long", year:"numeric"})}
          </p>
        </div>

        <div style={{padding: "24px"}}>

          {/* MES ETAPES */}
          <h2 style={{fontSize: "18px", fontWeight: "700", marginBottom: "16px"}}>
            Mes étapes ({participations?.length || 0})
          </h2>

          {!participations?.length ? (
            <div style={{background: "#141a0e", borderRadius: "16px", padding: "32px", textAlign: "center", color: "#4a5a3a"}}>
              <div style={{fontSize: "32px", marginBottom: "8px"}}>⏳</div>
              <p>Aucune étape confirmée pour l instant</p>
            </div>
          ) : (
            <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
              {participations.map((p: any) => {
                const s = p.stages
                return (
                  <div key={p.id} style={{background: "#141a0e", borderRadius: "16px", padding: "18px", border: "1px solid #1a2212"}}>
                    <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px"}}>
                      <div>
                        <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px"}}>
                          <span>📍</span>
                          <span style={{fontWeight: "700", fontSize: "18px"}}>{s?.name}</span>
                        </div>
                        {s?.date_start && (
                          <div style={{fontSize: "13px", color: "#7a8a6a"}}>
                            {new Date(s.date_start).toLocaleDateString("fr-FR", {day:"numeric", month:"short"})}
                            {s.date_end && " → " + new Date(s.date_end).toLocaleDateString("fr-FR", {day:"numeric", month:"short"})}
                          </div>
                        )}
                      </div>
                      <div style={{background: "#2d4a1e", borderRadius: "100px", padding: "4px 12px", fontSize: "11px", fontWeight: "700", color: "#8fb840"}}>
                        ✓ Confirmé
                      </div>
                    </div>

                    {/* CHEVAUCHEMENT */}
                    {p.overlap_start && p.overlap_end && (
                      <div style={{background: "#0e1409", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center"}}>
                        <span style={{fontSize: "16px"}}>🤝</span>
                        <div>
                          <div style={{fontSize: "12px", color: "#7a8a6a"}}>On se croise</div>
                          <div style={{fontSize: "13px", fontWeight: "600", color: "#8fb840"}}>
                            {new Date(p.overlap_start).toLocaleDateString("fr-FR", {day:"numeric", month:"short"})}
                            {" → " + new Date(p.overlap_end).toLocaleDateString("fr-FR", {day:"numeric", month:"short"})}
                          </div>
                        </div>
                      </div>
                    )}

                    {s?.description && (
                      <p style={{fontSize: "13px", color: "#7a8a6a", marginBottom: "12px", lineHeight: "1.5"}}>{s.description}</p>
                    )}

                    {/* BOUTON ETAPE */}
                    <a href={"/stage/" + s?.id}
                      style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#2d4a1e", color: "#8fb840", borderRadius: "100px", padding: "12px", fontSize: "14px", fontWeight: "700", textDecoration: "none", border: "1px solid #3d6429"}}>
                      💬 Messagerie & Album photo →
                    </a>
                  </div>
                )
              })}
            </div>
          )}

          {/* LIEN RETOUR */}
          <div style={{marginTop: "32px", textAlign: "center"}}>
            <a href={"/trip/" + trip?.slug} style={{color: "#4a5a3a", fontSize: "13px", textDecoration: "none"}}>
              Voir la page complète du trip →
            </a>
          </div>

        </div>
      </div>
    </main>
  )
}