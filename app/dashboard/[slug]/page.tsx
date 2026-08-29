import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: trip } = await supabase.from("roadtrips").select("*").eq("slug", slug).single()
  if (!trip) return notFound()

  const { data: stages } = await supabase.from("stages").select("*").eq("roadtrip_id", trip.id).order("order_index")
  const { data: participants } = await supabase.from("participants").select("*").eq("roadtrip_id", trip.id)
  const { data: participations } = await supabase.from("participations").select("*, participants(name), stages(name, date_start, date_end)")

  return (
    <main style={{color: "white", background: "#0a0a0a", minHeight: "100vh", padding: "2rem"}}>
      <div style={{maxWidth: "800px", margin: "0 auto"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem"}}>
          <div>
            <p style={{color: "#888", fontSize: "0.875rem", marginBottom: "4px"}}>Dashboard</p>
            <h1 style={{fontSize: "1.75rem", fontWeight: "bold"}}>{trip.title}</h1>
          </div>
          <a href={"/trip/" + slug} style={{background: "#222", color: "white", padding: "8px 16px", borderRadius: "8px", textDecoration: "none", fontSize: "0.875rem"}}>
            Voir la page publique
          </a>
        </div>
        <DashboardClient
          trip={trip}
          stages={stages || []}
          participants={participants || []}
          participations={participations || []}
        />
      </div>
    </main>
  )
}