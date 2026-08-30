"use client"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { C } from "@/lib/ui"
import type { NotificationType } from "@/lib/types"

export interface NotifRow {
  id: string
  type: NotificationType
  trip_id: string | null
  stage_id: string | null
  read_at: string | null
  created_at: string
  roadtrips: { slug: string; title: string } | null
  profiles: { display_name: string } | null
}

const LABEL: Record<NotificationType, (who: string, trip: string) => string> = {
  join_request:  (w, t) => `${w} veut rejoindre ${t}`,
  join_approved: (_, t) => `Ta place est confirmée sur ${t} 🎉`,
  join_rejected: (_, t) => `Ta demande sur ${t} a été refusée`,
  new_message:   (w, t) => `${w} a écrit sur ${t}`,
  new_photo:     (w, t) => `${w} a ajouté une photo sur ${t}`,
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}

export function NotificationBell({ userId, initial }: { userId: string; initial: NotifRow[] }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [rows, setRows] = useState<NotifRow[]>(initial)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, trip_id, stage_id, read_at, created_at, roadtrips(slug, title), profiles:actor_id(display_name)")
      .order("created_at", { ascending: false })
      .limit(20)
    setRows((data as unknown as NotifRow[]) ?? [])
  }, [supabase])

  // Le premier chargement vient du serveur : ici on ne fait que s'abonner.
  useEffect(() => {
    const channel = supabase
      .channel("notif-" + userId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => { load() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId, load])

  const unread = rows.filter(r => !r.read_at).length

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      const ids = rows.filter(r => !r.read_at).map(r => r.id)
      const now = new Date().toISOString()
      setRows(rs => rs.map(r => (r.read_at ? r : { ...r, read_at: now })))
      await supabase.from("notifications").update({ read_at: now }).in("id", ids)
      router.refresh()
    }
  }

  function target(r: NotifRow) {
    if (r.type === "join_request" && r.roadtrips) return "/dashboard/" + r.roadtrips.slug
    if (r.stage_id) return "/stage/" + r.stage_id
    if (r.roadtrips) return "/trip/" + r.roadtrips.slug
    return "/"
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        style={{ background: C.card, border: `1px solid ${C.green}`, color: C.text, borderRadius: "50%", width: "38px", height: "38px", cursor: "pointer", fontSize: "16px", position: "relative", fontFamily: "inherit" }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: "-2px", right: "-2px", background: C.accent, color: C.bg, borderRadius: "10px", minWidth: "18px", height: "18px", fontSize: "11px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 900 }} />
          <div style={{ position: "absolute", right: 0, top: "46px", width: "min(320px, calc(100vw - 32px))", background: C.card, border: `1px solid ${C.green}`, borderRadius: "16px", zIndex: 901, overflow: "hidden", maxHeight: "60vh", overflowY: "auto" }}>
            {rows.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: C.muted, fontSize: "14px" }}>
                Rien de neuf pour l&apos;instant.
              </div>
            )}
            {rows.map(r => (
              <a
                key={r.id}
                href={target(r)}
                style={{ display: "block", padding: "12px 14px", borderBottom: `1px solid ${C.bg}`, textDecoration: "none", color: C.text }}
              >
                <div style={{ fontSize: "14px", lineHeight: 1.4 }}>
                  {LABEL[r.type](r.profiles?.display_name ?? "Quelqu'un", r.roadtrips?.title ?? "ton trip")}
                </div>
                <div style={{ fontSize: "12px", color: C.dim, marginTop: "2px" }}>{timeAgo(r.created_at)}</div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
