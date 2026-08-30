import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { authUrl, getCurrentProfile } from "@/lib/auth"
import { TopBar } from "@/components/TopBar"
import { StagePanel } from "@/components/StagePanel"
import { C, container, page } from "@/lib/ui"

export const dynamic = "force-dynamic"

export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params
  const profile = await getCurrentProfile()
  if (!profile) redirect(authUrl("/stage/" + stageId))

  const supabase = await createClient()

  // RLS : seul un membre du trip peut lire l'étape. Un inconnu tombe sur un 404.
  const { data: stage } = await supabase
    .from("stages")
    .select("id, roadtrip_id, roadtrips(slug, title)")
    .eq("id", stageId)
    .maybeSingle()

  if (!stage) notFound()
  const trip = (stage as unknown as { roadtrips: { slug: string; title: string } }).roadtrips

  const { data: membership } = await supabase
    .from("trip_members")
    .select("id, status")
    .eq("trip_id", stage.roadtrip_id)
    .eq("user_id", profile.id)
    .maybeSingle()

  // La messagerie et l'album n'existent que pour les membres validés.
  if (membership?.status !== "approved") redirect("/trip/" + trip.slug)

  return (
    <main style={page}>
      <TopBar profile={profile} />
      <div style={{ ...container, paddingBottom: "40px" }}>
        <Link href={"/trip/" + trip.slug} style={{ color: C.muted, fontSize: "14px", textDecoration: "none", display: "inline-block", marginBottom: "16px" }}>
          ← {trip.title}
        </Link>
        <StagePanel stageId={stageId} me={profile} />
      </div>
    </main>
  )
}
