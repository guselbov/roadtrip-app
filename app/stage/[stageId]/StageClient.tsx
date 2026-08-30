"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatRange } from "@/lib/dates"
import { C, avatarColor, card, input } from "@/lib/ui"
import type { Message, Photo, Profile, Stage } from "@/lib/types"

interface Crew { userId: string; name: string; start: string; end: string }

export function StageClient({
  stage,
  me,
  initialMessages,
  initialPhotos,
  crew,
}: {
  stage: Stage
  me: Profile
  initialMessages: Message[]
  initialPhotos: Photo[]
  crew: Crew[]
}) {
  const [supabase] = useState(() => createClient())
  const [tab, setTab] = useState<"chat" | "album">("chat")
  const [messages, setMessages] = useState(initialMessages)
  const [photos, setPhotos] = useState(initialPhotos)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Noms d'auteur connus, pour les messages qui arrivent en temps réel
  // (l'événement Realtime ne transporte pas la jointure sur profiles).
  const [names, setNames] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = { [me.id]: me.display_name }
    for (const m of initialMessages) if (m.profiles) map[m.author_id] = m.profiles.display_name
    for (const p of initialPhotos) if (p.profiles) map[p.author_id] = p.profiles.display_name
    for (const c of crew) map[c.userId] = c.name
    return map
  })

  // Déclaré avant l'effet : la souscription Realtime s'en sert dans ses callbacks.
  const resolveName = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle()
      if (data) setNames(n => (n[userId] ? n : { ...n, [userId]: data.display_name }))
    },
    [supabase]
  )

  useEffect(() => {
    const channel = supabase
      .channel("stage-" + stage.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `stage_id=eq.${stage.id}` },
        payload => {
          const msg = payload.new as Message
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
          resolveName(msg.author_id)
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photos", filter: `stage_id=eq.${stage.id}` },
        payload => {
          const photo = payload.new as Photo
          setPhotos(prev => (prev.some(p => p.id === photo.id) ? prev : [photo, ...prev]))
          resolveName(photo.author_id)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [stage.id, supabase, resolveName])

  useEffect(() => {
    if (tab === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, tab])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setSending(true)
    setError("")
    const { data, error } = await supabase
      .from("messages")
      .insert({ stage_id: stage.id, author_id: me.id, content })
      .select()
      .single()
    setSending(false)
    if (error) { setError(error.message); return }
    setText("")
    if (data) setMessages(prev => (prev.some(m => m.id === data.id) ? prev : [...prev, data as Message]))
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      setError("Photo trop lourde (8 Mo maximum).")
      return
    }
    setUploading(true)
    setError("")

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const path = `${stage.id}/${me.id}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from("trip-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })
    if (upErr) { setUploading(false); setError(upErr.message); return }

    const { data: pub } = supabase.storage.from("trip-photos").getPublicUrl(path)
    const { data, error: insErr } = await supabase
      .from("photos")
      .insert({ stage_id: stage.id, author_id: me.id, url: pub.publicUrl, storage_path: path })
      .select()
      .single()

    setUploading(false)
    if (insErr) { setError(insErr.message); return }
    if (data) setPhotos(prev => (prev.some(p => p.id === data.id) ? prev : [data as Photo, ...prev]))
    if (fileRef.current) fileRef.current.value = ""
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? C.green : C.card,
    color: active ? C.accent : C.muted,
    border: "none",
    borderRadius: "100px",
    padding: "11px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  })

  return (
    <div style={{ marginTop: "22px" }}>
      {/* Qui est là */}
      {crew.length > 0 && (
        <div style={{ ...card, marginBottom: "18px" }}>
          <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px", marginBottom: "10px" }}>QUI EST LÀ</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {crew.map(c => (
              <span key={c.userId} style={{ display: "flex", alignItems: "center", gap: "7px", background: C.bg, borderRadius: "100px", padding: "5px 12px 5px 5px" }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: avatarColor(c.userId), fontSize: "10px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span style={{ fontSize: "12px" }}>{c.name}</span>
                <span style={{ fontSize: "11px", color: C.dim }}>{formatRange(c.start, c.end)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        <button onClick={() => setTab("chat")} style={tabBtn(tab === "chat")}>
          Discussion {messages.length > 0 && `· ${messages.length}`}
        </button>
        <button onClick={() => setTab("album")} style={tabBtn(tab === "album")}>
          Album {photos.length > 0 && `· ${photos.length}`}
        </button>
      </div>

      {error && <p style={{ color: C.warn, fontSize: "13px", marginBottom: "10px" }}>{error}</p>}

      {tab === "chat" ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", minHeight: "120px" }}>
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

          <form onSubmit={send} style={{ display: "flex", gap: "8px", position: "sticky", bottom: "12px" }}>
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
      ) : (
        <>
          <label
            style={{ ...card, display: "block", textAlign: "center", cursor: uploading ? "default" : "pointer", marginBottom: "14px", border: `1px dashed ${C.green}`, color: C.muted, fontSize: "14px" }}
          >
            {uploading ? "Envoi en cours…" : "📷 Ajouter une photo"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={upload}
              style={{ display: "none" }}
            />
          </label>

          {photos.length === 0 ? (
            <p style={{ color: C.dim, fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
              L&apos;album est vide. Sois le premier à poster.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
              {photos.map(p => (
                <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", position: "relative", aspectRatio: "1", borderRadius: "12px", overflow: "hidden", background: C.card }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", color: C.text, fontSize: "11px", padding: "14px 8px 6px" }}>
                    {names[p.author_id] ?? p.profiles?.display_name ?? ""}
                  </span>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
