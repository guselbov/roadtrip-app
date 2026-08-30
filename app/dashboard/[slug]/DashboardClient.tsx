"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ShareButton } from "@/components/ShareButton"
import { MembersTab } from "./MembersTab"
import { StagesTab } from "./StagesTab"
import { PlanningTab } from "./PlanningTab"
import { formatLongRange } from "@/lib/dates"
import { C, card, container, input, label } from "@/lib/ui"
import type { MemberStatus, Participation, Profile, Stage, Trip, TripMember } from "@/lib/types"

type Tab = "planning" | "potes" | "etapes"

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
  const [trip, setTrip] = useState(initialTrip)
  const [stages, setStages] = useState(initialStages)
  const [members, setMembers] = useState(initialMembers)
  const [participations, setParticipations] = useState(initialParticipations)
  const [tab, setTab] = useState<Tab>("planning")
  const [settings, setSettings] = useState(false)
  const [draft, setDraft] = useState({
    title: initialTrip.title,
    description: initialTrip.description ?? "",
    date_start: initialTrip.date_start ?? "",
    date_end: initialTrip.date_end ?? "",
  })
  const [copied, setCopied] = useState(false)

  // Les demandes arrivent pendant que l'organisateur regarde la page : sans
  // cette souscription, rien ne bouge tant qu'il ne recharge pas lui-meme.
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

  // Le rendu serveur fait autorite : on resynchronise quand router.refresh()
  // renvoie de nouvelles donnees. Ajustement pendant le rendu plutot qu'en
  // effet, comme recommande par React pour un etat derive de props.
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
    if (!confirm(`Supprimer « ${trip.title} » ? Étapes, participations, messages et photos partent avec. C'est définitif.`)) return
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

  const TABS: { key: Tab; text: string; badge?: number }[] = [
    { key: "planning", text: "Planning" },
    { key: "potes", text: "Potes", badge: pendingCount },
    { key: "etapes", text: "Étapes" },
  ]

  return (
    <div style={{ ...container, maxWidth: tab === "etapes" ? "1100px" : container.maxWidth, paddingBottom: "60px" }}>
      <Link href="/" style={{ color: C.muted, fontSize: "14px", textDecoration: "none", display: "inline-block", marginBottom: "18px" }}>
        ← Mes trips
      </Link>

      <h1 style={{ fontSize: "26px", fontWeight: 800, lineHeight: 1.15 }}>{trip.title}</h1>
      <p style={{ color: C.muted, fontSize: "14px", marginTop: "6px" }}>
        {formatLongRange(trip.date_start, trip.date_end) || "Dates à définir"} · {approvedCount} pote{approvedCount > 1 ? "s" : ""} confirmé{approvedCount > 1 ? "s" : ""}
      </p>

      {/* Code de partage */}
      <div style={{ ...card, marginTop: "18px", marginBottom: "18px" }}>
        <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px", marginBottom: "8px" }}>
          CODE À ENVOYER À TES POTES
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={copyCode}
            style={{ background: C.bg, border: `1px dashed ${C.greenLight}`, color: copied ? C.accent : C.text, borderRadius: "12px", padding: "12px 18px", fontSize: "22px", fontWeight: 800, letterSpacing: "5px", fontFamily: "monospace", cursor: "pointer" }}
          >
            {copied ? "COPIÉ ✓" : trip.code}
          </button>
          <ShareButton slug={trip.slug} title={trip.title} code={trip.code} />
          <Link href={"/trip/" + trip.slug} style={{ fontSize: "13px", color: C.muted, textDecoration: "none", borderBottom: `1px solid ${C.green}` }}>
            Voir la page publique
          </Link>
        </div>
      </div>

      {/* Les demandes ne doivent pas dependre de l'onglet ouvert */}
      {pendingCount > 0 && (
        <button
          onClick={() => setTab("potes")}
          style={{ width: "100%", background: C.accent, color: C.bg, border: "none", borderRadius: "16px", padding: "14px 16px", marginBottom: "14px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}
        >
          <span style={{ fontSize: "20px" }}>🔔</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontWeight: 800, fontSize: "15px" }}>
              {pendingCount} pote{pendingCount > 1 ? "s" : ""} attend{pendingCount > 1 ? "ent" : ""} ta réponse
            </span>
            <span style={{ display: "block", fontSize: "13px", opacity: 0.75 }}>
              Valide ou refuse pour débloquer {pendingCount > 1 ? "leur" : "son"} accès
            </span>
          </span>
          <span style={{ fontSize: "18px", opacity: 0.6 }}>→</span>
        </button>
      )}

      {/* Onglets */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              background: tab === t.key ? C.green : C.card,
              color: tab === t.key ? C.accent : C.muted,
              border: "none",
              borderRadius: "100px",
              padding: "11px 8px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              position: "relative",
            }}
          >
            {t.text}
            {t.badge ? (
              <span style={{ background: C.accent, color: C.bg, borderRadius: "10px", padding: "1px 6px", fontSize: "11px", marginLeft: "6px", fontWeight: 800 }}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "potes" && (
        <MembersTab
          members={members}
          stages={stages}
          participations={participations}
          onStatusChange={onStatusChange}
          onRemove={onRemove}
        />
      )}

      {tab === "etapes" && (
        <StagesTab
          tripId={trip.id}
          stages={stages}
          participations={participations}
          ownerMemberId={ownerMemberId}
          me={me}
          tripStart={trip.date_start}
          tripEnd={trip.date_end}
          onChange={setStages}
          onParticipationsChange={setParticipations}
        />
      )}

      {tab === "planning" && (
        <PlanningTab
          stages={stages}
          members={members}
          participations={participations}
          tripStart={trip.date_start}
          tripEnd={trip.date_end}
        />
      )}

      {/* Réglages */}
      <div style={{ marginTop: "40px", borderTop: `1px solid ${C.card}`, paddingTop: "20px" }}>
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
              <button onClick={saveSettings} style={{ flex: 1, background: C.accent, border: "none", color: C.bg, borderRadius: "100px", padding: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
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
  )
}
