"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { C, btnPrimary, input, label } from "@/lib/ui"

// Alphabet sans I/O/0/1 : un code lu au téléphone ne doit jamais être ambigu.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const SLUG_CHARS = "abcdefghijkmnpqrstuvwxyz23456789"

function pick(chars: string, n: number) {
  const bytes = new Uint32Array(n)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join("")
}

export function CreateTripForm({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ title: "", description: "", date_start: "", date_end: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (form.date_start && form.date_end && form.date_end < form.date_start) {
      setError("La date de fin est avant la date de début.")
      return
    }
    setLoading(true)
    setError("")

    // Le code et le slug sont uniques en base : on retente si collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase
        .from("roadtrips")
        .insert({
          owner_id: userId,
          slug: pick(SLUG_CHARS, 8),
          code: pick(CODE_CHARS, 6),
          title: form.title.trim(),
          description: form.description.trim() || null,
          date_start: form.date_start || null,
          date_end: form.date_end || null,
        })
        .select("slug")
        .single()

      if (!error && data) {
        router.replace("/dashboard/" + data.slug)
        router.refresh()
        return
      }
      if (error && error.code !== "23505") {
        setLoading(false)
        setError(error.message)
        return
      }
    }
    setLoading(false)
    setError("Impossible de générer un code libre. Réessaie.")
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <label style={label}>NOM DU TRIP *</label>
        <input
          required
          autoFocus
          maxLength={80}
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Sud-Ouest juillet 2026"
          style={input}
        />
      </div>

      <div>
        <label style={label}>EN DEUX MOTS — OPTIONNEL</label>
        <textarea
          rows={3}
          maxLength={500}
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Surf, van et couchers de soleil sur la côte atlantique."
          style={{ ...input, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={label}>DÉBUT</label>
          <input type="date" value={form.date_start} onChange={e => setForm({ ...form, date_start: e.target.value })} style={input} />
        </div>
        <div>
          <label style={label}>FIN</label>
          <input type="date" value={form.date_end} min={form.date_start || undefined} onChange={e => setForm({ ...form, date_end: e.target.value })} style={input} />
        </div>
      </div>

      {error && <p style={{ color: C.warn, fontSize: "13px" }}>{error}</p>}

      <button type="submit" disabled={loading || !form.title.trim()} style={{ ...btnPrimary, opacity: loading || !form.title.trim() ? 0.5 : 1 }}>
        {loading ? "Création…" : "Créer le trip →"}
      </button>

      <p style={{ color: C.dim, fontSize: "12px", textAlign: "center" }}>
        Tu ajouteras les étapes juste après. Un code de partage sera généré automatiquement.
      </p>
    </form>
  )
}
