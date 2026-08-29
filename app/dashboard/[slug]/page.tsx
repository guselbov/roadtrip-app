import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: trip } = await supabase.from("roadtrips").select("*").eq("slug", slug).single()
  if (!trip) return notFound()
  const { data: stages } = await supabase.from("stages").select("*").eq("roadtrip_id", trip.id).order("order_index")
  const { data: participants } = await supabase.from("participants").select("*").eq("roadtrip_id", trip.id)
  const { data: participations } = await supabase.from("participations").select("*, participants(name), stages(name, date_start, date_end, id)")

  return (
    <main style={{color: "#e8e4d9", background: "#0e1409", minHeight: "100vh", padding: "0"}}>
      <div style={{maxWidth: "900px", margin: "0 auto", padding: "24px 20px"}}>

        {/* HEADER */}
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px"}}>
          <div>
            <p style={{color: "#7a8a6a", fontSize: "11px", letterSpacing: "1px", marginBottom: "4px"}}>DASHBOARD ADMIN</p>
            <h1 style={{fontSize: "clamp(20px, 4vw, 28px)", fontWeight: "700"}}>{trip.title}</h1>
          </div>
          <a href={"/trip/" + slug} style={{background: "#2d4a1e", color: "#8fb840", padding: "10px 20px", borderRadius: "100px", textDecoration: "none", fontSize: "13px", fontWeight: "600", border: "1px solid #3d6429", display: "flex", alignItems: "center", gap: "6px"}}>
            👁 Voir la page publique
          </a>
        </div>

        <DashboardClient
          trip={trip}
          stages={stages || []}
          participants={participants || []}
          participations={participations || []}
          slug={slug}
        />
      </div>
    </main>
  )
}