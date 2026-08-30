"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { C, btnPrimary, input, label } from "@/lib/ui"

type Mode = "signin" | "signup" | "forgot" | "sent"

const MIN_PASSWORD = 8

/** Les messages de Supabase sont en anglais et parfois cryptiques. */
function frenchError(message: string) {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect."
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Un compte existe déjà avec cet email. Connecte-toi."
  if (m.includes("password should be at least"))
    return `Mot de passe trop court (${MIN_PASSWORD} caractères minimum).`
  if (m.includes("rate limit") || m.includes("too many"))
    return "Trop de tentatives. Attends une minute."
  if (m.includes("email not confirmed"))
    return "Confirme ton email avant de te connecter — regarde ta boîte mail."
  if (m.includes("unable to validate email")) return "Cet email n'est pas valide."
  return message
}

export function AuthForm({ next, intro }: { next: string; intro?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function done() {
    router.replace(next)
    router.refresh()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    setLoading(true)
    setError("")

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      setLoading(false)
      if (error) { setError(frenchError(error.message)); return }
      done()
      return
    }

    if (mode === "signup") {
      if (password.length < MIN_PASSWORD) {
        setLoading(false)
        setError(`Mot de passe trop court (${MIN_PASSWORD} caractères minimum).`)
        return
      }
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { display_name: name.trim() } },
      })
      setLoading(false)
      if (error) { setError(frenchError(error.message)); return }

      // Sans session, c'est que la confirmation d'email est active côté Supabase.
      if (!data.session) { setMode("sent"); return }
      done()
      return
    }

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
      })
      setLoading(false)
      if (error) { setError(frenchError(error.message)); return }
      setMode("sent")
      return
    }
  }

  const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "14px" }
  const linkBtn: React.CSSProperties = {
    background: "none",
    border: "none",
    color: C.accent,
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
    textAlign: "left",
  }

  if (mode === "sent") return (
    <div style={wrap}>
      <div style={{ fontSize: "40px" }}>📬</div>
      <h1 style={{ fontSize: "26px", fontWeight: 800 }}>Regarde tes mails</h1>
      <p style={{ color: C.muted, fontSize: "14px", lineHeight: 1.5 }}>
        On a envoyé un lien à <span style={{ color: C.text }}>{email.trim().toLowerCase()}</span>.
        Clique dessus pour continuer.
      </p>
      <button type="button" onClick={() => { setMode("signin"); setError("") }} style={linkBtn}>
        ← Retour à la connexion
      </button>
    </div>
  )

  const title =
    mode === "signup" ? "Crée ton compte"
    : mode === "forgot" ? "Mot de passe oublié"
    : "Connexion"

  const subtitle =
    mode === "signup" ? "Un email, un mot de passe, et tu es dans le trip."
    : mode === "forgot" ? "On t'envoie un lien pour en choisir un nouveau."
    : "Content de te revoir."

  return (
    <form onSubmit={submit} style={wrap}>
      {intro && (
        <div style={{ background: C.card, borderLeft: `3px solid ${C.accent}`, borderRadius: "0 10px 10px 0", padding: "10px 14px", fontSize: "13px", color: C.muted }}>
          {intro} — connecte-toi pour continuer.
        </div>
      )}

      <div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "6px" }}>{title}</h1>
        <p style={{ color: C.muted, fontSize: "14px" }}>{subtitle}</p>
      </div>

      {mode === "signup" && (
        <div>
          <label style={label}>PRÉNOM</label>
          <input
            required
            autoFocus
            maxLength={40}
            autoComplete="given-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Camille"
            style={input}
          />
          <p style={{ fontSize: "11px", color: C.dim, marginTop: "5px" }}>
            C&apos;est le nom que tes potes verront sur le trip.
          </p>
        </div>
      )}

      <div>
        <label style={label}>EMAIL</label>
        <input
          type="email"
          required
          autoFocus={mode !== "signup"}
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError("") }}
          placeholder="camille@email.com"
          style={input}
        />
      </div>

      {mode !== "forgot" && (
        <div>
          <label style={label}>MOT DE PASSE</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "signup" ? MIN_PASSWORD : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError("") }}
              placeholder={mode === "signup" ? `${MIN_PASSWORD} caractères minimum` : "••••••••"}
              style={{ ...input, paddingRight: "72px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
            >
              {showPassword ? "masquer" : "voir"}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: C.warn, fontSize: "13px" }}>{error}</p>}

      <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
        {loading
          ? "…"
          : mode === "signup" ? "Créer mon compte"
          : mode === "forgot" ? "Envoyer le lien"
          : "Se connecter"}
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
        {mode === "signin" && (
          <>
            <button type="button" onClick={() => { setMode("signup"); setError("") }} style={linkBtn}>
              Pas encore de compte ? En créer un
            </button>
            <button type="button" onClick={() => { setMode("forgot"); setError("") }} style={{ ...linkBtn, color: C.muted }}>
              Mot de passe oublié
            </button>
          </>
        )}
        {mode !== "signin" && (
          <button type="button" onClick={() => { setMode("signin"); setError("") }} style={linkBtn}>
            ← J&apos;ai déjà un compte
          </button>
        )}
      </div>
    </form>
  )
}
