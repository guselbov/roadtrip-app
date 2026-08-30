"use client"
import { daysBetween, toDate } from "@/lib/dates"
import { C, avatarStyle, stageColor } from "@/lib/ui"
import type { Participation, Stage, TripMember } from "@/lib/types"

/** Frise jour par jour : qui est là, et où. La vue que l'organisateur n'avait pas. */
export function PlanningTab({
  stages,
  members,
  participations,
  tripStart,
  tripEnd,
  selectedDay,
  onSelectDay,
}: {
  stages: Stage[]
  members: TripMember[]
  participations: Participation[]
  tripStart: string | null
  tripEnd: string | null
  selectedDay?: string | null
  onSelectDay?: (day: string) => void
}) {
  const approved = members.filter(m => m.status === "approved")

  const bounds = [
    ...stages.flatMap(s => [s.date_start, s.date_end]),
    ...participations.flatMap(p => [p.date_start, p.date_end]),
    tripStart,
    tripEnd,
  ].filter(Boolean) as string[]

  if (bounds.length === 0 || approved.length === 0) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.card2}`, borderRadius: "18px", padding: "28px 20px", textAlign: "center", color: C.muted, fontSize: "14px", lineHeight: 1.5 }}>
        {approved.length === 0
          ? "Valide au moins un pote pour voir le planning se remplir."
          : "Ajoute des dates à tes étapes pour construire le planning."}
      </div>
    )
  }

  const start = bounds.reduce((a, b) => (a < b ? a : b))
  const end = bounds.reduce((a, b) => (a > b ? a : b))
  const days = daysBetween(start, end)

  const colorOf = new Map(stages.map((s, i) => [s.id, stageColor(i)]))
  const byMember = new Map<string, Participation[]>()
  for (const p of participations) {
    const list = byMember.get(p.member_id) ?? []
    list.push(p)
    byMember.set(p.member_id, list)
  }

  const CELL = 30
  const NAME_W = 96

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px", alignItems: "center" }}>
        {stages.map(s => (
          <span key={s.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: C.muted }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: colorOf.get(s.id) }} />
            {s.name}
          </span>
        ))}
        {onSelectDay && (
          <span style={{ fontSize: "11px", color: C.dim, marginLeft: "auto" }}>
            Clique un jour pour son programme
          </span>
        )}
      </div>

      <div style={{ overflowX: "auto", background: C.card, border: `1px solid ${C.card2}`, borderRadius: "18px", padding: "14px" }}>
        <div style={{ minWidth: NAME_W + days.length * CELL + "px" }}>
          {/* En-tête : les jours */}
          <div style={{ display: "flex", marginBottom: "6px" }}>
            <div style={{ width: NAME_W + "px", flexShrink: 0 }} />
            {days.map(d => {
              const date = toDate(d)
              const weekend = date.getDay() === 0 || date.getDay() === 6
              const active = selectedDay === d
              return (
                <button
                  key={d}
                  onClick={() => onSelectDay?.(d)}
                  title="Voir et modifier cette journée"
                  style={{
                    width: CELL + "px",
                    flexShrink: 0,
                    textAlign: "center",
                    fontSize: "10px",
                    color: active ? "#0b120f" : weekend ? C.accent : C.dim,
                    background: active ? C.accent : "transparent",
                    border: "none",
                    borderRadius: "8px",
                    padding: "2px 0",
                    lineHeight: 1.2,
                    cursor: onSelectDay ? "pointer" : "default",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ display: "block" }}>{date.toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
                  <span style={{ display: "block", fontWeight: 800 }}>{date.getDate()}</span>
                </button>
              )
            })}
          </div>

          {/* Une ligne par pote validé */}
          {approved.map(m => {
            const parts = byMember.get(m.id) ?? []
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <div style={{ width: NAME_W + "px", flexShrink: 0, display: "flex", alignItems: "center", gap: "6px", paddingRight: "8px" }}>
                  <span style={avatarStyle(m.user_id, 22)}>
                    {(m.profiles?.display_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.profiles?.display_name ?? "—"}
                  </span>
                </div>

                {days.map(d => {
                  const here = parts.find(p => d >= p.date_start && d <= p.date_end)
                  return (
                    <div key={d} style={{ width: CELL + "px", flexShrink: 0, padding: "0 1px", background: selectedDay === d ? "rgba(163,230,53,0.08)" : "transparent" }}>
                      <div
                        title={here ? stages.find(s => s.id === here.stage_id)?.name : undefined}
                        style={{
                          height: "24px",
                          borderRadius: "7px",
                          background: here ? colorOf.get(here.stage_id) : C.bg,
                          opacity: here ? 0.9 : 1,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Densité : combien de personnes chaque jour */}
          <div style={{ display: "flex", alignItems: "center", marginTop: "10px", borderTop: `1px solid ${C.bg}`, paddingTop: "8px" }}>
            <div style={{ width: NAME_W + "px", flexShrink: 0, fontSize: "11px", color: C.muted }}>Au total</div>
            {days.map(d => {
              const n = approved.filter(m =>
                (byMember.get(m.id) ?? []).some(p => d >= p.date_start && d <= p.date_end)
              ).length
              return (
                <div key={d} style={{ width: CELL + "px", flexShrink: 0, textAlign: "center", fontSize: "11px", fontWeight: 700, color: n === 0 ? C.dim : C.text }}>
                  {n || "·"}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
