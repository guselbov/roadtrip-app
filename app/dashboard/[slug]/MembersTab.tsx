"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatRange } from "@/lib/dates"
import { C, avatarStyle, card } from "@/lib/ui"
import type { MemberStatus, Participation, Stage, TripMember } from "@/lib/types"

export function MembersTab({
  members,
  stages,
  participations,
  onStatusChange,
  onRemove,
}: {
  members: TripMember[]
  stages: Stage[]
  participations: Participation[]
  onStatusChange: (id: string, status: MemberStatus) => void
  onRemove: (id: string) => void
}) {
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)

  const stageName = new Map(stages.map(s => [s.id, s.name]))
  const partsOf = (memberId: string) => participations.filter(p => p.member_id === memberId)

  const pending = members.filter(m => m.status === "pending")
  const approved = members.filter(m => m.status === "approved" && m.role !== "owner")
  const rejected = members.filter(m => m.status === "rejected")

  async function setStatus(id: string, status: MemberStatus) {
    setBusy(id)
    const { error } = await supabase.from("trip_members").update({ status }).eq("id", id)
    setBusy(null)
    if (!error) onStatusChange(id, status)
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Retirer ${name} du trip ? Ses étapes et sa participation seront supprimées.`)) return
    setBusy(id)
    const { error } = await supabase.from("trip_members").delete().eq("id", id)
    setBusy(null)
    if (!error) onRemove(id)
  }

  function MemberCard({ m, actions }: { m: TripMember; actions: React.ReactNode }) {
    const parts = partsOf(m.id)
    const name = m.profiles?.display_name ?? "—"
    return (
      <div className="hoverable" style={{ ...card, marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <span style={avatarStyle(m.user_id, 36)}>
            {name.charAt(0).toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "16px" }}>{name}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>
              Dispo {formatRange(m.date_start, m.date_end)}
            </div>
          </div>
        </div>

        {m.message && (
          <p style={{ fontSize: "13px", color: "#a0b080", fontStyle: "italic", marginBottom: "10px", lineHeight: 1.4 }}>
            « {m.message} »
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: actions ? "12px" : 0 }}>
          {parts.length === 0 && (
            <span style={{ fontSize: "12px", color: C.dim }}>Aucune étape en commun</span>
          )}
          {parts.map(p => (
            <span key={p.id} style={{ background: C.bg, borderRadius: "20px", padding: "4px 10px", fontSize: "12px", color: C.muted }}>
              {stageName.get(p.stage_id) ?? "?"} · {formatRange(p.date_start, p.date_end)}
            </span>
          ))}
        </div>

        {actions}
      </div>
    )
  }

  const btn = (bg: string, fg: string): React.CSSProperties => ({
    flex: 1,
    background: bg,
    color: fg,
    border: "none",
    borderRadius: "100px",
    padding: "11px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  })

  return (
    <div>
      <section style={{ marginBottom: "28px" }}>
        <h3 style={{ fontSize: "13px", color: C.muted, letterSpacing: "1px", marginBottom: "12px" }}>
          EN ATTENTE {pending.length > 0 && `· ${pending.length}`}
        </h3>
        {pending.length === 0 && (
          <p style={{ fontSize: "14px", color: C.dim }}>Aucune demande en attente.</p>
        )}
        {pending.map(m => (
          <MemberCard
            key={m.id}
            m={m}
            actions={
              <div style={{ display: "flex", gap: "8px" }}>
                <button disabled={busy === m.id} onClick={() => setStatus(m.id, "rejected")} style={{ ...btn(C.bg, C.muted), border: `1px solid ${C.green}` }}>
                  Refuser
                </button>
                <button disabled={busy === m.id} onClick={() => setStatus(m.id, "approved")} style={btn(C.accent, C.bg)}>
                  {busy === m.id ? "…" : "Valider"}
                </button>
              </div>
            }
          />
        ))}
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h3 style={{ fontSize: "13px", color: C.muted, letterSpacing: "1px", marginBottom: "12px" }}>
          L&apos;ÉQUIPAGE {approved.length > 0 && `· ${approved.length}`}
        </h3>
        {approved.length === 0 && (
          <p style={{ fontSize: "14px", color: C.dim }}>Personne de validé pour l&apos;instant.</p>
        )}
        {approved.map(m => (
          <MemberCard
            key={m.id}
            m={m}
            actions={
              <button
                disabled={busy === m.id}
                onClick={() => remove(m.id, m.profiles?.display_name ?? "ce pote")}
                style={{ background: "none", border: "none", color: C.dim, fontSize: "12px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
              >
                Retirer du trip
              </button>
            }
          />
        ))}
      </section>

      {rejected.length > 0 && (
        <section>
          <h3 style={{ fontSize: "13px", color: C.muted, letterSpacing: "1px", marginBottom: "12px" }}>
            REFUSÉS · {rejected.length}
          </h3>
          {rejected.map(m => (
            <div key={m.id} style={{ ...card, marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.6 }}>
              <span style={{ fontSize: "14px" }}>{m.profiles?.display_name ?? "—"}</span>
              <button
                disabled={busy === m.id}
                onClick={() => setStatus(m.id, "approved")}
                style={{ background: "none", border: `1px solid ${C.green}`, color: C.accent, borderRadius: "100px", padding: "6px 14px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Finalement, valider
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
