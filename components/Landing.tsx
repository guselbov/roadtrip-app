import Link from "next/link"
import { EntryCards } from "./EntryCards"
import { C } from "@/lib/ui"

/**
 * Premier écran de l'app pour un visiteur déconnecté. Trois portes d'entrée
 * explicites : organisateur, pote avec un code, ou compte existant.
 */
export function Landing() {
  return (
    <main
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "32px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Décor */}
      <div style={{ position: "absolute", top: "-90px", right: "-90px", width: "300px", height: "300px", borderRadius: "50%", background: C.card2, opacity: 0.8 }} />
      <div style={{ position: "absolute", bottom: "-70px", left: "-70px", width: "220px", height: "220px", borderRadius: "50%", background: C.card, opacity: 0.9 }} />
      <div style={{ position: "absolute", top: "38%", left: "-50px", width: "130px", height: "130px", borderRadius: "50%", background: C.green, opacity: 0.25 }} />

      <div style={{ position: "relative", width: "100%", maxWidth: "420px", margin: "0 auto" }}>

        <div style={{ fontSize: "48px", marginBottom: "10px" }}>🌊</div>
        <h1 style={{ fontSize: "clamp(30px, 8vw, 40px)", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.08, marginBottom: "10px" }}>
          Le Doodle<br />des road trips.
        </h1>
        <p style={{ color: C.muted, fontSize: "15px", lineHeight: 1.55, marginBottom: "32px" }}>
          Tes potes entrent leurs dates, l&apos;app calcule où et quand vous vous croisez.
        </p>

        <div style={{ fontSize: "11px", color: C.dim, letterSpacing: "1px", marginBottom: "12px" }}>
          TU ES QUI ?
        </div>

        <EntryCards />

        <Link
          href="/auth"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            borderRadius: "20px",
            padding: "16px 18px",
            marginTop: "12px",
            background: "transparent",
            border: `1px solid ${C.green}`,
            color: C.text,
            textDecoration: "none",
          }}
        >
          <span style={{ width: "40px", height: "40px", borderRadius: "14px", background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
            👋
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: "15px", fontWeight: 700 }}>J&apos;ai déjà un compte</span>
            <span style={{ display: "block", fontSize: "13px", color: C.muted }}>Retrouver mes trips</span>
          </span>
          <span style={{ fontSize: "18px", color: C.dim }}>→</span>
        </Link>

        <p style={{ color: C.dim, fontSize: "12px", marginTop: "28px", textAlign: "center" }}>
          Gratuit · Compte en 30 secondes
        </p>
      </div>
    </main>
  )
}
