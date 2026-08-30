"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "./supabase/client"
import { dbError } from "./errors"
import type { Activity, ActivityVote } from "./types"

/**
 * Toutes les activités d'un trip et leurs votes, tenus à jour en direct.
 * Un seul chargement sert la liste par étape et le panneau par journée.
 */
export function useActivities(tripId: string, meId: string) {
  const [supabase] = useState(() => createClient())
  // Deux panneaux peuvent écouter les mêmes tables en même temps : sans
  // suffixe unique, Supabase réutilise le canal déjà souscrit et refuse d'y
  // ajouter des écouteurs.
  const [channelId] = useState(() => Math.random().toString(36).slice(2, 9))
  const [activities, setActivities] = useState<Activity[]>([])
  const [votes, setVotes] = useState<ActivityVote[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const [a, v] = await Promise.all([
      supabase
        .from("activities")
        .select("*, profiles:author_id(id, display_name)")
        .eq("trip_id", tripId)
        .order("starts_on", { ascending: true, nullsFirst: false })
        .order("starts_at", { ascending: true, nullsFirst: false }),
      supabase.from("activity_votes").select("activity_id, user_id"),
    ])
    setActivities((a.data as unknown as Activity[]) ?? [])
    setVotes((v.data as ActivityVote[]) ?? [])
    setReady(true)
  }, [supabase, tripId])

  useEffect(() => {
    let loaded = false
    const channel = supabase
      .channel(`activities-${tripId}-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities", filter: `trip_id=eq.${tripId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_votes" }, () => load())
      // Premier chargement depuis le callback : un appel direct dans l'effet
      // serait un setState synchrone, que le lint refuse.
      .subscribe(() => { if (!loaded) { loaded = true; load() } })
    return () => { supabase.removeChannel(channel) }
  }, [supabase, tripId, channelId, load])

  const voteCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of votes) map.set(v.activity_id, (map.get(v.activity_id) ?? 0) + 1)
    return map
  }, [votes])

  const myVotes = useMemo(
    () => new Set(votes.filter(v => v.user_id === meId).map(v => v.activity_id)),
    [votes, meId]
  )

  async function propose(input: {
    title: string
    place: string
    startsOn: string
    startsAt: string
    description?: string
    address?: string
    url?: string
    stageId: string | null
  }) {
    const title = input.title.trim()
    if (!title) return false
    setError("")
    const { error } = await supabase.from("activities").insert({
      trip_id: tripId,
      stage_id: input.stageId,
      author_id: meId,
      title,
      place: input.place.trim() || null,
      starts_on: input.startsOn || null,
      starts_at: input.startsAt || null,
      description: input.description?.trim() || null,
      address: input.address?.trim() || null,
      url: input.url?.trim() || null,
      status: "proposed",
    })
    if (error) { setError(dbError(error)); return false }
    await load()
    return true
  }

  async function toggleVote(activityId: string) {
    setError("")
    if (myVotes.has(activityId)) {
      // Optimiste : le vote est l'action la plus fréquente, elle doit répondre.
      setVotes(vs => vs.filter(v => !(v.activity_id === activityId && v.user_id === meId)))
      const { error } = await supabase
        .from("activity_votes")
        .delete()
        .eq("activity_id", activityId)
        .eq("user_id", meId)
      if (error) { setError(dbError(error)); await load() }
    } else {
      setVotes(vs => [...vs, { activity_id: activityId, user_id: meId }])
      const { error } = await supabase
        .from("activity_votes")
        .insert({ activity_id: activityId, user_id: meId })
      if (error) { setError(dbError(error)); await load() }
    }
  }

  /** Réservé à l'organisateur — la policy et le trigger le vérifient aussi. */
  async function schedule(activityId: string, day: string | null) {
    setError("")
    // Retenir, c'est fixer la date au programme du groupe.
    const patch = day
      ? { starts_on: day, status: "scheduled" as const }
      : { status: "proposed" as const }
    const { error } = await supabase.from("activities").update(patch).eq("id", activityId)
    if (error) { setError(dbError(error)); return false }
    await load()
    return true
  }

  async function remove(activityId: string) {
    setError("")
    const { error } = await supabase.from("activities").delete().eq("id", activityId)
    if (error) { setError(dbError(error)); return false }
    setActivities(as => as.filter(a => a.id !== activityId))
    return true
  }

  return { activities, ready, error, setError, voteCount, myVotes, propose, toggleVote, schedule, remove }
}
