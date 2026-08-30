import type { CSSProperties } from "react"

export const C = {
  bg: "#0e1409",
  card: "#141a0e",
  card2: "#1a2212",
  green: "#2d4a1e",
  greenLight: "#3d6429",
  accent: "#8fb840",
  text: "#e8e4d9",
  muted: "#7a8a6a",
  dim: "#4a5a3a",
  warn: "#c07040",
} as const

export const page: CSSProperties = {
  background: C.bg,
  minHeight: "100vh",
  color: C.text,
}

export const container: CSSProperties = {
  maxWidth: "480px",
  margin: "0 auto",
  padding: "20px",
}

export const card: CSSProperties = {
  background: C.card,
  borderRadius: "16px",
  padding: "16px",
}

export const input: CSSProperties = {
  background: C.card,
  border: `1px solid ${C.green}`,
  color: C.text,
  borderRadius: "12px",
  padding: "14px 16px",
  width: "100%",
  fontSize: "16px", // < 16px déclenche le zoom auto sur iOS
  outline: "none",
  fontFamily: "inherit",
}

export const btnPrimary: CSSProperties = {
  background: C.accent,
  color: C.bg,
  border: "none",
  borderRadius: "100px",
  padding: "16px",
  width: "100%",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 700,
  fontFamily: "inherit",
}

export const btnGhost: CSSProperties = {
  background: "transparent",
  color: C.muted,
  border: `1px solid ${C.green}`,
  borderRadius: "100px",
  padding: "14px",
  width: "100%",
  cursor: "pointer",
  fontSize: "15px",
  fontFamily: "inherit",
}

export const label: CSSProperties = {
  fontSize: "11px",
  color: C.muted,
  letterSpacing: "1px",
  display: "block",
  marginBottom: "6px",
}

export const pill: CSSProperties = {
  background: C.green,
  color: C.accent,
  borderRadius: "20px",
  padding: "4px 10px",
  fontSize: "11px",
  fontWeight: 700,
}

/** Couleur d'avatar stable, dérivée de l'id du profil. */
const AVATARS = ["#2d4a1e", "#5c3d2e", "#3d6429", "#7a5240", "#4a5a3a", "#6b4a2a"]
export function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATARS[h % AVATARS.length]
}
