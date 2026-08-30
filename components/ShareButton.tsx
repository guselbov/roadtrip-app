"use client"
import { useState } from "react"
import { C } from "@/lib/ui"

export function ShareButton({ slug, title, code }: { slug: string; title: string; code?: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/trip/${slug}`
    const text = code
      ? `Rejoins "${title}" sur RoadTrip — code ${code}`
      : `Rejoins "${title}" sur RoadTrip`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // Partage annulé par l'utilisateur : on retombe sur la copie.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      onClick={share}
      style={{ background: C.card, border: `1px solid ${C.green}`, color: copied ? C.accent : C.text, borderRadius: "100px", padding: "9px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
    >
      {copied ? "Lien copié ✓" : "Partager"}
    </button>
  )
}
