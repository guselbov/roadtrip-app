"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { C, avatarStyle, card, input, label } from "@/lib/ui"
import type { Profile } from "@/lib/types"

export function AccountForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState(profile.display_name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty = name.trim() !== profile.display_name && name.trim().length > 0

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", profile.id)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <span style={avatarStyle(profile.id, 48)}>
          {(name || "?").charAt(0).toUpperCase()}
        </span>
        <p style={{ fontSize: "13px", color: C.muted, lineHeight: 1.4 }}>
          Le nom que tes potes voient sur les trips et dans les messages.
        </p>
      </div>

      <label style={label}>PRÉNOM</label>
      <input value={name} maxLength={40} onChange={e => setName(e.target.value)} style={input} />

      <button
        onClick={save}
        disabled={!dirty || saving}
        style={{ marginTop: "12px", background: saved ? C.green : C.accent, color: saved ? C.accent : C.bg, border: "none", borderRadius: "100px", padding: "12px", width: "100%", fontWeight: 700, cursor: dirty ? "pointer" : "default", opacity: dirty || saved ? 1 : 0.4, fontFamily: "inherit", fontSize: "15px" }}
      >
        {saved ? "Enregistré ✓" : saving ? "…" : "Enregistrer"}
      </button>
    </div>
  )
}
