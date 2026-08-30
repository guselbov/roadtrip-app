import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, authUrl } from "@/lib/auth"
import { TopBar } from "@/components/TopBar"
import { ShareButton } from "@/components/ShareButton"
import { TripMap } from "@/components/TripMap"
import { JoinFlow } from "@/components/JoinFlow"
import { formatLongRange, formatRange } from "@/lib/dates"
import { C, avatarStyle, card, page, stageColor } from "@/lib/ui"
import type { MemberStatus, PublicTrip, Stage } from "@/lib/types"

export const dynamic = "force-dynamic"

function totalKm(stages: { lat: number | null; lng: number | null }[]) {
  let km = 0
  for (let i = 1; i < stages.length; i++) {
    const a = stages[i - 1], b = stages[i]
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) continue
    const R = 6371
    const dLat = ((b.lat - a.lat) * Math.PI) / 180
    const dLon = ((b.lng - a.lng) * Math.PI) / 180
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    km += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  }
  return Math.round(km)
}

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  const { data: raw } = await supabase.rpc("get_public_trip", { p_slug: slug })
  if (!raw) notFound()
  const trip = raw as PublicTrip
  const stages = trip.stages ?? []

  type Membership = { id: string; role: string; status: MemberStatus; date_start: string | null; date_end: string | null }
  let membership: Membership | null = null
  let myStageIds: string[] = []
  let crew: { user_id: string; profiles: { display_name: string } | null }[] = []

  if (profile) {
    const { data: m } = await supabase
      .from("trip_members")
      .select("id, role, status, date_start, date_end")
      .eq("trip_id", trip.id)
      .eq("user_id", profile.id)
      .maybeSingle()
    membership = (m as Membership | null) ?? null

    if (membership) {
      const { data: parts } = await supabase
        .from("participations")
        .select("stage_id")
        .eq("member_id", membership.id)
      myStageIds = (parts ?? []).map(p => p.stage_id)
    }
    if (membership?.status === "approved") {
      const { data: c } = await supabase
        .from("trip_members")
        .select("user_id, profiles(display_name)")
        .eq("trip_id", trip.id)
        .eq("status", "approved")
      crew = (c as unknown as typeof crew) ?? []
    }
  }

  const isOwner = membership?.role === "owner"
  const isApproved = membership?.status === "approved"
  const km = totalKm(stages)
  const tripUrl = "/trip/" + slug

  return (
    <main style={page}>
      <TopBar profile={profile} next={tripUrl} />

      <style>{`
        .trip { max-width: 480px; margin: 0 auto; padding: 0 20px 60px; }
        .trip-grid { display: block; }
        @media (min-width: 900px) {
          .trip { max-width: 1040px; }
          .trip-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 32px; align-items: start; }
          .trip-left { position: sticky; top: 16px; }
        }
      `}</style>

      <div className="trip">
        <div className="trip-grid">
        <div className="trip-left">
        {/* HERO */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
            <span style={{ background: C.green, borderRadius: "20px", padding: "5px 12px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", color: C.accent }}>
              {trip.date_start ? new Date(trip.date_start).getFullYear() : "ROADTRIP"}
            </span>
            <ShareButton slug={slug} title={trip.title} code="" />
          </div>

          <h1 style={{ fontSize: "clamp(30px, 8vw, 42px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1px" }}>
            {trip.title}
          </h1>
          <p style={{ color: C.muted, fontSize: "14px", marginTop: "8px" }}>
            {formatLongRange(trip.date_start, trip.date_end) || "Dates à définir"}
            {trip.owner_name ? ` · organisé par ${trip.owner_name}` : ""}
          </p>
          {trip.description && (
            <p style={{ color: "#a0b080", fontSize: "15px", lineHeight: 1.6, marginTop: "14px" }}>{trip.description}</p>
          )}
        </div>

        {/* CARTE */}
        {stages.some(s => s.lat != null) && (
          <div style={{ marginBottom: "20px" }}>
            <TripMap points={stages.map((s, i) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, color: stageColor(i) }))} height={300} />
          </div>
        )}

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "24px" }}>
          {[
            { icon: "📍", value: stages.length, label: "étapes" },
            { icon: "👥", value: trip.member_count, label: "confirmés" },
            { icon: "🛣️", value: km || "—", label: "km" },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: "14px" }}>
              <div style={{ fontSize: "17px", marginBottom: "4px" }}>{s.icon}</div>
              <div style={{ fontSize: "22px", fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: "12px", color: C.muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA SELON LE STATUT */}
        <div style={{ marginBottom: "32px" }}>
          {isOwner && (
            <>
              <Link href={"/dashboard/" + slug} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: C.text, background: C.green, marginBottom: "10px" }}>
                <span style={{ fontWeight: 700 }}>C&apos;est ton trip — gérer</span>
                <span style={{ color: C.accent }}>→</span>
              </Link>
              {profile && membership && (
                <JoinFlow
                  tripId={trip.id}
                  userId={profile.id}
                  stages={stages as Stage[]}
                  tripStart={trip.date_start}
                  tripEnd={trip.date_end}
                  memberId={membership.id}
                  initialFrom={membership.date_start}
                  initialTo={membership.date_end}
                  initialStageIds={myStageIds}
                  trigger={
                    <button style={{ ...card, width: "100%", border: `1px solid ${C.green}`, color: C.text, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", fontSize: "15px" }}>
                      <span>
                        {myStageIds.length > 0
                          ? `Tu es sur ${myStageIds.length} étape${myStageIds.length > 1 ? "s" : ""}`
                          : "Dis sur quelles étapes tu seras"}
                      </span>
                      <span style={{ color: C.accent, fontSize: "13px" }}>Mes dates →</span>
                    </button>
                  }
                />
              )}
            </>
          )}

          {!isOwner && isApproved && profile && membership && (
            <>
              <div style={{ ...card, background: C.green, marginBottom: "10px" }}>
                <div style={{ fontWeight: 700, marginBottom: "4px" }}>Tu es dans le trip 🎉</div>
                <div style={{ fontSize: "13px", color: "#c8d8a8" }}>
                  {myStageIds.length > 0
                    ? `${myStageIds.length} étape${myStageIds.length > 1 ? "s" : ""} confirmée${myStageIds.length > 1 ? "s" : ""} — ouvre-les pour la messagerie et les photos.`
                    : "Aucune étape enregistrée pour le moment."}
                </div>
              </div>
              <JoinFlow
                tripId={trip.id}
                userId={profile.id}
                stages={stages as Stage[]}
                tripStart={trip.date_start}
                tripEnd={trip.date_end}
                memberId={membership.id}
                initialFrom={membership.date_start}
                initialTo={membership.date_end}
                initialStageIds={myStageIds}
                trigger={
                  <button style={{ ...card, width: "100%", border: `1px solid ${C.green}`, color: C.muted, cursor: "pointer", textAlign: "center", fontFamily: "inherit", fontSize: "14px" }}>
                    Modifier mes dates
                  </button>
                }
              />
            </>
          )}

          {membership?.status === "pending" && (
            <div style={{ ...card, border: `1px solid ${C.green}` }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>Demande envoyée ⏳</div>
              <div style={{ fontSize: "13px", color: C.muted }}>
                {trip.owner_name ?? "L'organisateur"} doit valider. Tu seras prévenu ici même.
              </div>
            </div>
          )}

          {membership?.status === "rejected" && (
            <div style={{ ...card, border: `1px solid ${C.warn}` }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>Demande refusée</div>
              <div style={{ fontSize: "13px", color: C.muted }}>Contacte l&apos;organisateur si c&apos;est une erreur.</div>
            </div>
          )}

          {!membership && profile && (
            <JoinFlow
              tripId={trip.id}
              userId={profile.id}
              stages={stages as Stage[]}
              tripStart={trip.date_start}
              tripEnd={trip.date_end}
            />
          )}

          {!profile && (
            <Link
              href={authUrl(tripUrl, "Rejoins " + trip.title)}
              style={{ background: C.accent, color: C.bg, borderRadius: "100px", padding: "16px", display: "block", textAlign: "center", fontWeight: 700, fontSize: "16px", textDecoration: "none" }}
            >
              Je viens ! →
            </Link>
          )}
        </div>

        </div>

        <div className="trip-right">
        {/* ÉQUIPAGE */}
        {isApproved && crew.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px", marginBottom: "10px" }}>L&apos;ÉQUIPAGE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {crew.map(c => (
                <span key={c.user_id} style={{ display: "flex", alignItems: "center", gap: "7px", background: C.card, borderRadius: "100px", padding: "5px 12px 5px 5px" }}>
                  <span style={avatarStyle(c.user_id, 24)}>
                    {(c.profiles?.display_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: "13px" }}>{c.profiles?.display_name ?? "—"}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PROGRAMME */}
        <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "14px" }}>Le programme</h2>
        {stages.length === 0 && (
          <div style={{ ...card, color: C.muted, fontSize: "14px" }}>
            Aucune étape pour l&apos;instant. {isOwner ? "Ajoute-les depuis ton dashboard." : "L'organisateur les ajoute bientôt."}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {stages.map((s, i) => {
            const mine = myStageIds.includes(s.id)
            const inner = (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                    <span style={{ width: "26px", height: "26px", borderRadius: "9px", background: stageColor(i), color: "#0b120f", fontSize: "12px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "17px" }}>{s.name}</span>
                  </span>
                  {mine && (
                    <span style={{ background: C.accent, color: C.bg, borderRadius: "20px", padding: "2px 9px", fontSize: "10px", fontWeight: 800, whiteSpace: "nowrap" }}>
                      TU Y ES
                    </span>
                  )}
                </div>
                {s.description && (
                  <p style={{ fontSize: "13px", color: C.muted, marginBottom: "8px" }}>{s.description}</p>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", color: C.muted }}>
                  <span>{formatRange(s.date_start, s.date_end)}</span>
                  <span>
                    {s.people} pers.
                    {isApproved && <span style={{ color: C.accent, marginLeft: "10px" }}>Ouvrir →</span>}
                    {!isApproved && <span style={{ color: C.dim, marginLeft: "10px" }}>🔒</span>}
                  </span>
                </div>
              </>
            )

            return isApproved ? (
              <Link key={s.id} className="hoverable" href={"/stage/" + s.id} style={{ ...card, textDecoration: "none", color: C.text, display: "block" }}>
                {inner}
              </Link>
            ) : (
              <div key={s.id} style={card}>{inner}</div>
            )
          })}
        </div>

        {!isApproved && stages.length > 0 && (
          <p style={{ color: C.dim, fontSize: "12px", marginTop: "14px", textAlign: "center", lineHeight: 1.5 }}>
            🔒 La messagerie et l&apos;album de chaque étape s&apos;ouvrent une fois ta place validée par l&apos;organisateur.
          </p>
        )}
        </div>
        </div>
      </div>
    </main>
  )
}
