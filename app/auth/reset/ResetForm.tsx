"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { C, btnPrimary, input, label } from "@/lib/ui"

const MIN_PASSWORD = 8

export function ResetForm() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) {
      setError(`Mot de passe trop court (${MIN_PASSWORD} caractères minimum).`)
      return
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace("/")
    router.refresh()
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "6px" }}>Nouveau mot de passe</h1>
        <p style={{ color: C.muted, fontSize: "14px" }}>
          Choisis-en un que tu retiendras, {MIN_PASSWORD} caractères minimum.
        </p>
      </div>

      <div>
        <label style={label}>NOUVEAU MOT DE PASSE</label>
        <div style={{ position: "relative" }}>
          <input
            type={show ? "text" : "password"}
            required
            autoFocus
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError("") }}
            style={{ ...input, paddingRight: "72px" }}
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
          >
            {show ? "masquer" : "voir"}
          </button>
        </div>
      </div>

      <div>
        <label style={label}>CONFIRMATION</label>
        <input
          type={show ? "text" : "password"}
          required
          autoComplete="new-password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setError("") }}
          style={input}
        />
      </div>

      {error && <p style={{ color: C.warn, fontSize: "13px" }}>{error}</p>}

      <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
        {loading ? "…" : "Enregistrer"}
      </button>
    </form>
  )
}
