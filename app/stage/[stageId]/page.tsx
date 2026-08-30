import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { authUrl, getCurrentProfile } from "@/lib/auth"
import { TopBar } from "@/components/TopBar"
import { StageClient } from "./StageClient"
import { formatRange } from "@/lib/dates"
import { C, container, page } from "@/lib/ui"
import type { Message, Photo, Stage } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params
  const profile = await getCurrentProfile()
  if (!profile) redirect(authUrl("/stage/" + stageId))

  const supabase = await createClient()

  // RLS : seul un membre du trip peut lire l'étape. Un inconnu tombe sur un 404.
  const { data: stage } = await supabase
    .from("stages")
    .select("*, roadtrips(slug, title)")
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

  const [{ data: messages }, { data: photos }, { data: crew }] = await Promise.all([
    supabase
      .from("messages")
      .select("*, profiles(id, display_name)")
      .eq("stage_id", stageId)
      .order("created_at"),
    supabase
      .from("photos")
      .select("*, profiles(id, display_name)")
      .eq("stage_id", stageId)
      .order("created_at", { ascending: false }),
    supabase
      .from("participations")
      .select("member_id, date_start, date_end, trip_members(user_id, profiles(display_name))")
      .eq("stage_id", stageId),
  ])

  return (
    <main style={page}>
      <TopBar profile={profile} />
      <div style={{ ...container, paddingBottom: "40px" }}>
        <Link href={"/trip/" + trip.slug} style={{ color: C.muted, fontSize: "14px", textDecoration: "none", display: "inline-block", marginBottom: "16px" }}>
          ← {trip.title}
        </Link>

        <h1 style={{ fontSize: "28px", fontWeight: 800 }}>{stage.name}</h1>
        <p style={{ color: C.muted, fontSize: "14px", marginTop: "6px" }}>
          {formatRange(stage.date_start, stage.date_end)}
        </p>
        {stage.description && (
          <p style={{ color: "#a0b080", fontSize: "15px", lineHeight: 1.6, marginTop: "12px" }}>{stage.description}</p>
        )}

        <StageClient
          stage={stage as Stage}
          me={profile}
          initialMessages={(messages ?? []) as unknown as Message[]}
          initialPhotos={(photos ?? []) as unknown as Photo[]}
          crew={
            (crew ?? []).map(c => {
              const m = c as unknown as {
                member_id: string
                date_start: string
                date_end: string
                trip_members: { user_id: string; profiles: { display_name: string } | null } | null
              }
              return {
                userId: m.trip_members?.user_id ?? m.member_id,
                name: m.trip_members?.profiles?.display_name ?? "—",
                start: m.date_start,
                end: m.date_end,
              }
            })
          }
        />
      </div>
    </main>
  )
}
