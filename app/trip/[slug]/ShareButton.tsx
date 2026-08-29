"use client"
import { useState } from "react"

export function ShareButton({ url, title }: { url: string, title: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: title + " - RoadTrip", text: "Rejoins mon roadtrip !", url })
      } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{background: "#111", borderRadius: "12px", padding: "1.5rem"}}>
      <p style={{color: "#888", fontSize: "0.875rem", marginBottom: "0.75rem"}}>Partage ce lien a tes potes</p>
      <div style={{display: "flex", gap: "0.75rem", alignItems: "center"}}>
        <div style={{flex: 1, background: "#222", borderRadius: "8px", padding: "0.75rem", color: "#ccc", fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
          {url}
        </div>
        <button
          onClick={share}
          style={{background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap", flexShrink: 0}}
        >
          {copied ? "Copie !" : "Partager"}
        </button>
      </div>
    </div>
  )
}