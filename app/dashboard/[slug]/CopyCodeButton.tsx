"use client"
import { useState } from "react"

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={copy}
      style={{background: copied ? "#2d4a1e" : "#0e1409", color: copied ? "#8fb840" : "#7a8a6a", border: "1px solid #2d4a1e", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer"}}>
      {copied ? "Copie !" : "Copier"}
    </button>
  )
}