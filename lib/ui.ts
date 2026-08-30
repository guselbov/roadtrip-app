import type { CSSProperties } from "react"

export const C = {
  // Fond volontairement très sombre : la carte et les photos y ressortent.
  bg: "#0b120f",
  card: "#141e18",
  card2: "#1c2a22",
  green: "#1f4030",
  greenLight: "#2f6244",

  // Accents vifs
  accent: "#a3e635",   // vert citron — action principale
  teal: "#2dd4bf",
  coral: "#ff7a59",
  amber: "#fbbf24",
  violet: "#a78bfa",
  sky: "#38bdf8",

  text: "#eef4ea",
  muted: "#8ea684",
  dim: "#56694f",
  warn: "#ff7a59",
} as const

/** Une couleur par étape, réutilisée partout : planning, liste, carte, album. */
export const STAGE_COLORS = [C.accent, C.coral, C.teal, C.amber, C.violet, C.sky] as const

export function stageColor(index: number) {
  return STAGE_COLORS[index % STAGE_COLORS.length]
}

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
  borderRadius: "18px",
  padding: "16px",
  border: `1px solid ${C.card2}`,
}

export const input: CSSProperties = {
  background: C.bg,
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
  color: "#0b120f",
  border: "none",
  borderRadius: "100px",
  padding: "16px",
  width: "100%",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 800,
  fontFamily: "inherit",
  boxShadow: "0 6px 20px rgba(163, 230, 53, 0.18)",
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

export const sectionTitle: CSSProperties = {
  fontSize: "11px",
  color: C.dim,
  letterSpacing: "1.5px",
  fontWeight: 700,
  marginBottom: "12px",
}

export const pill: CSSProperties = {
  background: C.green,
  color: C.accent,
  borderRadius: "20px",
  padding: "4px 10px",
  fontSize: "11px",
  fontWeight: 700,
}

/** Pastille colorée douce : fond teinté, texte dans la même couleur. */
export function tint(color: string, alpha = 0.16): CSSProperties {
  return { background: hexA(color, alpha), color, border: `1px solid ${hexA(color, 0.35)}` }
}

function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Couleur d'avatar stable, dérivée de l'id du profil. */
const AVATARS = [C.accent, C.coral, C.teal, C.amber, C.violet, C.sky]
export function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATARS[h % AVATARS.length]
}

/** Avatar complet. Le texte est sombre : les accents sont clairs et saturés. */
export function avatarStyle(id: string, size = 36): CSSProperties {
  return {
    width: size + "px",
    height: size + "px",
    borderRadius: "50%",
    background: avatarColor(id),
    color: "#0b120f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: Math.round(size * 0.42) + "px",
    flexShrink: 0,
    textDecoration: "none",
  }
}
