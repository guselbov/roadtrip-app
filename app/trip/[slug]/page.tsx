import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { StagesSection } from "./StagesSection"
import { JoinSection } from "./JoinSection"
import { ShareButton } from "./ShareButton"

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: trip } = await supabase.from("roadtrips").select("*").eq("slug", slug).single()
  if (!trip) return notFound()
  const { data: stages } = await supabase.from("stages").select("*").eq("roadtrip_id", trip.id).order("order_index")
  const shareUrl = "https://roadtrip-app-vercel.vercel.app/trip/" + slug
  return (
    <main style={{color: "white", background: "#0a0a0a", minHeight: "100vh"}}>
      <div style={{maxWidth: "600px", margin: "0 auto", padding: "2rem"}}>
        <p style={{fontSize: "3rem", marginBottom: "1rem"}}>🌊</p>
        <h1 style={{fontSize: "2rem", fontWeight: "bold", marginBottom: "0.5rem"}}>{trip.title}</h1>
        <p style={{color: "#888", marginBottom: "2rem"}}>{trip.description}</p>
        <ShareButton url={shareUrl} title={trip.title} />
        <div style={{marginBottom: "2rem", marginTop: "2rem"}}>
          <StagesSection tripId={trip.id} stages={stages || []} />
        </div>
        <JoinSection tripId={trip.id} stages={stages || []} />
      </div>
    </main>
  )
}