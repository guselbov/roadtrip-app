import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthForm } from "./AuthForm"
import { C, container, page } from "@/lib/ui"

/** Empêche un lien `?next=https://evil.com` de transformer la page en redirecteur ouvert. */
function safeNext(raw: string | undefined) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/"
  return raw
}

const ERRORS: Record<string, string> = {
  lien_invalide: "Ce lien n'est pas valide. Redemande-en un.",
  lien_expire: "Ce lien a expiré ou a déjà servi. Redemande-en un.",
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; intro?: string; error?: string }>
}) {
  const { next, intro, error } = await searchParams
  const target = safeNext(next)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(target)

  return (
    <main style={{ ...page, display: "flex", alignItems: "center" }}>
      <div style={{ ...container, width: "100%" }}>
        <div style={{ fontSize: "40px", marginBottom: "20px" }}>🌊</div>

        {error && ERRORS[error] && (
          <p style={{ background: C.card, border: `1px solid ${C.warn}`, color: C.warn, borderRadius: "12px", padding: "12px 14px", fontSize: "13px", marginBottom: "18px" }}>
            {ERRORS[error]}
          </p>
        )}

        <AuthForm next={target} intro={intro} />

        <p style={{ color: C.dim, fontSize: "12px", marginTop: "28px", lineHeight: 1.5 }}>
          En continuant, tu acceptes qu&apos;on stocke ton email et ton prénom pour te
          rattacher à tes trips. Rien d&apos;autre, rien de partagé.
        </p>
      </div>
    </main>
  )
}
