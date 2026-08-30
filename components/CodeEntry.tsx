"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { C, input } from "@/lib/ui"

/** Saisie du code trip. Passe par la fonction SQL : aucune table n'est exposée. */
export function CodeEntry({ compact, autoFocus }: { compact?: boolean; autoFocus?: boolean }) {
  const router = useRouter()
  const supabase = createClient()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.toUpperCase().trim()
    if (clean.length < 4) return
    setLoading(true)
    setError("")
    const { data, error } = await supabase.rpc("find_trip_by_code", { p_code: clean })
    setLoading(false)
    if (error || !data) {
      setError("Code inconnu — vérifie avec ton pote.")
      return
    }
    router.push("/trip/" + data)
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          autoFocus={autoFocus}
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError("") }}
          placeholder="SURF26"
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          style={{
            ...input,
            textAlign: "center",
            letterSpacing: "4px",
            fontWeight: 700,
            fontSize: compact ? "16px" : "20px",
          }}
        />
        <button
          type="submit"
          disabled={loading || code.trim().length < 4}
          style={{
            background: C.accent,
            color: C.bg,
            border: "none",
            borderRadius: "12px",
            padding: "0 20px",
            fontSize: "18px",
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
            opacity: loading || code.trim().length < 4 ? 0.4 : 1,
            fontFamily: "inherit",
          }}
        >
          {loading ? "…" : "→"}
        </button>
      </div>
      {error && <p style={{ color: C.warn, fontSize: "13px", marginTop: "8px" }}>{error}</p>}
    </form>
  )
}
