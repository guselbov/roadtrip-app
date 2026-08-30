"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Se connecter dans un onglet remplace la session dans TOUS les onglets, mais
 * les pages deja affichees restent rendues pour l'ancien compte : elles
 * montrent des donnees perimees et leurs ecritures sont rejetees par les
 * policies. On recharge donc la page des que le compte change vraiment.
 */
export function SessionSync({ userId }: { userId: string | null }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user?.id ?? null
      // INITIAL_SESSION et les rafraichissements de token ne changent rien.
      if (current !== userId) router.refresh()
    })
    return () => subscription.unsubscribe()
  }, [supabase, userId, router])

  return null
}
