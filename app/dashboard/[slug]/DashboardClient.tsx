"use client"
import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ShareButton } from "@/components/ShareButton"
import { StagePanel } from "@/components/StagePanel"
import { DayPanel } from "@/components/DayPanel"
import { useConfirm } from "@/components/Confirm"
import { MembersTab } from "./MembersTab"
import { StagesTab } from "./StagesTab"
import { PlanningTab } from "./PlanningTab"
import { formatLongRange } from "@/lib/dates"
import { C, card, input, label, sectionTitle, tint } from "@/lib/ui"
import type { MemberStatus, Participation, Profile, Stage, Trip, TripMember } from "@/lib/types"

/** La colonne discussion n'a de sens qu'au-delà d'une certaine largeur. */
function useIsWide() {
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia("(min-width: 1024px)")
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

export function DashboardClient({
  trip: initialTrip,
  stages: initialStages,
  members: initialMembers,
  participations: initialParticipations,
  me,
}: {
  trip: Trip
  stages: Stage[]
  members: TripMember[]
  participations: Participation[]
  me: Profile
}) {
  const router = useRouter()
  const supabase = createClient()
  const isWide = useIsWide()

  const [trip, setTrip] = useState(initialTrip)
  const [stages, setStages] = useState(initialStages)
  const [members, setMembers] = useState(initialMembers)
  const [participations, setParticipations] = useState(initialParticipations)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(initialStages[0]?.id ?? null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [settings, setSettings] = useState(false)
  const [draft, setDraft] = useState({
    title: initialTrip.title,
    description: initialTrip.description ?? "",
    date_start: initialTrip.date_start ?? "",
    date_end: initialTrip.date_end ?? "",
  })
  const [copied, setCopied] = useState(false)
  const { ask, dialog } = useConfirm()

  // Les demandes arrivent pendant que l'organisateur regarde la page : sans
  // cette souscription, rien ne bouge tant qu'il ne recharge pas lui-même.
  useEffect(() => {
    const channel = supabase
      .channel("trip-members-" + trip.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_members", filter: `trip_id=eq.${trip.id}` },
        () => { router.refresh() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, trip.id, router])

  // Le rendu serveur fait autorité : on resynchronise quand router.refresh()
  // renvoie de nouvelles données. Ajustement pendant le rendu plutôt qu'en
  // effet, comme recommandé par React pour un état dérivé de props.
  const [seen, setSeen] = useState({ m: initialMembers, p: initialParticipations, s: initialStages })
  if (seen.m !== initialMembers || seen.p !== initialParticipations || seen.s !== initialStages) {
    setSeen({ m: initialMembers, p: initialParticipations, s: initialStages })
    setMembers(initialMembers)
    setParticipations(initialParticipations)
    setStages(initialStages)
  }

  const pendingCount = members.filter(m => m.status === "pending").length
  const approvedCount = members.filter(m => m.status === "approved" && m.role !== "owner").length
  const ownerMemberId = members.find(m => m.role === "owner")?.id ?? null
  const selectedStage = stages.find(s => s.id === selectedStageId) ?? null

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(trip.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* presse-papiers indisponible */ }
  }

  async function saveSettings() {
    const patch = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      date_start: draft.date_start || null,
      date_end: draft.date_end || null,
    }
    if (!patch.title) return
    const { error } = await supabase.from("roadtrips").update(patch).eq("id", trip.id)
    if (!error) {
      setTrip({ ...trip, ...patch })
      setSettings(false)
      router.refresh()
    }
  }

  async function deleteTrip() {
    const ok = await ask({
      title: `Supprimer « ${trip.title} » ?`,
      message: "Étapes, participations, discussions, photos et activités partent avec. C'est définitif.",
      confirmLabel: "Supprimer le trip",
      tone: "danger",
    })
    if (!ok) return
    const { error } = await supabase.from("roadtrips").delete().eq("id", trip.id)
    if (!error) {
      router.replace("/")
      router.refresh()
    }
  }

  function onStatusChange(id: string, status: MemberStatus) {
    setMembers(ms => ms.map(m => (m.id === id ? { ...m, status } : m)))
  }

  function onRemove(id: string) {
    setMembers(ms => ms.filter(m => m.id !== id))
    setParticipations(ps => ps.filter(p => p.member_id !== id))
  }

  function openStage(stageId: string) {
    if (isWide) setSelectedStageId(stageId)
    else router.push("/stage/" + stageId)
  }

  const stats = [
    { value: stages.length, label: stages.length > 1 ? "étapes" : "étape", color: C.accent },
    { value: approvedCount, label: approvedCount > 1 ? "potes" : "pote", color: C.teal },
    { value: pendingCount, label: "en attente", color: pendingCount > 0 ? C.amber : C.dim },
  ]

  return (
    <>
      <style>{`
        .dash { max-width: 560px; margin: 0 auto; padding: 0 20px 60px; }
        .dash-grid { display: grid; gap: 18px; grid-template-columns: 1fr; align-items: start; }
        .dash-chat { display: none; }
        @media (min-width: 1024px) {
          .dash { max-width: 1080px; }
          .dash-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); }
          .dash-chat { display: block; position: sticky; top: 16px; }
          .dash-crew { grid-column: 1 / -1; }
        }
        @media (min-width: 1440px) {
          .dash { max-width: 1400px; }
          .dash-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(300px, 0.9fr); }
          .dash-crew { grid-column: auto; position: sticky; top: 16px; }
        }
      `}</style>

      {dialog}

      <div className="dash">
        <Link href="/" style={{ color: C.muted, fontSize: "14px", textDecoration: "none", display: "inline-block", marginBottom: "14px" }}>
          ← Mes trips
        </Link>

        {/* En-tête */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.5px" }}>
              {trip.title}
            </h1>
            <p style={{ color: C.muted, fontSize: "14px", marginTop: "6px" }}>
              {formatLongRange(trip.date_start, trip.date_end) || "Dates à définir"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {stats.map(s => (
              <div key={s.label} style={{ ...tint(s.color, 0.1), borderRadius: "14px", padding: "8px 14px", textAlign: "center", minWidth: "78px" }}>
                <div style={{ fontSize: "20px", fontWeight: 800, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: "11px", opacity: 0.85 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Code de partage */}
        <div style={{ ...card, marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px" }}>CODE</span>
          <button
            onClick={copyCode}
            style={{ background: C.bg, border: `1px dashed ${copied ? C.accent : C.greenLight}`, color: copied ? C.accent : C.text, borderRadius: "12px", padding: "10px 16px", fontSize: "20px", fontWeight: 800, letterSpacing: "5px", fontFamily: "monospace", cursor: "pointer" }}
          >
            {copied ? "COPIÉ ✓" : trip.code}
          </button>
          <ShareButton slug={trip.slug} title={trip.title} code={trip.code} />
          <Link href={"/trip/" + trip.slug} style={{ fontSize: "13px", color: C.muted, textDecoration: "none", borderBottom: `1px solid ${C.green}` }}>
            Page publique
          </Link>
        </div>

        {/* Demandes en attente : toujours en tête, jamais cachées */}
        {pendingCount > 0 && (
          <div style={{ ...tint(C.amber, 0.14), borderRadius: "16px", padding: "14px 16px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: "15px" }}>
                {pendingCount} pote{pendingCount > 1 ? "s" : ""} attend{pendingCount > 1 ? "ent" : ""} ta réponse
              </span>
              <span style={{ display: "block", fontSize: "13px", opacity: 0.8 }}>
                Ça se passe dans « Tes potes », plus bas.
              </span>
            </span>
          </div>
        )}

        {/* Planning : le coup d'œil, sur toute la largeur */}
        <div style={{ marginBottom: "22px" }}>
          <Section title="LE PLANNING">
            <PlanningTab
              stages={stages}
              members={members}
              participations={participations}
              tripStart={trip.date_start}
              tripEnd={trip.date_end}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </Section>
        </div>

        <div className="dash-grid">
          <Section title="LES ÉTAPES">
            <StagesTab
              tripId={trip.id}
              stages={stages}
              participations={participations}
              ownerMemberId={ownerMemberId}
              tripStart={trip.date_start}
              tripEnd={trip.date_end}
              selectedStageId={selectedStageId}
              onOpenStage={openStage}
              onChange={setStages}
              onParticipationsChange={setParticipations}
              onRefresh={() => router.refresh()}
            />
          </Section>

          <div className="dash-chat">
            <Section title={selectedStage ? "DISCUSSION · " + selectedStage.name.toUpperCase() : "DISCUSSION"}>
              {selectedStage ? (
                <StagePanel key={selectedStage.id} stageId={selectedStage.id} tripId={trip.id} me={me} isOwner showHeader={false} />
              ) : (
                <div style={{ ...card, padding: "40px 24px", textAlign: "center", color: C.muted, fontSize: "14px", lineHeight: 1.6 }}>
                  <div style={{ fontSize: "30px", marginBottom: "10px" }}>💬</div>
                  Choisis une étape à gauche pour voir la discussion et l&apos;album.
                </div>
              )}
            </Section>
          </div>

          <div className="dash-crew">
            <Section title="TES POTES">
              <MembersTab
                members={members}
                stages={stages}
                participations={participations}
                onStatusChange={onStatusChange}
                onRemove={onRemove}
              />
            </Section>
          </div>
        </div>

        {/* Réglages */}
        <div style={{ marginTop: "40px", borderTop: `1px solid ${C.card2}`, paddingTop: "20px", maxWidth: "480px" }}>
          {!settings ? (
            <button onClick={() => setSettings(true)} style={{ background: "none", border: "none", color: C.muted, fontSize: "13px", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              ⚙ Réglages du trip
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={label}>NOM</label>
                <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} style={input} />
              </div>
              <div>
                <label style={label}>DESCRIPTION</label>
                <textarea rows={3} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} style={{ ...input, resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={label}>DÉBUT</label>
                  <input type="date" value={draft.date_start} onChange={e => setDraft({ ...draft, date_start: e.target.value })} style={input} />
                </div>
                <div>
                  <label style={label}>FIN</label>
                  <input type="date" value={draft.date_end} min={draft.date_start || undefined} onChange={e => setDraft({ ...draft, date_end: e.target.value })} style={input} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setSettings(false)} style={{ flex: 1, background: C.bg, border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                  Annuler
                </button>
                <button onClick={saveSettings} style={{ flex: 1, background: C.accent, border: "none", color: "#0b120f", borderRadius: "100px", padding: "12px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  Enregistrer
                </button>
              </div>
              <button onClick={deleteTrip} style={{ background: "none", border: "none", color: C.warn, fontSize: "13px", cursor: "pointer", padding: "8px 0 0", fontFamily: "inherit" }}>
                Supprimer le trip
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedDay && (
        <DayPanel
          day={selectedDay}
          tripId={trip.id}
          stages={stages}
          members={members}
          participations={participations}
          me={me}
          isOwner
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}
