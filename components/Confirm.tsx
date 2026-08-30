"use client"
import { useEffect, useState } from "react"
import { C, card } from "@/lib/ui"

interface Ask {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` colore le bouton en corail : l'action ne se rattrape pas. */
  tone?: "danger" | "normal"
}

interface Pending extends Ask {
  resolve: (ok: boolean) => void
}

/**
 * Remplace `window.confirm`, qui casse complètement l'ambiance de l'app.
 * S'utilise pareil : `if (!(await ask({ title: "…" }))) return`.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null)

  function ask(options: Ask) {
    return new Promise<boolean>(resolve => setPending({ ...options, resolve }))
  }

  function close(ok: boolean) {
    pending?.resolve(ok)
    setPending(null)
  }

  const dialog = pending ? <ConfirmDialog pending={pending} onClose={close} /> : null

  return { ask, dialog }
}

function ConfirmDialog({ pending, onClose }: { pending: Pending; onClose: (ok: boolean) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false)
      if (e.key === "Enter") onClose(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const danger = pending.tone === "danger"

  return (
    <div
      onClick={() => onClose(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 4000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          ...card,
          width: "100%",
          maxWidth: "380px",
          padding: "24px",
          borderColor: danger ? "rgba(255,122,89,0.35)" : C.card2,
        }}
      >
        <div style={{ fontSize: "28px", marginBottom: "10px" }}>{danger ? "🗑️" : "🤔"}</div>

        <h2 style={{ fontSize: "19px", fontWeight: 800, lineHeight: 1.25, marginBottom: pending.message ? "8px" : "20px" }}>
          {pending.title}
        </h2>

        {pending.message && (
          <p style={{ color: C.muted, fontSize: "14px", lineHeight: 1.5, marginBottom: "20px" }}>
            {pending.message}
          </p>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onClose(false)}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.green}`, color: C.muted, borderRadius: "100px", padding: "12px", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}
          >
            {pending.cancelLabel ?? "Annuler"}
          </button>
          <button
            autoFocus
            onClick={() => onClose(true)}
            style={{
              flex: 1,
              background: danger ? C.coral : C.accent,
              border: "none",
              color: "#0b120f",
              borderRadius: "100px",
              padding: "12px",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "14px",
            }}
          >
            {pending.confirmLabel ?? "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  )
}
