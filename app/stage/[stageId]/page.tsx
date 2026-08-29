import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { StageClient } from "./StageClient"

export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params
  const { data: stage } = await supabase.from("stages").select("*, roadtrips(title, slug)").eq("id", stageId).single()
  if (!stage) return notFound()
  const { data: participations } = await supabase.from("participations").select("*, participants(name)").eq("stage_id", stageId).eq("status", "approved")
  const { data: messages } = await supabase.from("messages").select("*").eq("stage_id", stageId).order("created_at")
  const { data: photos } = await supabase.from("photos").select("*").eq("stage_id", stageId).order("created_at", { ascending: false })

  const participants = participations?.map((p: any) => p.participants?.name).filter(Boolean) || []

  return (
    <main style={{background: "#0e1409", minHeight: "100vh", color: "#e8e4d9"}}>
      <div style={{maxWidth: "700px", margin: "0 auto", padding: "0 0 80px"}}>

        {/* HEADER */}
        <div style={{background: "linear-gradient(180deg, #1a2212 0%, #0e1409 100%)", padding: "24px 24px 32px", position: "relative", overflow: "hidden"}}>
          <div style={{position: "absolute", top: "10px", right: "40px", width: "80px", height: "80px", borderRadius: "50%", background: "#3d6429", opacity: 0.4}}></div>
          <a href={"/trip/" + (stage.roadtrips as any)?.slug} style={{display: "inline-flex", alignItems: "center", gap: "6px", color: "#7a8a6a", fontSize: "13px", textDecoration: "none", marginBottom: "20px"}}>
            ← {(stage.roadtrips as any)?.title}
          </a>
          <div style={{fontSize: "11px", color: "#7a8a6a", letterSpacing: "1px", marginBottom: "6px"}}>ÉTAPE</div>
          <h1 style={{fontSize: "clamp(28px, 5vw, 40px)", fontWeight: "700", marginBottom: "8px"}}>{stage.name}</h1>
          {stage.date_start && (
            <div style={{fontSize: "14px", color: "#7a8a6a"}}>
              📅 {new Date(stage.date_start).toLocaleDateString("fr-FR", {day:"numeric", month:"long"})}
              {stage.date_end && " → " + new Date(stage.date_end).toLocaleDateString("fr-FR", {day:"numeric", month:"long"})}
            </div>
          )}
          {stage.description && (
            <p style={{marginTop: "16px", color: "#a0b080", fontSize: "15px", lineHeight: "1.6"}}>{stage.description}</p>
          )}

          {/* PARTICIPANTS */}
          {participants.length > 0 && (
            <div style={{marginTop: "20px", display: "flex", alignItems: "center", gap: "12px"}}>
              <div style={{display: "flex"}}>
                {participants.slice(0, 5).map((name: string, i: number) => (
                  <div key={i} style={{width: "32px", height: "32px", borderRadius: "50%", background: ["#2d4a1e","#5c3d2e","#3d6429","#7a5240","#1a2212"][i % 5], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", border: "2px solid #1a2212", marginLeft: i > 0 ? "-8px" : "0"}}>
                    {name[0].toUpperCase()}
                  </div>
                ))}
              </div>
              <span style={{fontSize: "13px", color: "#7a8a6a"}}>{participants.join(", ")}</span>
            </div>
          )}
        </div>

        <div style={{padding: "24px"}}>
          <StageClient
            stageId={stageId}
            participants={participants}
            initialMessages={messages || []}
            initialPhotos={photos || []}
          />
        </div>
      </div>
    </main>
  )
}