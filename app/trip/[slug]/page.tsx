import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: trip } = await supabase.from("roadtrips").select("*").eq("slug", slug).single()
  if (!trip) return notFound()
  const shareUrl = "http://localhost:3000/trip/" + slug
  return (
    <main style={{padding: "2rem", color: "white", background: "#0a0a0a", minHeight: "100vh"}}>
      <div style={{maxWidth: "600px", margin: "0 auto", paddingTop: "2rem"}}>
        <p style={{fontSize: "3rem", marginBottom: "1rem"}}>🌊</p>
        <h1 style={{fontSize: "2rem", fontWeight: "bold", marginBottom: "0.5rem"}}>{trip.title}</h1>
        <p style={{color: "#888", marginBottom: "2rem"}}>{trip.description}</p>
        <div style={{background: "#111", borderRadius: "12px", padding: "1.5rem"}}>
          <p style={{color: "#888", fontSize: "0.875rem", marginBottom: "0.75rem"}}>Partage ce lien a tes potes</p>
          <div style={{background: "#222", borderRadius: "8px", padding: "0.75rem", color: "#ccc", fontSize: "0.875rem"}}>
            {shareUrl}
          </div>
        </div>
      </div>
    </main>
  )
}