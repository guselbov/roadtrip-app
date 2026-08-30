import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { authUrl, getCurrentProfile } from "@/lib/auth"
import { TopBar } from "@/components/TopBar"
import { DashboardClient } from "./DashboardClient"
import { page } from "@/lib/ui"
import type { Participation, Stage, Trip, TripMember } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = await getCurrentProfile()
  if (!profile) redirect(authUrl("/dashboard/" + slug))

  const supabase = await createClient()

  const { data: trip } = await supabase
    .from("roadtrips")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (!trip) notFound()
  // Le contrôle d'accès vit ici, côté serveur : impossible de le contourner
  // en tapant l'URL, contrairement à l'ancien modal de mot de passe.
  if (trip.owner_id !== profile.id) redirect("/trip/" + slug)

  const [{ data: stages }, { data: members }] = await Promise.all([
    supabase.from("stages").select("*").eq("roadtrip_id", trip.id).order("order_index"),
    supabase
      .from("trip_members")
      .select("*, profiles(id, display_name, email)")
      .eq("trip_id", trip.id)
      .order("created_at"),
  ])

  const memberIds = (members ?? []).map(m => m.id)
  const { data: participations } = memberIds.length
    ? await supabase.from("participations").select("*").in("member_id", memberIds)
    : { data: [] }

  return (
    <main style={page}>
      <TopBar profile={profile} />
      <DashboardClient
        trip={trip as Trip}
        stages={(stages ?? []) as Stage[]}
        members={(members ?? []) as unknown as TripMember[]}
        participations={(participations ?? []) as Participation[]}
        me={profile}
      />
    </main>
  )
}
