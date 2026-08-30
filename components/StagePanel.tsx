"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatRange } from "@/lib/dates"
import { useActivities } from "@/lib/useActivities"
import { ActivityForm, ActivityList } from "./ActivityList"
import { dbError } from "@/lib/errors"
import { C, avatarStyle, card, input } from "@/lib/ui"
import type { Message, Photo, Profile } from "@/lib/types"

interface Crew { userId: string; name: string; start: string; end: string }
interface StageInfo { id: string; name: string; description: string | null; date_start: string | null; date_end: string | null }

/**
 * Discussion + album d'une étape. Charge ses propres données pour pouvoir
 * servir aussi bien la page /stage/[id] que la colonne droite du dashboard,
 * où l'étape change sans rechargement.
 */
export function StagePanel({
  stageId,
  tripId,
  me,
  isOwner = false,
  showHeader = true,
}: {
  stageId: string
  tripId: string
  me: Profile
  isOwner?: boolean
  showHeader?: boolean
}) {
  const [supabase] = useState(() => createClient())
  // Nom de canal unique : le même panneau peut être monté deux fois.
  const [channelId] = useState(() => Math.random().toString(36).slice(2, 9))
  const [tab, setTab] = useState<"chat" | "album" | "activites">("chat")
  const [stage, setStage] = useState<StageInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [crew, setCrew] = useState<Crew[]>([])
  const [names, setNames] = useState<Record<string, string>>({ [me.id]: me.display_name })
  const [ready, setReady] = useState(false)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [lightbox, setLightbox] = useState<number | null>(null)
  const acts = useActivities(tripId, me.id)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [s, m, p, c] = await Promise.all([
      supabase.from("stages").select("id, name, description, date_start, date_end").eq("id", stageId).maybeSingle(),
      supabase.from("messages").select("*, profiles(id, display_name)").eq("stage_id", stageId).order("created_at"),
      supabase.from("photos").select("*, profiles(id, display_name)").eq("stage_id", stageId).order("created_at", { ascending: false }),
      supabase.from("participations").select("date_start, date_end, trip_members(user_id, profiles(display_name))").eq("stage_id", stageId),
    ])

    setStage((s.data as StageInfo) ?? null)
    const msgs = (m.data as unknown as Message[]) ?? []
    const pics = (p.data as unknown as Photo[]) ?? []
    const team = ((c.data ?? []) as unknown as {
      date_start: string
      date_end: string
      trip_members: { user_id: string; profiles: { display_name: string } | null } | null
    }[]).map(r => ({
      userId: r.trip_members?.user_id ?? "",
      name: r.trip_members?.profiles?.display_name ?? "—",
      start: r.date_start,
      end: r.date_end,
    })).filter(x => x.userId)

    setMessages(msgs)
    setPhotos(pics)
    setCrew(team)
    setNames(prev => {
      const next = { ...prev }
      for (const x of msgs) if (x.profiles) next[x.author_id] = x.profiles.display_name
      for (const x of pics) if (x.profiles) next[x.author_id] = x.profiles.display_name
      for (const x of team) next[x.userId] = x.name
      return next
    })
    setReady(true)
  }, [supabase, stageId])

  const resolveName = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle()
    if (data) setNames(n => (n[userId] ? n : { ...n, [userId]: data.display_name }))
  }, [supabase])

  // Changement d'étape : on remet l'état à zéro pendant le rendu plutôt que
  // dans un effet, sinon le premier rendu affiche les données de l'étape
  // précédente et le lint refuse le setState synchrone en effet.
  const [seenStage, setSeenStage] = useState(stageId)
  if (seenStage !== stageId) {
    setSeenStage(stageId)
    setReady(false)
    setMessages([])
    setPhotos([])
    setCrew([])
    setLightbox(null)
  }

  useEffect(() => {
    let loaded = false

    const channel = supabase
      .channel(`stage-${stageId}-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `stage_id=eq.${stageId}` }, payload => {
        const msg = payload.new as Message
        setMessages(prev => (prev.some(x => x.id === msg.id) ? prev : [...prev, msg]))
        resolveName(msg.author_id)
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos", filter: `stage_id=eq.${stageId}` }, payload => {
        const photo = payload.new as Photo
        setPhotos(prev => (prev.some(x => x.id === photo.id) ? prev : [photo, ...prev]))
        resolveName(photo.author_id)
      })
      // Le premier chargement part d'ici : appeler load() dans le corps de
      // l'effet declencherait un setState synchrone, que le lint refuse.
      .subscribe(() => { if (!loaded) { loaded = true; load() } })

    return () => { supabase.removeChannel(channel) }
  }, [supabase, stageId, channelId, load, resolveName])

  useEffect(() => {
    if (tab === "chat" && ready) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, tab, ready])

  // Navigation clavier dans l'aperçu photo.
  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null)
      if (e.key === "ArrowRight") setLightbox(i => (i === null ? null : Math.min(i + 1, photos.length - 1)))
      if (e.key === "ArrowLeft") setLightbox(i => (i === null ? null : Math.max(i - 1, 0)))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox, photos.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setSending(true)
    setError("")
    const { data, error } = await supabase
      .from("messages")
      .insert({ stage_id: stageId, author_id: me.id, content })
      .select()
      .single()
    setSending(false)
    if (error) { setError(dbError(error)); return }
    setText("")
    if (data) setMessages(prev => (prev.some(x => x.id === data.id) ? prev : [...prev, data as Message]))
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setError("Photo trop lourde (8 Mo maximum)."); return }
    setUploading(true)
    setError("")

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const path = `${stageId}/${me.id}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from("trip-photos").upload(path, file, { cacheControl: "3600", upsert: false })
    if (upErr) { setUploading(false); setError(dbError(upErr)); return }

    const { data: pub } = supabase.storage.from("trip-photos").getPublicUrl(path)
    const { data, error: insErr } = await supabase
      .from("photos")
      .insert({ stage_id: stageId, author_id: me.id, url: pub.publicUrl, storage_path: path })
      .select()
      .single()

    setUploading(false)
    if (insErr) { setError(dbError(insErr)); return }
    if (data) setPhotos(prev => (prev.some(x => x.id === data.id) ? prev : [data as Photo, ...prev]))
    if (fileRef.current) fileRef.current.value = ""
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? C.green : C.card,
    color: active ? C.accent : C.muted,
    border: "none",
    borderRadius: "100px",
    padding: "10px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  })

  // Les mieux votées remontent : c'est tout l'intérêt du vote.
  const stageActivities = acts.activities
    .filter(a => a.stage_id === stageId)
    .sort((x, y) => (acts.voteCount.get(y.id) ?? 0) - (acts.voteCount.get(x.id) ?? 0))

  const current = lightbox !== null ? photos[lightbox] : null

  return (
    <div>
      {showHeader && stage && (
        <div style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800 }}>{stage.name}</h2>
          <p style={{ color: C.muted, fontSize: "14px", marginTop: "4px" }}>
            {formatRange(stage.date_start, stage.date_end)}
          </p>
          {stage.description && (
            <p style={{ color: "#a0b080", fontSize: "14px", lineHeight: 1.55, marginTop: "8px" }}>{stage.description}</p>
          )}
        </div>
      )}

      {crew.length > 0 && (
        <div style={{ ...card, marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px", marginBottom: "10px" }}>QUI EST LÀ</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {crew.map(c => (
              <span key={c.userId} style={{ display: "flex", alignItems: "center", gap: "7px", background: C.bg, borderRadius: "100px", padding: "5px 12px 5px 5px" }}>
                <span style={avatarStyle(c.userId, 22)}>
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span style={{ fontSize: "12px" }}>{c.name}</span>
                <span style={{ fontSize: "11px", color: C.dim }}>{formatRange(c.start, c.end)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        <button onClick={() => setTab("chat")} style={tabBtn(tab === "chat")}>
          Discussion {messages.length > 0 && `· ${messages.length}`}
        </button>
        <button onClick={() => setTab("album")} style={tabBtn(tab === "album")}>
          Album {photos.length > 0 && `· ${photos.length}`}
        </button>
        <button onClick={() => setTab("activites")} style={tabBtn(tab === "activites")}>
          Activités {stageActivities.length > 0 && `· ${stageActivities.length}`}
        </button>
      </div>

      {error && <p style={{ color: C.warn, fontSize: "13px", marginBottom: "10px" }}>{error}</p>}

      {!ready && tab !== "activites" && <p style={{ color: C.dim, fontSize: "13px", padding: "20px 0", textAlign: "center" }}>Chargement…</p>}

      {ready && tab === "chat" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px", minHeight: "100px" }}>
            {messages.length === 0 && (
              <p style={{ color: C.dim, fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
                Personne n&apos;a encore parlé. Lance la discussion.
              </p>
            )}
            {messages.map(m => {
              const mine = m.author_id === me.id
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%" }}>
                    {!mine && (
                      <div style={{ fontSize: "11px", color: C.muted, marginBottom: "3px", paddingLeft: "12px" }}>
                        {names[m.author_id] ?? m.profiles?.display_name ?? "…"}
                      </div>
                    )}
                    <div style={{ background: mine ? C.green : C.card, borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: "15px", lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: "10px", color: C.dim, marginTop: "3px", textAlign: mine ? "right" : "left", padding: "0 10px" }}>
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} style={{ display: "flex", gap: "8px" }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Ton message…"
              maxLength={2000}
              style={{ ...input, borderRadius: "100px" }}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              style={{ background: C.accent, color: C.bg, border: "none", borderRadius: "50%", width: "50px", height: "50px", flexShrink: 0, fontSize: "18px", fontWeight: 800, cursor: "pointer", opacity: sending || !text.trim() ? 0.4 : 1 }}
            >
              ↑
            </button>
          </form>
        </>
      )}

      {ready && tab === "album" && (
        <>
          <label style={{ ...card, display: "block", textAlign: "center", cursor: uploading ? "default" : "pointer", marginBottom: "14px", border: `1px dashed ${C.green}`, color: C.muted, fontSize: "14px" }}>
            {uploading ? "Envoi en cours…" : "📷 Ajouter une photo"}
            <input ref={fileRef} type="file" accept="image/*" disabled={uploading} onChange={upload} style={{ display: "none" }} />
          </label>

          {photos.length === 0 ? (
            <p style={{ color: C.dim, fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
              L&apos;album est vide. Sois le premier à poster.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px" }}>
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setLightbox(i)}
                  style={{ position: "relative", aspectRatio: "1", borderRadius: "12px", overflow: "hidden", background: C.card, border: "none", padding: 0, cursor: "zoom-in" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", color: C.text, fontSize: "11px", padding: "14px 8px 6px", textAlign: "left" }}>
                    {names[p.author_id] ?? p.profiles?.display_name ?? ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "activites" && (
        <>
          {acts.error && <p style={{ color: C.warn, fontSize: "13px", marginBottom: "10px" }}>{acts.error}</p>}
          <ActivityList
            items={stageActivities}
            voteCount={acts.voteCount}
            myVotes={acts.myVotes}
            meId={me.id}
            isOwner={isOwner}
            dayMin={stage?.date_start}
            dayMax={stage?.date_end}
            onToggleVote={acts.toggleVote}
            onSchedule={acts.schedule}
            onRemove={acts.remove}
            emptyText="Aucune idée pour cette étape. Lance la première, tes potes voteront."
          />
          <ActivityForm onSubmit={(title, description) => acts.propose({ title, description, stageId })} />
          <p style={{ fontSize: "11px", color: C.dim, marginTop: "10px", lineHeight: 1.5 }}>
            👍 dit simplement « ça me tente ». {isOwner ? "À toi de retenir les idées et de les caler sur une journée." : "L'organisateur retient les idées et les cale sur une journée."}
          </p>
        </>
      )}

      {/* Aperçu plein écran */}
      {current && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightbox(null) }}
            aria-label="Fermer"
            style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.12)", border: "none", color: C.text, borderRadius: "50%", width: "40px", height: "40px", fontSize: "20px", cursor: "pointer", zIndex: 1 }}
          >
            ✕
          </button>

          {lightbox !== null && lightbox > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(i => (i === null ? null : i - 1)) }}
              aria-label="Photo précédente"
              style={{ position: "absolute", left: "12px", background: "rgba(255,255,255,0.12)", border: "none", color: C.text, borderRadius: "50%", width: "44px", height: "44px", fontSize: "20px", cursor: "pointer" }}
            >
              ‹
            </button>
          )}
          {lightbox !== null && lightbox < photos.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(i => (i === null ? null : i + 1)) }}
              aria-label="Photo suivante"
              style={{ position: "absolute", right: "12px", background: "rgba(255,255,255,0.12)", border: "none", color: C.text, borderRadius: "50%", width: "44px", height: "44px", fontSize: "20px", cursor: "pointer" }}
            >
              ›
            </button>
          )}

          <figure onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: "12px", display: "block" }}
            />
            <figcaption style={{ color: C.muted, fontSize: "13px", textAlign: "center" }}>
              {names[current.author_id] ?? "—"} · {new Date(current.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              <span style={{ color: C.dim }}> · {(lightbox ?? 0) + 1}/{photos.length}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}
