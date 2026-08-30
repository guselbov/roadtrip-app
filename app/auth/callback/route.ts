import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Point d'atterrissage des liens envoyés par mail (réinitialisation de mot de
 * passe, confirmation d'adresse). Supabase renvoie un `code` qu'on échange
 * contre une session, puis on redirige là où l'utilisateur devait aller.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const raw = searchParams.get("next") ?? "/"
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=lien_invalide`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=lien_expire`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
