"use client"
import { useState } from "react"

export function ShareButton({ url, title }: { url: string, title: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: title + " - RoadTrip", text: "Rejoins mon roadtrip !", url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button onClick={share} style={{width: "36px", height: "36px", borderRadius: "50%", background: "#2d4a1e", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px"}}>
      {copied ? "✓" : "↗"}
    </button>
  )
}