"use client"
import { useEffect } from "react"
import { useActivities } from "@/lib/useActivities"
import { ActivityForm, ActivityList } from "./ActivityList"
import { stageSpan, toDate } from "@/lib/dates"
import { C, avatarStyle, card, sectionTitle, stageColor, tint } from "@/lib/ui"
import type { Participation, Profile, Stage, TripMember } from "@/lib/types"

/**
 * Panneau latéral d'une journée : l'étape en cours, qui est là, ce qui est
 * calé, et les idées du groupe qu'on peut y ajouter.
 */
export function DayPanel({
  day,
  tripId,
  stages,
  members,
  participations,
  me,
  isOwner,
  onClose,
}: {
  day: string
  tripId: string
  stages: Stage[]
  members: TripMember[]
  participations: Participation[]
  me: Profile
  isOwner: boolean
  onClose: () => void
}) {
  const acts = useActivities(tripId, me.id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Une journée appartient à l'étape dont l'emprise [arrivée, départ) la contient.
  const stageIndex = stages.findIndex(s => {
    if (!s.date_start || !s.date_end) return false
    const [from, to] = stageSpan(s.date_start, s.date_end)
    return day >= from && day < to
  })
  const stage = stageIndex >= 0 ? stages[stageIndex] : null
  const color = stageIndex >= 0 ? stageColor(stageIndex) : C.muted

  const memberById = new Map(members.map(m => [m.id, m]))
  const here = participations
    .filter(p => day >= p.date_start && day <= p.date_end)
    .map(p => memberById.get(p.member_id))
    .filter((m): m is TripMember => m !== undefined && m.status === "approved")
  const uniqueHere = Array.from(new Map(here.map(m => [m.user_id, m])).values())

  const scheduled = acts.activities.filter(a => a.scheduled_on === day)
  const proposals = acts.activities
    .filter(a => a.status === "proposed" && (!stage || a.stage_id === stage.id))
    .sort((x, y) => (acts.voteCount.get(y.id) ?? 0) - (acts.voteCount.get(x.id) ?? 0))

  // Majuscule sur la première lettre seulement : « dimanche 12 juillet »,
  // pas « Dimanche 12 Juillet » que produirait text-transform: capitalize.
  const raw = toDate(day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  const longDate = raw.charAt(0).toUpperCase() + raw.slice(1)

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 2000 }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(420px, 100vw)",
          background: C.bg,
          borderLeft: `1px solid ${C.card2}`,
          zIndex: 2001,
          overflowY: "auto",
          padding: "20px",
          boxShadow: "-20px 0 50px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "18px" }}>
          <div>
            <div style={{ fontSize: "11px", color: C.dim, letterSpacing: "1.5px", fontWeight: 700 }}>LA JOURNÉE</div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, marginTop: "4px" }}>{longDate}</h2>
            {stage ? (
              <span style={{ ...tint(color), borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 700, display: "inline-block", marginTop: "8px" }}>
                {stage.name}
              </span>
            ) : (
              <p style={{ color: C.dim, fontSize: "13px", marginTop: "8px" }}>Aucune étape ne couvre ce jour.</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: C.card, border: `1px solid ${C.card2}`, color: C.text, borderRadius: "50%", width: "34px", height: "34px", fontSize: "16px", cursor: "pointer", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Qui est là */}
        <section style={{ marginBottom: "22px" }}>
          <h3 style={sectionTitle}>QUI EST LÀ · {uniqueHere.length}</h3>
          {uniqueHere.length === 0 ? (
            <p style={{ color: C.dim, fontSize: "13px" }}>Personne n&apos;est enregistré ce jour-là.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {uniqueHere.map(m => (
                <span key={m.user_id} style={{ display: "flex", alignItems: "center", gap: "7px", background: C.card, borderRadius: "100px", padding: "5px 12px 5px 5px" }}>
                  <span style={avatarStyle(m.user_id, 22)}>
                    {(m.profiles?.display_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: "12px" }}>{m.profiles?.display_name ?? "—"}</span>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Au programme */}
        <section style={{ marginBottom: "22px" }}>
          <h3 style={sectionTitle}>AU PROGRAMME</h3>
          {acts.error && <p style={{ color: C.warn, fontSize: "13px", marginBottom: "8px" }}>{acts.error}</p>}
          <ActivityList
            items={scheduled}
            voteCount={acts.voteCount}
            myVotes={acts.myVotes}
            meId={me.id}
            isOwner={isOwner}
            fixedDay={day}
            onToggleVote={acts.toggleVote}
            onSchedule={acts.schedule}
            onRemove={acts.remove}
            emptyText="Rien de calé sur cette journée pour l'instant."
          />
        </section>

        {/* Les idées du groupe */}
        <section>
          <h3 style={sectionTitle}>
            LES IDÉES DU GROUPE{stage ? " · " + stage.name.toUpperCase() : ""}
          </h3>
          <ActivityList
            items={proposals}
            voteCount={acts.voteCount}
            myVotes={acts.myVotes}
            meId={me.id}
            isOwner={isOwner}
            fixedDay={day}
            onToggleVote={acts.toggleVote}
            onSchedule={acts.schedule}
            onRemove={acts.remove}
            emptyText="Aucune idée en attente. Propose la première."
          />
          <ActivityForm
            onSubmit={(title, description) =>
              acts.propose({ title, description, stageId: stage?.id ?? null })
            }
          />
          {!isOwner && (
            <p style={{ fontSize: "11px", color: C.dim, marginTop: "10px", lineHeight: 1.5 }}>
              Vote d&apos;un 👍 pour dire que ça te tente. L&apos;organisateur cale les
              idées retenues sur les journées.
            </p>
          )}
        </section>

        <div style={{ ...card, marginTop: "24px", fontSize: "12px", color: C.dim, lineHeight: 1.5 }}>
          Les idées sont rattachées à l&apos;étape, pas au jour : elles restent
          proposables même sans date, et se calent ensuite ici.
        </div>
      </aside>
    </>
  )
}
