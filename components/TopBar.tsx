import Link from "next/link"
import { NotificationBell, type NotifRow } from "./NotificationBell"
import { SessionSync } from "./SessionSync"
import { createClient } from "@/lib/supabase/server"
import { authUrl } from "@/lib/auth"
import { C, avatarStyle } from "@/lib/ui"
import type { Profile } from "@/lib/types"

export async function TopBar({ profile, next = "/" }: { profile: Profile | null; next?: string }) {
  let notifs: NotifRow[] = []
  if (profile) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("notifications")
      .select("id, type, trip_id, stage_id, read_at, created_at, roadtrips(slug, title), profiles:actor_id(display_name)")
      .order("created_at", { ascending: false })
      .limit(20)
    notifs = (data as unknown as NotifRow[]) ?? []
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", gap: "10px" }}>
      <SessionSync userId={profile?.id ?? null} />
      <Link href="/" style={{ textDecoration: "none", color: C.text, fontWeight: 800, fontSize: "17px", letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "20px" }}>🌊</span> RoadTrip
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {profile ? (
          <>
            <NotificationBell userId={profile.id} initial={notifs} />
            <Link
              href="/compte"
              title={profile.display_name}
              style={avatarStyle(profile.id, 38)}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </Link>
          </>
        ) : (
          <Link
            href={authUrl(next)}
            style={{ background: C.card, border: `1px solid ${C.green}`, color: C.text, borderRadius: "100px", padding: "9px 18px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}
          >
            Connexion
          </Link>
        )}
      </div>
    </div>
  )
}
