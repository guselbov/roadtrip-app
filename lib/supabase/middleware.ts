import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** Routes exigeant une session. Le reste est public ou se protège page par page. */
const PROTECTED = ["/dashboard", "/creer", "/compte"]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Ne jamais faire confiance à getSession() ici : getUser() revalide le JWT
  // auprès de Supabase. C'est aussi ce qui rafraîchit le token expiré.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  if (!user && PROTECTED.some(p => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth"
    url.searchParams.set("next", path + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return response
}
