import { createClient } from "./supabase/server"
import type { Profile } from "./types"

/** Utilisateur courant + profil, ou null. À utiliser dans les Server Components. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("id", user.id)
    .single()

  return data ?? { id: user.id, display_name: user.email?.split("@")[0] ?? "Moi", email: user.email ?? null }
}

/** Lien vers l'écran de connexion qui ramène ensuite là où on était. */
export function authUrl(next: string, intro?: string) {
  const p = new URLSearchParams({ next })
  if (intro) p.set("intro", intro)
  return "/auth?" + p.toString()
}
