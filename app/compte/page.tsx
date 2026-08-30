import Link from "next/link"
import { redirect } from "next/navigation"
import { authUrl, getCurrentProfile } from "@/lib/auth"
import { AccountForm } from "./AccountForm"
import { C, card, container, page } from "@/lib/ui"

export default async function AccountPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect(authUrl("/compte"))

  return (
    <main style={page}>
      <div style={container}>
        <Link href="/" style={{ color: C.muted, fontSize: "14px", textDecoration: "none", display: "inline-block", marginBottom: "28px" }}>
          ← Mes trips
        </Link>

        <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "20px" }}>Ton compte</h1>

        <AccountForm profile={profile} />

        <div style={{ ...card, marginTop: "16px" }}>
          <div style={{ fontSize: "11px", color: C.muted, letterSpacing: "1px", marginBottom: "6px" }}>EMAIL</div>
          <div style={{ fontSize: "15px" }}>{profile.email ?? "—"}</div>
          <p style={{ fontSize: "12px", color: C.dim, marginTop: "8px", lineHeight: 1.5 }}>
            C&apos;est ton identifiant de connexion. Il n&apos;est visible que par toi.
          </p>
        </div>

        <form action="/auth/signout" method="post" style={{ marginTop: "24px" }}>
          <button
            type="submit"
            style={{ background: "none", border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "13px", width: "100%", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  )
}
