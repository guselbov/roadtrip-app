import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Client Supabase côté serveur (Server Components, Route Handlers, Server Actions).
 * La session vit dans les cookies : c'est ce qui permet de protéger /dashboard
 * côté serveur au lieu d'un simple router.push côté client.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Appelé depuis un Server Component : le middleware rafraîchit
            // déjà la session, on peut ignorer sans risque.
          }
        },
      },
    }
  )
}
