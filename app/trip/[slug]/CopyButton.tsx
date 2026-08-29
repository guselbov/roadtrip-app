"use client"
import { useState } from "react"

export function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} style={{background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer"}}>
      {copied ? "Copie !" : "Copier"}
    </button>
  )
}