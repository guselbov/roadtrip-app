"use client"
import { useState, useRef, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function StageClient({ stageId, participants, initialMessages, initialPhotos }: {
  stageId: string, participants: string[], initialMessages: any[], initialPhotos: any[]
}) {
  const [tab, setTab] = useState<"messages"|"photos">("messages")
  const [messages, setMessages] = useState(initialMessages)
  const [photos, setPhotos] = useState(initialPhotos)
  const [newMsg, setNewMsg] = useState("")
  const [author, setAuthor] = useState("")
  const [authorSet, setAuthorSet] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const channel = supabase
      .channel("messages-" + stageId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "stage_id=eq." + stageId },
        (payload) => {
          setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [stageId])

  useEffect(() => {
    const channel = supabase
      .channel("photos-" + stageId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos", filter: "stage_id=eq." + stageId },
        (payload) => {
          setPhotos(prev => prev.find((p: any) => p.id === payload.new.id) ? prev : [payload.new, ...prev])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [stageId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const tabStyle = (t: string) => ({
    flex: 1, padding: "10px", borderRadius: "100px", fontSize: "14px", fontWeight: "700",
    cursor: "pointer", border: "none",
    background: tab === t ? "#8fb840" : "#141a0e",
    color: tab === t ? "#0e1409" : "#7a8a6a",
  })

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim() || !author.trim()) return
    const tempMsg = { id: "temp-" + Date.now(), stage_id: stageId, author, content: newMsg, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempMsg])
    setNewMsg("")
    const { data } = await supabase.from("messages").insert({ stage_id: stageId, author, content: newMsg }).select().single()
    if (data) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m))
    }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !author.trim()) return
    setUploading(true)
    const ext = file.name.split(".").pop()
    const filename = `${stageId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("trip-photos").upload(filename, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from("trip-photos").getPublicUrl(filename)
      const { data: photo } = await supabase.from("photos").insert({ stage_id: stageId, participant_name: author, url: urlData.publicUrl }).select().single()
      if (photo) setPhotos(prev => [photo, ...prev])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  if (!authorSet) return (
    <div style={{background: "#141a0e", borderRadius: "20px", padding: "28px 24px", border: "1px solid #2d4a1e"}}>
      <h2 style={{fontSize: "20px", fontWeight: "700", marginBottom: "6px"}}>Qui es-tu ?</h2>
      <p style={{color: "#7a8a6a", fontSize: "14px", marginBottom: "20px"}}>Choisis ton prénom pour accéder à la messagerie et à l album.</p>
      <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
        {participants.map((name: string) => (
          <button key={name} onClick={() => { setAuthor(name); setAuthorSet(true) }}
            style={{background: "#0e1409", border: "1px solid #2d4a1e", color: "#e8e4d9", borderRadius: "12px", padding: "14px 20px", fontSize: "15px", fontWeight: "600", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px"}}>
            <div style={{width: "32px", height: "32px", borderRadius: "50%", background: "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "#8fb840", fontSize: "14px"}}>
              {name[0].toUpperCase()}
            </div>
            {name}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px"}}>
        <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
          <div style={{width: "28px", height: "28px", borderRadius: "50%", background: "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "#8fb840", fontSize: "12px"}}>
            {author[0].toUpperCase()}
          </div>
          <span style={{fontSize: "14px", color: "#7a8a6a"}}>Connecté en tant que <strong style={{color: "#e8e4d9"}}>{author}</strong></span>
        </div>
        <button onClick={() => setAuthorSet(false)} style={{background: "transparent", border: "none", color: "#4a5a3a", cursor: "pointer", fontSize: "12px"}}>Changer</button>
      </div>

      <div style={{display: "flex", gap: "8px", marginBottom: "20px"}}>
        <button style={tabStyle("messages")} onClick={() => setTab("messages")}>💬 Messages</button>
        <button style={tabStyle("photos")} onClick={() => setTab("photos")}>📷 Album</button>
      </div>

      {tab === "messages" && (
        <div style={{background: "#141a0e", borderRadius: "16px", border: "1px solid #1a2212", overflow: "hidden"}}>
          <div style={{height: "380px", overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px"}}>
            {messages.length === 0 && (
              <div style={{textAlign: "center", color: "#4a5a3a", marginTop: "60px"}}>
                <div style={{fontSize: "32px", marginBottom: "8px"}}>💬</div>
                <p>Aucun message pour l instant</p>
              </div>
            )}
            {messages.map((m: any) => {
              const isMe = m.author === author
              return (
                <div key={m.id} style={{display: "flex", gap: "10px", alignItems: "flex-end", flexDirection: isMe ? "row-reverse" : "row"}}>
                  {!isMe && (
                    <div style={{width: "28px", height: "28px", borderRadius: "50%", background: "#2d4a1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#8fb840", flexShrink: 0}}>
                      {m.author[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{maxWidth: "75%"}}>
                    {!isMe && <div style={{fontSize: "11px", color: "#7a8a6a", marginBottom: "3px", marginLeft: "4px"}}>{m.author}</div>}
                    <div style={{background: isMe ? "#2d4a1e" : "#0e1409", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", fontSize: "14px", color: "#e8e4d9", lineHeight: "1.5"}}>
                      {m.content}
                    </div>
                    <div style={{fontSize: "10px", color: "#4a5a3a", marginTop: "3px", textAlign: isMe ? "right" : "left"}}>
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"})}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} style={{padding: "14px", borderTop: "1px solid #1a2212", display: "flex", gap: "10px"}}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Message..."
              style={{flex: 1, background: "#0e1409", border: "1px solid #2d4a1e", color: "#e8e4d9", borderRadius: "100px", padding: "10px 16px", fontSize: "14px"}} />
            <button type="submit" style={{background: "#8fb840", color: "#0e1409", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "14px", fontWeight: "700", cursor: "pointer"}}>→</button>
          </form>
        </div>
      )}

      {tab === "photos" && (
        <div>
          <div style={{marginBottom: "16px"}}>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} style={{display: "none"}} id="photo-upload" />
            <label htmlFor="photo-upload" style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "#2d4a1e", color: "#8fb840", border: "1px dashed #3d6429", borderRadius: "16px", padding: "16px", cursor: "pointer", fontSize: "14px", fontWeight: "600"}}>
              {uploading ? "Upload en cours..." : "+ Ajouter des photos"}
            </label>
          </div>
          {photos.length === 0 ? (
            <div style={{textAlign: "center", padding: "40px", color: "#4a5a3a", background: "#141a0e", borderRadius: "16px"}}>
              <div style={{fontSize: "32px", marginBottom: "8px"}}>📷</div>
              <p>Aucune photo pour l instant</p>
            </div>
          ) : (
            <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px"}}>
              {photos.map((p: any) => (
                <div key={p.id} style={{position: "relative", paddingBottom: "100%", borderRadius: "12px", overflow: "hidden", background: "#141a0e"}}>
                  <img src={p.url} alt="" style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}} />
                  <div style={{position: "absolute", bottom: "6px", left: "6px", background: "rgba(0,0,0,0.6)", borderRadius: "20px", padding: "3px 8px", fontSize: "10px", fontWeight: "600"}}>
                    {p.participant_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}