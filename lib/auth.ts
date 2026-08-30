import { createClient } from "./supabase/server"
import type { Profile } from "./types"

/**
 * Utilisateur courant + profil, ou null. À utiliser dans les Server Components.
 *
 * Le profil est normalement créé par le trigger `handle_new_user`. Mais un
 * compte peut se retrouver sans profil — migration rejouée, ligne supprimée à
 * la main — et tout casse alors sur une violation de clé étrangère
 * incomprehensible. On le recrée donc à la volée.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("id", user.id)
    .maybeSingle()

  if (data) return data

  const fallbackName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Moi"

  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: user.id, display_name: fallbackName, email: user.email ?? null })
    .select("id, display_name, email")
    .single()

  return created ?? { id: user.id, display_name: fallbackName, email: user.email ?? null }
}

/** Lien vers l'écran de connexion qui ramène ensuite là où on était. */
export function authUrl(next: string, intro?: string) {
  const p = new URLSearchParams({ next })
  if (intro) p.set("intro", intro)
  return "/auth?" + p.toString()
}
