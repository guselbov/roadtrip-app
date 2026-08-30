import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentProfile, authUrl } from "@/lib/auth"
import { CreateTripForm } from "./CreateTripForm"
import { C, container, page } from "@/lib/ui"

export default async function CreateTripPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect(authUrl("/creer", "Crée ton trip"))

  return (
    <main style={page}>
      <div style={container}>
        <Link href="/" style={{ color: C.muted, fontSize: "14px", textDecoration: "none", display: "inline-block", marginBottom: "28px" }}>
          ← Retour
        </Link>
        <div style={{ fontSize: "36px", marginBottom: "10px" }}>🗺️</div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "6px" }}>Crée ton trip</h1>
        <p style={{ color: C.muted, fontSize: "14px", marginBottom: "28px" }}>
          Deux minutes, et tu peux envoyer le code à tes potes.
        </p>
        <CreateTripForm userId={profile.id} />
      </div>
    </main>
  )
}
