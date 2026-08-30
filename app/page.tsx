import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth"
import { Landing } from "@/components/Landing"
import { TopBar } from "@/components/TopBar"
import { CodeEntry } from "@/components/CodeEntry"
import { EntryCards } from "@/components/EntryCards"
import { formatLongRange } from "@/lib/dates"
import { C, btnPrimary, card, container, page } from "@/lib/ui"
import type { MemberRole, MemberStatus } from "@/lib/types"

interface Membership {
  id: string
  role: MemberRole
  status: MemberStatus
  roadtrips: {
    id: string
    slug: string
    code: string
    title: string
    date_start: string | null
    date_end: string | null
  } | null
}

const BADGE: Record<string, { text: string; bg: string; fg: string }> = {
  owner:    { text: "ORGANISATEUR", bg: C.accent, fg: C.bg },
  approved: { text: "CONFIRMÉ",     bg: C.green,  fg: C.accent },
  pending:  { text: "EN ATTENTE",   bg: "#3a3320", fg: "#d0a850" },
  rejected: { text: "REFUSÉ",       bg: "#3a2420", fg: C.warn },
}

export default async function Home() {
  const profile = await getCurrentProfile()
  if (!profile) return <Landing />

  const supabase = await createClient()
  const { data } = await supabase
    .from("trip_members")
    .select("id, role, status, roadtrips(id, slug, code, title, date_start, date_end)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })

  const memberships = ((data as unknown as Membership[]) ?? []).filter(m => m.roadtrips)

  const ownedIds = memberships.filter(m => m.role === "owner").map(m => m.roadtrips!.id)
  const pendingByTrip = new Map<string, number>()
  if (ownedIds.length > 0) {
    const { data: pendings } = await supabase
      .from("trip_members")
      .select("trip_id")
      .eq("status", "pending")
      .in("trip_id", ownedIds)
    for (const p of pendings ?? []) {
      pendingByTrip.set(p.trip_id, (pendingByTrip.get(p.trip_id) ?? 0) + 1)
    }
  }

  return (
    <main style={page}>
      <TopBar profile={profile} />
      <div style={container}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>
          Salut {profile.display_name} 👋
        </h1>
        <p style={{ color: C.muted, fontSize: "14px", marginBottom: "24px" }}>
          {memberships.length === 0
            ? "Ton compte est prêt. Il ne manque plus que le trip."
            : `${memberships.length} trip${memberships.length > 1 ? "s" : ""} en cours.`}
        </p>

        {/* Compte tout neuf : on remontre les deux portes d'entrée plutôt que
            de laisser l'écran vide. */}
        {memberships.length === 0 && (
          <>
            <div style={{ fontSize: "11px", color: C.dim, letterSpacing: "1px", marginBottom: "12px" }}>
              PAR OÙ TU COMMENCES ?
            </div>
            <EntryCards />
            <p style={{ color: C.dim, fontSize: "12px", marginTop: "20px", lineHeight: 1.5, textAlign: "center" }}>
              Une fois lancé, tes trips s&apos;afficheront ici — ceux que tu organises
              comme ceux où tes potes t&apos;ont invité.
            </p>
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
          {memberships.map(m => {
            const trip = m.roadtrips!
            const isOwner = m.role === "owner"
            const badge = BADGE[isOwner ? "owner" : m.status]
            const pending = pendingByTrip.get(trip.id) ?? 0
            return (
              <Link
                key={m.id}
                href={isOwner ? "/dashboard/" + trip.slug : "/trip/" + trip.slug}
                style={{ ...card, textDecoration: "none", color: C.text, display: "block", position: "relative" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "18px", fontWeight: 700, lineHeight: 1.25 }}>{trip.title}</span>
                  <span style={{ background: badge.bg, color: badge.fg, borderRadius: "20px", padding: "3px 9px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {badge.text}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: C.muted }}>
                  {formatLongRange(trip.date_start, trip.date_end) || "Dates à définir"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                  <span style={{ fontSize: "12px", color: C.dim, fontFamily: "monospace", letterSpacing: "2px" }}>
                    {trip.code}
                  </span>
                  {pending > 0 && (
                    <span style={{ background: C.accent, color: C.bg, borderRadius: "20px", padding: "2px 9px", fontSize: "11px", fontWeight: 800 }}>
                      {pending} demande{pending > 1 ? "s" : ""} en attente
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {memberships.length > 0 && (
          <>
            <Link href="/creer" style={{ ...btnPrimary, display: "block", textAlign: "center", textDecoration: "none", marginBottom: "20px" }}>
              + Créer un trip
            </Link>

            <div style={{ ...card, marginBottom: "40px" }}>
              <div style={{ fontSize: "13px", color: C.muted, marginBottom: "10px" }}>Rejoindre avec un code</div>
              <CodeEntry compact />
            </div>
          </>
        )}
      </div>
    </main>
  )
}
