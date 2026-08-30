import type { Stage } from "./types"

const DAY = 86400000

export function toDate(iso: string) {
  return new Date(iso + "T00:00:00")
}

export function dayCount(start: string, end: string) {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / DAY) + 1
}

/**
 * Formate en YYYY-MM-DD à partir des composantes LOCALES.
 * Surtout pas toISOString() : il convertit en UTC, et une date à minuit heure
 * française devient 22h la veille — tous les croisements reculaient d'un jour.
 */
export function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export interface Overlap {
  stage: Stage
  start: string
  end: string
  days: number
}

/**
 * Croisement entre les dates de dispo d'un pote et chaque étape du trip.
 * C'est le cœur du produit : « tu croises Biarritz sur 3 jours ».
 */
export function computeOverlaps(stages: Stage[], from: string, to: string): Overlap[] {
  if (!from || !to) return []
  const gs = toDate(from).getTime()
  const ge = toDate(to).getTime()
  if (ge < gs) return []

  const out: Overlap[] = []
  for (const stage of stages) {
    if (!stage.date_start || !stage.date_end) continue
    const ss = toDate(stage.date_start).getTime()
    const se = toDate(stage.date_end).getTime()
    const os = Math.max(gs, ss)
    const oe = Math.min(ge, se)
    if (os > oe) continue
    const start = iso(new Date(os))
    const end = iso(new Date(oe))
    out.push({ stage, start, end, days: dayCount(start, end) })
  }
  return out
}

export function formatRange(start: string | null, end: string | null) {
  if (!start) return "—"
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const a = toDate(start).toLocaleDateString("fr-FR", opts)
  if (!end || end === start) return a
  return a + " → " + toDate(end).toLocaleDateString("fr-FR", opts)
}

export function formatLongRange(start: string | null, end: string | null) {
  if (!start || !end) return ""
  const a = toDate(start).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
  const b = toDate(end).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  return `${a} → ${b}`
}

/** Liste des jours (ISO) entre deux dates incluses — pour la frise calendrier. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = []
  const s = toDate(start)
  const e = toDate(end)
  for (let d = s; d <= e; d = new Date(d.getTime() + DAY)) out.push(iso(d))
  return out
}
