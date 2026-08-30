"use client"
import { useState } from "react"
import Link from "next/link"
import { CodeEntry } from "./CodeEntry"
import { C } from "@/lib/ui"

const cardBase: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  borderRadius: "20px",
  padding: "18px",
  cursor: "pointer",
  textAlign: "left",
  textDecoration: "none",
  fontFamily: "inherit",
  border: "none",
}

const iconBox: React.CSSProperties = {
  width: "46px",
  height: "46px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  flexShrink: 0,
}

/**
 * Les deux portes d'entrée du produit : organiser, ou rejoindre avec un code.
 * Partagées par la landing et l'état vide de « Mes trips » — un utilisateur
 * sans aucun trip doit avoir exactement les mêmes options qu'un visiteur.
 */
export function EntryCards() {
  const [openCode, setOpenCode] = useState(false)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Link href="/creer" className="hoverable" style={{ ...cardBase, background: C.accent, color: C.bg }}>
        <span style={{ ...iconBox, background: "rgba(0,0,0,0.15)" }}>🗺️</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: "17px", fontWeight: 800, marginBottom: "2px" }}>
            J&apos;organise le trip
          </span>
          <span style={{ display: "block", fontSize: "13px", opacity: 0.75 }}>
            Je crée l&apos;itinéraire et j&apos;invite mes potes
          </span>
        </span>
        <span style={{ fontSize: "20px", opacity: 0.6 }}>→</span>
      </Link>

      <div className={openCode ? "" : "hoverable"} style={{ background: C.card, borderRadius: "20px", border: `1px solid ${openCode ? C.greenLight : "transparent"}` }}>
        <button
          onClick={() => setOpenCode(o => !o)}
          aria-expanded={openCode}
          style={{ ...cardBase, background: "transparent", color: C.text }}
        >
          <span style={{ ...iconBox, background: C.green }}>🎒</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: "17px", fontWeight: 800, marginBottom: "2px" }}>
              Je suis un pote
            </span>
            <span style={{ display: "block", fontSize: "13px", color: C.muted }}>
              On m&apos;a filé un code d&apos;invitation
            </span>
          </span>
          <span style={{ fontSize: "18px", color: C.dim, transform: openCode ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
            →
          </span>
        </button>

        {openCode && (
          <div style={{ padding: "0 18px 18px" }}>
            <CodeEntry autoFocus />
            <p style={{ fontSize: "12px", color: C.dim, marginTop: "10px", lineHeight: 1.45 }}>
              Le code fait 6 caractères, du genre <span style={{ fontFamily: "monospace", color: C.muted }}>SURF26</span>.
              Tu verras le trip avant de t&apos;engager.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
